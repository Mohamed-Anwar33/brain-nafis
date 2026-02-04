import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ExamQuestion } from "@/components/exam/ExamQuestion";
import { AttemptData, ExamQuestion as ExamQuestionType } from "@/types/exam";
import { supabase } from "@/integrations/supabase/client";
import { audioManager } from "@/lib/audio";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  // Intro State
  const [showIntro, setShowIntro] = useState(true);

  const [examData, setExamData] = useState<AttemptData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [penalties, setPenalties] = useState(0);

  // Refs for synchronous access inside timeouts/callbacks
  const scoreRef = useRef(0);
  const penaltiesRef = useRef(0);
  const questionPenaltiesRef = useRef<Record<string, number>>({});

  // Load exam data from sessionStorage
  useEffect(() => {
    const loadExam = async () => {
      if (!attemptId) {
        navigate("/");
        return;
      }

      // Preload audio
      await audioManager.preload();

      // Try to get from sessionStorage first (for instant loading)
      const cached = sessionStorage.getItem(`exam_${attemptId}`);
      if (cached) {
        try {
          const data = JSON.parse(cached) as AttemptData;
          setExamData(data);
          setScore(data.score);
          scoreRef.current = data.score; // Sync ref
          setIsLoading(false);
          return;
        } catch (e) {
          console.error("Error parsing cached exam:", e);
          sessionStorage.removeItem(`exam_${attemptId}`);
        }
      }

      // If not in cache, fetch from server (exam-start function)
      try {
        const { data, error } = await supabase.functions.invoke("exam-start", {
          body: { attempt_id: attemptId }
        });

        if (error) {
          console.error("Error fetching exam:", error);
          throw error;
        }

        if (data) {
          const attemptData = data as AttemptData;
          sessionStorage.setItem(`exam_${attemptId}`, JSON.stringify(attemptData));
          setExamData(attemptData);
          setScore(attemptData.score);
          scoreRef.current = attemptData.score; // Sync ref
        } else {
          throw new Error("No data returned from exam-start");
        }
      } catch (err) {
        console.error("Failed to load exam:", err);
        toast.error("فشل تحميل الاختبار. يرجى المحاولة مرة أخرى.");
        navigate("/student/dashboard"); // Redirect to dashboard instead of /
      } finally {
        setIsLoading(false);
      }
    };

    loadExam();
  }, [attemptId, navigate]);

  const finishExam = useCallback(async () => {
    if (!attemptId || !examData) return;

    setIsFinishing(true);
    try {
      // Calculate final results locally using Refs for accuracy
      const currentScore = scoreRef.current;
      const currentPenalties = penaltiesRef.current;

      // Deduct penalties from score (1 point per penalty)
      const calculatedScore = currentScore - currentPenalties;
      const finalScore = Math.max(0, calculatedScore);
      const finalPenalty = currentPenalties;

      const resultData = {
        student_name: examData.student_name,
        score: finalScore,
        question_count: examData.question_count,
        total_questions: examData.question_count, // redundancy for safety
        total_penalty: finalPenalty,
        started_at: new Date().toISOString(), // approximate
        finished_at: new Date().toISOString()
      };

      // Update attempt in DB directly
      const { error } = await supabase
        .from("attempts")
        .update({
          score: finalScore,
          total_penalty: finalPenalty
        })
        .eq("id", attemptId);

      if (error) {
        console.error("Error updating attempt:", error);
        // Continue anyway to show results
      }

      // Trigger Email Notification (Non-blocking)
      // We invoke the function but don't await the result to block navigation
      supabase.functions.invoke("exam-finish", {
        body: { attempt_id: attemptId }
      }).then(({ data, error }) => {
        if (error) console.error("Email notification failed:", error);
        else console.log("Email notification status:", data?.email_status);
      });

      // Store result and navigate
      sessionStorage.setItem(`result_${attemptId}`, JSON.stringify(resultData));
      sessionStorage.removeItem(`exam_${attemptId}`);

      navigate(`/result/${attemptId}`);
    } catch (err) {
      console.error("Error finishing exam:", err);
      toast.error("حدث خطأ أثناء إنهاء الاختبار");
      setIsFinishing(false);
    }
  }, [attemptId, navigate, examData]); // Removed score dependencies to rely on refs

  const nextQuestion = useCallback(() => {
    if (examData && currentIndex < examData.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishExam(); // refs will ensure correct score is used
    }
  }, [examData, currentIndex, finishExam]);

  const handleAnswer = useCallback(async (choiceId: string): Promise<boolean> => {
    if (!examData || !attemptId || isSubmitting) return false;

    const currentQuestion = examData.questions[currentIndex];
    const selectedChoice = currentQuestion.choices.find(c => c.id === choiceId);

    // Logic: we trust local is_correct from the client-side fetch in Dashboard
    const isCorrect = selectedChoice?.is_correct === true;

    setIsSubmitting(true);

    if (isCorrect) {
      audioManager.playCorrect();

      // Update score locally and in Ref
      setScore(prev => prev + 1);
      scoreRef.current += 1;

      setCompletedQuestions(prev => new Set(prev).add(currentQuestion.id));

      // Save answer to database (Critical for exam-finish validation)
      const wrongCount = questionPenaltiesRef.current[currentQuestion.id] || 0;
      await supabase.from("attempt_answers").insert({
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        choice_id: choiceId,
        is_correct: true,
        wrong_count: wrongCount
      });

    } else {
      audioManager.playWrong();

      setPenalties(prev => prev + 1);
      penaltiesRef.current += 1;

      // Track per-question penalties
      questionPenaltiesRef.current[currentQuestion.id] = (questionPenaltiesRef.current[currentQuestion.id] || 0) + 1;
    }

    // Delay to show animation/sound
    setTimeout(() => {
      if (isCorrect) {
        nextQuestion();
      }
      setIsSubmitting(false);
    }, 1000);

    return isCorrect;

  }, [examData, attemptId, currentIndex, isSubmitting, nextQuestion]);

  if (isLoading || !examData || isFinishing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isFinishing ? "جاري احتساب النتيجة..." : "جاري تحميل الاختبار..."}
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentIndex];

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/50 relative">

          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-purple-500 to-indigo-600"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>

          <div className="p-8 md:p-12 relative z-10  text-center space-y-8">

            {/* Logo & Header */}
            <div className="space-y-4">
              <div className="w-48 h-48 mx-auto flex items-center justify-center mb-2 animate-in zoom-in duration-700">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain hover:scale-105 transition-transform duration-500 mix-blend-multiply" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                المتوسطة الرابعة والعشرون جدة
              </h1>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

            {/* School Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="group p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-400 mb-1">معلمة مادة العلوم</p>
                    <h3 className="text-xl font-bold text-gray-800">أ/ هيفاء شجيع السلمي</h3>
                  </div>
                </div>
              </div>

              <div className="group p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-400 mb-1">قائدة المدرسة</p>
                    <h3 className="text-xl font-bold text-gray-800">أ/ تهاني السفياني</h3>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-8 animate-bounce-in">
              <button
                onClick={() => {
                  audioManager.playClick();
                  setShowIntro(false);
                }}
                className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-primary to-indigo-600 text-white text-xl font-bold rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 mx-auto"
              >
                <span>ابدأ التحدي الآن</span>
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <ExamQuestion
      question={currentQuestion}
      currentIndex={currentIndex}
      totalQuestions={examData.questions.length}
      onAnswer={handleAnswer}
      disabled={isSubmitting}
    />
  );
}
