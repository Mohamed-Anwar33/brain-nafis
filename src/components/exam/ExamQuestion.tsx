import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ExamQuestion as ExamQuestionType, Choice } from "@/types/exam";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ExamQuestionProps {
  question: ExamQuestionType;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (choiceId: string) => Promise<boolean>;
  disabled: boolean;
}

export function ExamQuestion({
  question,
  currentIndex,
  totalQuestions,
  onAnswer,
  disabled,
}: ExamQuestionProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<"correct" | "wrong" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);

  // Reset state when question changes
  useEffect(() => {
    setSelectedChoice(null);
    setAnswerState(null);
    setPendingChoice(null);
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
        // Reset for retry after brief delay
        setTimeout(() => {
          setSelectedChoice(null);
          setAnswerState(null);
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
        </div>
      </div>
    </div>
  );
}
