import React, { useRef, useState, useCallback } from "react";
import { Sparkles, ArrowLeft, Zap, Trophy, Award, Play, Shield } from "lucide-react";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import confetti from "canvas-confetti";
import { TreasureAdventureMap } from "./TreasureAdventureMap";
import { TREASURE_STAGE_COUNT } from "../data/defaultTreasureStages";

export interface StageTransitionData {
  fromStage: number; // 1, 2, or 3
  toStage: number; // 2, 3, or 4 (4 = Treasure Chest)
  newScore: number;
  challengeCount?: number;
}

interface TreasureStageTransition3DProps {
  transitionData: StageTransitionData;
  onComplete: () => void;
}

interface TransitionThemeConfig {
  badge: string;
  title: string;
  subtitle: string;
  fromName: string;
  toName: string;
  colorPalette: {
    fog: number;
    ambient: number;
    lightPrimary: number;
    lightSecondary: number;
    particlePrimary: number;
    particleSecondary: number;
    ringColor: number;
  };
  warpType: "wind" | "ocean" | "flame" | "celestial";
  accentGradient: string;
}

export const TRANSITION_CONFIGS: Record<number, TransitionThemeConfig> = {
  // 1 -> 2: Wind Portal to Ocean Depths
  2: {
    badge: "اكتمل المستوى الأول",
    title: "انفتح الطريق إلى أطلال الغابة",
    subtitle: "اجتزت أختام المرحلة الأولى. تابع عبر المسار إلى محطة الأطلال.",
    fromName: "ميناء البداية",
    toName: "أطلال الغابة",
    colorPalette: {
      fog: 0x042f2e,
      ambient: 0x115e59,
      lightPrimary: 0x06b6d4,
      lightSecondary: 0x10b981,
      particlePrimary: 0x22d3ee,
      particleSecondary: 0x34d399,
      ringColor: 0x5eead4,
    },
    warpType: "wind",
    accentGradient: "from-teal-400 via-cyan-400 to-emerald-500",
  },
  // 2 -> 3: Forest Ruins to Volcano Cave
  3: {
    badge: "اكتمل المستوى الثاني",
    title: "وصلت إلى كهف البركان",
    subtitle: "اكتملت محطة الأطلال. أنهي تحديات الكهف الأخيرة للوصول إلى الصندوق.",
    fromName: "أطلال الغابة",
    toName: "كهف البركان",
    colorPalette: {
      fog: 0x1e1b4b,
      ambient: 0x312e81,
      lightPrimary: 0x8b5cf6,
      lightSecondary: 0x3b82f6,
      particlePrimary: 0xa78bfa,
      particleSecondary: 0x60a5fa,
      ringColor: 0xc084fc,
    },
    warpType: "ocean",
    accentGradient: "from-indigo-400 via-purple-400 to-sky-500",
  },
  // 3 -> treasure chest
  4: {
    badge: "اكتمل المستوى الثالث",
    title: "وصلت إلى صندوق الكنز!",
    subtitle: "أتممت تحديات المراحل الثلاث. افتح الصندوق لتحصل على درجة إضافية في المادة.",
    fromName: "كهف البركان",
    toName: "صندوق الكنز",
    colorPalette: {
      fog: 0x1c1917,
      ambient: 0x44403c,
      lightPrimary: 0xfacc15,
      lightSecondary: 0xe11d48,
      particlePrimary: 0xfef08a,
      particleSecondary: 0xf43f5e,
      ringColor: 0xffedd5,
    },
    warpType: "celestial",
    accentGradient: "from-yellow-300 via-amber-400 to-rose-500",
  },
};

export function TreasureStageTransition3D({
  transitionData,
  onComplete,
}: TreasureStageTransition3DProps) {
  const config = TRANSITION_CONFIGS[transitionData.toStage] || TRANSITION_CONFIGS[2];
  const hasFinishedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    try {
      treasureHalalAudio.playStoneGateRumble();
      treasureHalalAudio.playCrystalPulse();
    } catch (e) {}

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ["#fbbf24", "#f59e0b", "#10b981", "#38bdf8", "#ffffff"],
    });

    onComplete();
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-slate-950 text-foreground flex flex-col justify-between select-none animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Lightweight island-night backdrop */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(20,92,90,.65),transparent_48%),linear-gradient(145deg,#061b23,#102e34_52%,#201d13)]" />

      {/* 2. Soft Ambient Cinematic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55 pointer-events-none z-10" />

      {/* 3. Top Status HUD Bar */}
      <div className="relative z-20 p-4 sm:p-6 w-full max-w-5xl mx-auto flex items-center justify-between">
        {/* Left: Interactive Badge */}
        <div className="flex items-center gap-2">
          <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border-2 border-white/20 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{config.badge}</span>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-amber-200/30 text-amber-100 font-bold text-xs flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>نتيجة المغامرة: {transitionData.newScore} / 100</span>
          </div>
        </div>

        <div className="rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs font-bold text-white/75">تابع المغامرة خطوة بخطوة</div>
      </div>

      {/* 4. Center Cinematic Stage Presentation Card */}
      <div className="relative z-20 mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 p-3 text-center pointer-events-auto">
        {/* Stage Leap Indicator */}
        <div className="inline-flex items-center gap-2 px-5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 via-yellow-400/30 to-amber-500/20 border-2 border-amber-400/60 backdrop-blur-md text-amber-200 font-black text-xs sm:text-sm shadow-2xl animate-pulse">
          <span>{config.fromName}</span>
          <span className="text-amber-400 font-extrabold text-base">➔</span>
          <span className="text-white font-black">{config.toName}</span>
        </div>

        {/* Big Epic Title */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans leading-tight">
          {config.title}
        </h2>

        {/* Subtitle Description */}
        <p className="text-xs sm:text-sm md:text-base text-amber-100/90 max-w-lg mx-auto font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {config.subtitle}
        </p>

        <div className="w-full max-w-2xl rounded-2xl border border-white/25 bg-slate-950/70 p-2 shadow-[0_24px_70px_rgba(0,0,0,.45)] backdrop-blur-md">
          <TreasureAdventureMap
            challengeCount={transitionData.challengeCount}
            currentStage={Math.min(TREASURE_STAGE_COUNT, transitionData.toStage)}
            completedStages={transitionData.fromStage}
            movingFromStage={transitionData.fromStage}
            compact
            showTreasure={transitionData.toStage === TREASURE_STAGE_COUNT + 1}
          />
        </div>

        {/* 3D Warp Speed Meter */}
        <div className="pt-2 flex items-center gap-2 text-[11px] sm:text-xs font-mono font-black text-amber-300/80">
          <Zap className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />
          <span>يتحرك المستكشف إلى المرحلة التالية</span>
        </div>
      </div>

      {/* 5. Bottom Interactive Launchpad & Progress Gauge */}
      <div className="relative z-20 p-4 sm:p-8 w-full max-w-xl mx-auto flex flex-col items-center space-y-3">
        {/* Progress Bar with Glow */}
        <div className="w-full bg-black/50 backdrop-blur-md rounded-full h-3 border-2 border-white/20 p-0.5 overflow-hidden shadow-2xl">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.accentGradient} transition-all duration-150 shadow-[0_0_16px_rgba(245,158,11,0.8)]`}
            style={{ width: `${Math.min(100, ((transitionData.toStage - 1) / TREASURE_STAGE_COUNT) * 100)}%` }}
          />
        </div>

        {/* Bottom CTA Button */}
        <button
          type="button"
          onClick={handleFinish}
          className={`pointer-events-auto py-3.5 sm:py-4 px-8 sm:px-12 rounded-full border-2 border-white/40 bg-gradient-to-r ${config.accentGradient} text-stone-950 font-black text-sm sm:text-base shadow-[0_8px_25px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group`}
        >
          <span>{transitionData.toStage <= TREASURE_STAGE_COUNT ? `ابدأ ${config.toName}` : "افتح صندوق الكنز"}</span>
          <ArrowLeft className="w-5 h-5 text-stone-950 group-hover:-translate-x-1 transition-transform" />
        </button>

        <span className="text-[11px] text-white/60 font-bold">أكمل الرحلة بالضغط على متابعة</span>
      </div>
    </div>
  );
}
