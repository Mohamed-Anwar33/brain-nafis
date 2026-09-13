import React, { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles, Key, HelpCircle, PlayCircle } from "lucide-react";
import { ClientChallengeItem } from "@/types/treasure";
import { audioManager } from "@/lib/audio";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import { ExplanationModal } from "@/components/exam/ExplanationModal";
import { Card } from "@/components/ui/card";

interface Challenge1MCQProps {
  challenge: ClientChallengeItem;
  onSubmitAnswer: (answerPayload: { selected_choice_id: string }) => Promise<any>;
  isSubmitting: boolean;
}

const LETTERS = ["أ", "ب", "ج", "د"];

export function Challenge1MCQ({
  challenge,
  onSubmitAnswer,
  isSubmitting,
}: Challenge1MCQProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [wrongChoiceIds, setWrongChoiceIds] = useState<string[]>([]);
  const [correctChoiceId, setCorrectChoiceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeExplanation, setActiveExplanation] = useState<{
    wrong_reason?: string | null;
    explanation_url?: string | null;
  } | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const choices = challenge.content?.choices || [];

  const handleChoiceClick = async (choiceId: string) => {
    // Block if currently checking, already solved, or if this choice is already known to be wrong
    if (isSubmitting || isChecking || correctChoiceId !== null || wrongChoiceIds.includes(choiceId)) {
      return;
    }

    setSelectedChoiceId(choiceId);
    setIsChecking(true);
    setErrorMessage(null);

    try {
      treasureHalalAudio.playCrystalPulse();
      audioManager.playClick();
    } catch (e) {}

    try {
      const res = await onSubmitAnswer({ selected_choice_id: choiceId });

      if (res?.is_correct) {
        setCorrectChoiceId(choiceId);
        setIsChecking(false);
      } else {
        // Wrong answer: unfreeze immediately, record wrong choice, capture explanation, and let student pick another option!
        if (res?.explanation) {
          setActiveExplanation(res.explanation);
        }
        setWrongChoiceIds((prev) => (prev.includes(choiceId) ? prev : [...prev, choiceId]));
        setSelectedChoiceId(null);
        setIsChecking(false);
        setErrorMessage("إجابة غير صحيحة، راجع الشرح وحاول مجددًا! ❌");
      }
    } catch (err: any) {
      console.warn("Error during choice submission:", err);
      setSelectedChoiceId(null);
      setIsChecking(false);
      setErrorMessage(err?.message || "حدث خطأ أثناء التحقق من الإجابة، يرجى المحاولة مجددًا");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto select-none animate-in fade-in zoom-in-95 duration-300">
      {/* 1. Main Question Card - Exact Central Exam Standard */}
      <Card className="bg-white/95 backdrop-blur-md border-2 border-amber-500/30 shadow-xl shadow-amber-900/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center relative overflow-hidden">
        {/* Subtle Decorative Accents */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
        
        {/* Question Header Badge */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white px-4 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-200" />
            <span>القفل الأثري: سؤال {challenge.step} من 3</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          </div>
        </div>

        {/* Question Image (if present) */}
        {challenge.image_url && (
          <div className="mb-4 flex justify-center">
            <div className="max-h-56 sm:max-h-64 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-50 p-2 relative">
              <img
                src={challenge.image_url}
                alt="Question Visual"
                className="max-h-52 sm:max-h-60 w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 leading-relaxed drop-shadow-xs">
          {challenge.prompt}
        </h2>
      </Card>

      {/* Dynamic Error / Wrong Answer Alert Banner */}
      {errorMessage && (
        <div className="bg-red-50/95 border-2 border-red-300 text-red-800 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Choices Grid - 2x2 Grid Matching Central Exam & Platform */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {choices.map((choice, index) => {
          const letter = LETTERS[index] || `${index + 1}`;
          const isCorrect = correctChoiceId === choice.id;
          const isWrong = wrongChoiceIds.includes(choice.id);
          const isSelected = selectedChoiceId === choice.id;
          const isLoading = isSelected && (isChecking || isSubmitting);

          let cardClasses =
            "bg-white/95 backdrop-blur border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-lg hover:-translate-y-0.5 text-slate-800 cursor-pointer";
          let badgeClasses = "bg-amber-100 text-amber-900 border border-amber-300";

          if (isCorrect) {
            cardClasses =
              "bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-[1.02] ring-2 ring-emerald-300 cursor-default";
            badgeClasses = "bg-white/20 text-white border-white/40";
          } else if (isWrong) {
            cardClasses =
              "bg-red-50 border-red-300 text-red-700 opacity-80 cursor-not-allowed";
            badgeClasses = "bg-red-100 text-red-700 border-red-300";
          } else if (isLoading) {
            cardClasses =
              "bg-amber-500 border-amber-600 text-white shadow-xl shadow-amber-500/30 scale-[1.02] cursor-wait";
            badgeClasses = "bg-white/20 text-white border-white/40";
          }

          return (
            <div
              key={choice.id}
              onClick={() => handleChoiceClick(choice.id)}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 flex items-center gap-3.5 relative overflow-hidden shadow-sm select-none ${cardClasses} ${
                (isChecking || isSubmitting) && !isSelected ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {/* Letter Badge [أ] [ب] [ج] [د] OR Status Icon */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 transition-all ${badgeClasses}`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : isWrong ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  letter
                )}
              </div>

              {/* Choice Content */}
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className={`text-sm sm:text-base font-bold leading-snug ${isWrong ? "line-through text-red-600/80" : ""}`}>
                  {choice.text}
                </span>

                {isWrong && (
                  <span className="text-[11px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-lg shrink-0 border border-red-200">
                    غير صحيحة ❌
                  </span>
                )}

                {isCorrect && (
                  <span className="text-[11px] font-black text-emerald-950 bg-emerald-200 px-2 py-0.5 rounded-lg shrink-0 border border-emerald-300">
                    إجابة صحيحة 🎉
                  </span>
                )}

                {choice.image_url && (
                  <img
                    src={choice.image_url}
                    alt={choice.text}
                    className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Explanation Modal Trigger if Available */}
      {(challenge.wrong_reason || challenge.explanation_url || activeExplanation?.wrong_reason || activeExplanation?.explanation_url) && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setShowExplanationModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 text-amber-900 border-2 border-amber-400/80 font-black text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer animate-pulse"
          >
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>تلميح وشرح المستكشف التربوي (اضغط للمشاهدة 💡)</span>
            {(challenge.explanation_url || activeExplanation?.explanation_url) && (
              <PlayCircle className="w-4 h-4 text-amber-600 mr-1" />
            )}
          </button>
        </div>
      )}

      {/* Standard Platform Explanation Modal */}
      <ExplanationModal
        isOpen={showExplanationModal}
        onClose={() => setShowExplanationModal(false)}
        questionText={challenge.prompt}
        wrongReason={activeExplanation?.wrong_reason || challenge.wrong_reason || undefined}
        explanationUrl={activeExplanation?.explanation_url || challenge.explanation_url || undefined}
      />
    </div>
  );
}
