import { useState, useEffect, useCallback } from "react";
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
        const data = JSON.parse(cached) as AttemptData;
        setExamData(data);
        setScore(data.score);
        setIsLoading(false);
        return;
      }

      // If not in cache, redirect to start
      toast.error("جلسة الاختبار غير موجودة");
      navigate("/");
    };

    loadExam();
  }, [attemptId, navigate]);

  const finishExam = useCallback(async () => {
    if (!attemptId) return;

    setIsFinishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("exam-finish", {
        body: { attempt_id: attemptId },
      });

      if (error) throw error;

      // Store result and navigate
      sessionStorage.setItem(`result_${attemptId}`, JSON.stringify(data));
      sessionStorage.removeItem(`exam_${attemptId}`);

      navigate(`/result/${attemptId}`);
    } catch (err) {
      console.error("Error finishing exam:", err);
      toast.error("حدث خطأ أثناء إنهاء الاختبار");
      setIsFinishing(false);
    }
  }, [attemptId, navigate]);

  const nextQuestion = useCallback(() => {
    if (examData && currentIndex < examData.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishExam();
    }
  }, [examData, currentIndex, finishExam]);

  const handleAnswer = useCallback(async (choiceId: string): Promise<boolean> => {
    if (!examData || !attemptId || isSubmitting) return false;

    const currentQuestion = examData.questions[currentIndex];
    const selectedChoice = currentQuestion.choices.find(c => c.id === choiceId);

    // Determine correctness locally if possible for instant feedback
    const isCorrectLocal = selectedChoice?.is_correct;

    setIsSubmitting(true);

    // Optimistic UI Update
    if (typeof isCorrectLocal === 'boolean') {
      if (isCorrectLocal) {
        audioManager.playCorrect();
        setCompletedQuestions(prev => new Set(prev).add(currentQuestion.id));
      } else {
        audioManager.playWrong();
      }
    }

    // Fire and forget server update
    const serverUpdatePromise = supabase.functions.invoke("exam-answer", {
      body: {
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        selected_choice_id: choiceId,
      },
    }).then(({ data, error }) => {
      if (error) {
        console.error("Server answer error:", error);
        return;
      }
      if (data) {
        setScore(data.score); // Sync exact score from server
      }
    });

    // If this is the last question, we MUST wait for the server update
    // before moving on to finishExam to ensure the DB is consistent.
    if (currentIndex === examData.questions.length - 1) {
      await serverUpdatePromise;
    }

    // If we didn't have local correctness, we HAVE to wait.
    if (typeof isCorrectLocal !== 'boolean') {
      try {
        const { data, error } = await supabase.functions.invoke("exam-answer", {
          body: {
            attempt_id: attemptId,
            question_id: currentQuestion.id,
            selected_choice_id: choiceId,
          },
        });

        if (error) throw error;

        if (data.correct) {
          audioManager.playCorrect();
          setScore(data.score);
          setCompletedQuestions(prev => new Set(prev).add(currentQuestion.id));
          setTimeout(() => nextQuestion(), 400);
          return true;
        } else {
          audioManager.playWrong();
          setScore(data.score);
          return false;
        }
      } catch (err) {
        console.error("Error submitting answer:", err);
        toast.error("حدث خطأ أثناء إرسال الإجابة");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    }

    // If we DID handle it locally:
    // Wait for the delay then move next ONLY if correct
    setTimeout(() => {
      if (isCorrectLocal) {
        nextQuestion();
      }
      setIsSubmitting(false); // Re-enable input after transition/action
    }, 400);

    return isCorrectLocal as boolean;

  }, [examData, attemptId, currentIndex, isSubmitting, finishExam, nextQuestion]);

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
