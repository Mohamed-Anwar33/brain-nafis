import React, { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles, Key, Zap, HelpCircle, PlayCircle, Image as ImageIcon } from "lucide-react";
import { ClientChallengeItem } from "@/types/treasure";
import { audioManager } from "@/lib/audio";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import { ExplanationModal } from "@/components/exam/ExplanationModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Challenge1MCQProps {
  challenge: ClientChallengeItem;
  onSubmitAnswer: (answerPayload: { selected_choice_id: string }) => Promise<void>;
  isSubmitting: boolean;
}

const LETTERS = ["أ", "ب", "ج", "د"];

export function Challenge1MCQ({
  challenge,
  onSubmitAnswer,
  isSubmitting,
}: Challenge1MCQProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<"idle" | "submitting" | "correct" | "wrong">("idle");
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const choices = challenge.content?.choices || [];

  const handleChoiceClick = async (choiceId: string) => {
    if (isSubmitting || answerStatus === "submitting" || answerStatus === "correct") return;

    setSelectedChoiceId(choiceId);
    setAnswerStatus("submitting");

    try {
      treasureHalalAudio.playCrystalPulse();
      audioManager.playClick();
    } catch (e) {}

    try {
      await onSubmitAnswer({ selected_choice_id: choiceId });
      // The parent component handles the correct unlock overlay or error toast
    } catch (err) {
      setAnswerStatus("wrong");
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

      {/* 2. Choices Grid - 2x2 Grid Matching Central Exam & Platform */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {choices.map((choice, index) => {
          const isSelected = selectedChoiceId === choice.id;
          const letter = LETTERS[index] || `${index + 1}`;

          let cardClasses =
            "bg-white/95 backdrop-blur border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-lg hover:-translate-y-0.5 text-slate-800";
          let badgeClasses = "bg-amber-100 text-amber-900 border border-amber-300";

          if (isSelected) {
            if (answerStatus === "submitting" || isSubmitting) {
              cardClasses =
                "bg-amber-500 border-amber-600 text-white shadow-xl shadow-amber-500/30 scale-[1.02]";
              badgeClasses = "bg-white/20 text-white border-white/40";
            }
          }

          return (
            <div
              key={choice.id}
              onClick={() => handleChoiceClick(choice.id)}
              className={`p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3.5 relative overflow-hidden shadow-sm select-none ${cardClasses} ${
                isSubmitting ? "pointer-events-none opacity-80" : ""
              }`}
            >
              {/* Letter Badge [أ] [ب] [ج] [د] */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 transition-all ${badgeClasses}`}
              >
                {isSelected && (isSubmitting || answerStatus === "submitting") ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  letter
                )}
              </div>

              {/* Choice Content */}
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className="text-sm sm:text-base font-bold leading-snug">
                  {choice.text}
                </span>

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
      {challenge.wrong_reason && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setShowExplanationModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>تلميح وتوجيه المستكشف التربوي</span>
            {challenge.explanation_url && (
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
        wrongReason={challenge.wrong_reason || undefined}
        explanationUrl={challenge.explanation_url || undefined}
      />
    </div>
  );
}
