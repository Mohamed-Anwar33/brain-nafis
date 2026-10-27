import React, { useEffect, useState } from "react";
import { ArrowLeft, Check, Compass, Key, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { treasureHalalAudio } from "@/lib/treasureAudio";

interface LockUnlockOverlayProps {
  unlockedStep: number;
  currentStage: number;
  questionInStage: number;
  questionsInStage: number;
  pointsEarned?: number;
  onAdvance: () => void;
}

export function LockUnlockOverlay({
  unlockedStep,
  currentStage,
  questionInStage,
  questionsInStage,
  pointsEarned = 0,
  onAdvance,
}: LockUnlockOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const nextQuestion = Math.min(questionInStage + 1, questionsInStage);

  useEffect(() => {
    try {
      treasureHalalAudio.playKeyFound();
    } catch (e) {}

    const openTimer = window.setTimeout(() => {
      setIsOpen(true);
      try {
        treasureHalalAudio.playStoneGateRumble();
        treasureHalalAudio.playCrystalPulse();
      } catch (e) {}

      try {
        confetti({
          particleCount: 36,
          spread: 54,
          origin: { y: 0.46 },
          colors: ["#fbbf24", "#10b981", "#38bdf8"],
        });
      } catch (e) {}
    }, 250);

    return () => window.clearTimeout(openTimer);
  }, [unlockedStep]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-300"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-sky-100/20 bg-gradient-to-br from-[#102c3e]/98 via-[#0b1c2b]/98 to-[#182a32]/98 p-5 text-center shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black text-amber-100 sm:text-xs">
            <Compass className="h-3.5 w-3.5 text-amber-300" />
            المرحلة {currentStage} · نقطة الطريق {questionInStage} من {questionsInStage}
          </span>
          {pointsEarned > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black text-emerald-100 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> +{pointsEarned}
            </span>
          )}
        </div>

        <div className={`relative mx-auto my-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-amber-100/35 bg-gradient-to-br from-amber-300/25 via-amber-500/15 to-sky-400/15 shadow-[0_0_45px_rgba(251,191,36,.16)] transition-all duration-500 ${isOpen ? "rotate-[-8deg] scale-105" : "scale-95"}`}>
          <div className="absolute inset-2 rounded-[1.45rem] border border-white/10" />
          {isOpen ? <Key className="h-11 w-11 text-amber-200 drop-shadow-[0_0_16px_rgba(251,191,36,.55)]" /> : <Key className="h-11 w-11 text-amber-200" />}
          {isOpen && <span className="absolute -left-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#102c3e] bg-emerald-400 text-slate-950 shadow-lg"><Check className="h-4 w-4" /></span>}
        </div>

        <div className="relative space-y-2">
          <h3 className="text-2xl font-black text-white sm:text-3xl">انفتح الطريق!</h3>
          <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-sky-100/75 sm:text-base">
            اجتزت اللغز {questionInStage}، وتحركت السفينة إلى نقطة جديدة. بقي {Math.max(0, questionsInStage - questionInStage)} من ألغاز هذه المرحلة قبل فتح المحطة التالية.
          </p>
        </div>

        <div className="relative mx-auto mt-6 flex max-w-sm items-center justify-center gap-2" aria-label={`تقدم المرحلة: ${questionInStage} من ${questionsInStage}`}>
          {Array.from({ length: questionsInStage }, (_, index) => {
            const complete = index < questionInStage;
            const next = index === questionInStage;
            return (
              <React.Fragment key={index}>
                {index > 0 && <div className={`h-0.5 min-w-4 flex-1 rounded-full ${complete ? "bg-emerald-300/80" : "bg-white/15"}`} />}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${complete ? "border-emerald-200 bg-emerald-400 text-slate-950" : next ? "border-amber-100 bg-amber-300 text-slate-950" : "border-white/20 bg-white/5 text-white/40"}`}>
                  {complete ? <Check className="h-4 w-4" /> : index + 1}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="relative mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-amber-100/40 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 px-6 py-3.5 text-sm font-black text-amber-950 shadow-[0_6px_0_#713f12,0_15px_34px_rgba(245,158,11,.2)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-1 active:shadow-none sm:text-base"
        >
          <span>تابع إلى اللغز {nextQuestion}</span>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="relative mt-3 text-[10px] font-bold text-white/55">إجابة صحيحة! تابع إلى اللغز التالي</p>
      </div>
    </div>
  );
}
