import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ExamQuestion as ExamQuestionType, Choice } from "@/types/exam";
import { CheckCircle2, XCircle, Loader2, PlayCircle, HelpCircle } from "lucide-react";
import { ExplanationModal } from "@/components/exam/ExplanationModal";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { FloatingXp } from "@/components/gamification/FloatingXp";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { audioManager } from "@/lib/audio";

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

  // Gamification States
  const [streak, setStreak] = useState(0);
  const [xpGain, setXpGain] = useState(0);
  const [xpTrigger, setXpTrigger] = useState(0);

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
    audioManager.playOptionClick();

    try {
      const isCorrect = await onAnswer(choice.id);
      setPendingChoice(null);
      setAnswerState(isCorrect ? "correct" : "wrong");

      if (isCorrect) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        const gainedXp = 100 + (nextStreak >= 5 ? 150 : nextStreak >= 3 ? 50 : 0);
        setXpGain(gainedXp);
        setXpTrigger((prev) => prev + 1);

        if (nextStreak >= 3) {
          audioManager.playStreak(nextStreak);
        } else {
          audioManager.playCorrect(nextStreak);
        }
      } else {
        setStreak(0);
        audioManager.playWrong();

        // Keep feedback visible, clear selected choice to allow retry
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
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Floating XP Burst */}
      <FloatingXp amount={xpGain} triggerKey={xpTrigger} isCombo={streak >= 2} />

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-sm">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                السؤال {currentIndex + 1} من {totalQuestions}
              </span>
              <StreakCounter streak={streak} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                {Math.round(progress)}%
              </span>
              <SoundToggle />
            </div>
          </div>

          {/* Gamified Gradient Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500 transition-all duration-500 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl shadow-slate-200/50 relative overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {question.image_url && (
            <div className="flex justify-center mb-6">
              <img
                src={question.image_url}
                alt="توضيح السؤال"
                className="max-h-64 sm:max-h-72 rounded-2xl shadow-md border border-slate-200/80 object-contain bg-white p-2"
              />
            </div>
          )}

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-relaxed text-center sm:text-right">
            {question.text}
          </h2>
        </div>

        {/* Choices Grid */}
        <div className="space-y-3 sm:space-y-4">
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
                  "w-full text-right p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all duration-200 flex items-center justify-between gap-4 outline-none",
                  isCorrectAnswer
                    ? "border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-lg shadow-emerald-500/20 scale-[1.01]"
                    : isWrongAnswer
                    ? "border-rose-500 bg-rose-50/90 text-rose-950 shadow-lg shadow-rose-500/20 scale-[0.99] animate-shake"
                    : isPending
                    ? "border-indigo-500 bg-indigo-50/90 shadow-md scale-[0.99]"
                    : "border-slate-200/80 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-md active:scale-[0.99]"
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <span
                    className={cn(
                      "flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg transition-colors shadow-sm",
                      isCorrectAnswer
                        ? "bg-emerald-600 text-white"
                        : isWrongAnswer
                        ? "bg-rose-600 text-white"
                        : isPending
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-indigo-100"
                    )}
                  >
                    {String.fromCharCode(1571 + index)}
                  </span>

                  <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    {choice.image_url && (
                      <img
                        src={choice.image_url}
                        alt={`خيار ${index + 1}`}
                        className="h-20 sm:h-24 w-auto rounded-xl object-contain bg-white border border-slate-200 p-1"
                      />
                    )}
                    <span className="text-base sm:text-xl font-bold text-slate-800 leading-snug">
                      {choice.text}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isPending && !answerState && (
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  )}
                  {isCorrectAnswer && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                  )}
                  {isWrongAnswer && (
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 animate-shake">
                      <XCircle className="w-6 h-6 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Wrong Explanation Card */}
        {answerState === "wrong" && (wrongReason || question.explanation_url) && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6 text-right space-y-3 shadow-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm sm:text-base">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>توضيح السؤال والإرشاد العلمي:</span>
              </div>

              {question.explanation_url && (
                <button
                  type="button"
                  onClick={() => setShowExplanationModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-black text-xs sm:text-sm hover:opacity-95 transition-all shadow-md shadow-indigo-500/20"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>🎥 شاهد شرح الفيديو للدرس</span>
                </button>
              )}
            </div>

            {wrongReason && (
              <p className="text-sm sm:text-base leading-relaxed text-amber-950 font-bold pt-2 border-t border-amber-200/70">
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
      </main>
    </div>
  );
}
