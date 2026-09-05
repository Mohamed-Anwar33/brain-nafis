import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ExamQuestion as ExamQuestionType, Choice } from "@/types/exam";
import { CheckCircle2, XCircle, Loader2, PlayCircle, HelpCircle } from "lucide-react";
import { ExplanationModal } from "@/components/exam/ExplanationModal";

interface ExamQuestionProps {
  question: ExamQuestionType;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (choiceId: string) => Promise<boolean>;
  disabled: boolean;
  wrongReason?: string | null;
}

export function ExamQuestion({
  question,
  currentIndex,
  totalQuestions,
  onAnswer,
  disabled,
  wrongReason,
}: ExamQuestionProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<"correct" | "wrong" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedChoice(null);
    setAnswerState(null);
    setPendingChoice(null);
    setShowExplanationModal(false);
  }, [question.id]);

  const handleChoiceClick = async (choice: Choice) => {
    if (disabled || isSubmitting || answerState === "correct") return;

    // Immediate visual feedback
    setPendingChoice(choice.id);
    setSelectedChoice(choice.id);
    setIsSubmitting(true);

    try {
      const isCorrect = await onAnswer(choice.id);
      setPendingChoice(null);
      setAnswerState(isCorrect ? "correct" : "wrong");

      if (!isCorrect) {
        // Keep the feedback visible, but clear the selected choice to allow retry.
        setTimeout(() => {
          setSelectedChoice(null);
        }, 600);
      }
    } catch (err) {
      setPendingChoice(null);
      setSelectedChoice(null);
      setAnswerState(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="container max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              السؤال {currentIndex + 1} من {totalQuestions}
            </span>
            <span className="text-sm font-semibold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="progress-exam">
            <div
              className="progress-exam-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        <div className="animate-slide-in">
          {/* Question Text & Image */}
          <div className="card-elevated p-6 md:p-8 mb-8 text-center space-y-6">
            {question.image_url && (
              <div className="flex justify-center mb-4">
                <img
                  src={question.image_url}
                  alt="Question"
                  className="max-h-64 rounded-xl shadow-sm border border-slate-200 object-contain bg-white"
                />
              </div>
            )}
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-relaxed">
              {question.text}
            </h2>
          </div>

          {/* Choices */}
          <div className="space-y-4">
            {question.choices.map((choice, index) => {
              const isSelected = selectedChoice === choice.id;
              const isPending = pendingChoice === choice.id;
              const isCorrectAnswer = isSelected && answerState === "correct";
              const isWrongAnswer = isSelected && answerState === "wrong";

              return (
                <button
                  key={choice.id}
                  onClick={() => handleChoiceClick(choice)}
                  disabled={disabled || isSubmitting || answerState === "correct"}
                  className={cn(
                    "w-full text-right choice-option transition-all duration-150 p-4",
                    isCorrectAnswer && "choice-correct",
                    isWrongAnswer && "choice-wrong",
                    isPending && !answerState && "border-primary bg-primary/10 scale-[0.99] animate-pulse",
                    !isSelected && !answerState && "hover:border-primary/50 active:scale-[0.99]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors",
                      isPending && !answerState ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}>
                      {String.fromCharCode(1571 + index)}
                    </span>

                    <div className="flex-1 flex flex-col md:flex-row items-center md:items-start gap-3">
                      {choice.image_url && (
                        <img
                          src={choice.image_url}
                          alt={`Choice ${index + 1}`}
                          className="h-24 md:h-20 w-auto rounded-md object-contain bg-white border border-slate-100"
                        />
                      )}
                      <span className="text-lg font-medium self-center md:self-auto pt-1">
                        {choice.text}
                      </span>
                    </div>

                    {isPending && !answerState && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    )}
                    {isCorrectAnswer && (
                      <CheckCircle2 className="w-6 h-6 text-success animate-bounce-in" />
                    )}
                    {isWrongAnswer && (
                      <XCircle className="w-6 h-6 text-destructive animate-bounce-in" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {answerState === "wrong" && (wrongReason || question.explanation_url) && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-right space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                  <span>توضيح الإجابة الصحيحة:</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExplanationModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-xs sm:text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>🎥 شاهد شرح السؤال والدرس</span>
                </button>
              </div>

              {wrongReason && (
                <p className="text-sm leading-relaxed text-amber-950 font-medium pt-1 border-t border-amber-200/60">
                  {wrongReason}
                </p>
              )}
            </div>
          )}

          <ExplanationModal
            isOpen={showExplanationModal}
            onClose={() => setShowExplanationModal(false)}
            questionText={question.text}
            wrongReason={wrongReason || question.wrong_reason}
            explanationUrl={question.explanation_url}
          />
        </div>
      </div>
    </div>
  );
}
