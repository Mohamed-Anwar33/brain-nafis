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
