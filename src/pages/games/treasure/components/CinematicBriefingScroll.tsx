import { useState } from "react";
import { Anchor, ArrowLeft, BookOpen, Compass, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import { TreasureAdventureMap } from "./TreasureAdventureMap";

interface CinematicBriefingScrollProps {
  adventureTitle?: string;
  storyClue?: string;
  challengeCount?: number;
  trackType?: string;
  studentName?: string;
  isMuted?: boolean;
  onStartExploration: () => void;
  onExit: () => void;
}

export function CinematicBriefingScroll({
  adventureTitle,
  storyClue,
  challengeCount = 12,
  trackType,
  studentName,
  isMuted = false,
  onStartExploration,
  onExit,
}: CinematicBriefingScrollProps) {
  const [isLaunching, setIsLaunching] = useState(false);

  const startAdventure = () => {
    if (isLaunching) return;
    setIsLaunching(true);
    if (!isMuted) audioManager.playPowerUp();
    treasureHalalAudio.playStoneGateRumble();
    confetti({ particleCount: 45, spread: 72, origin: { y: 0.72 }, colors: ["#fde68a", "#38bdf8", "#34d399"] });
    window.setTimeout(onStartExploration, 450);
  };

  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-slate-950 text-white" dir="rtl">
      <div className="relative mx-auto flex min-h-full w-full max-w-[1500px] flex-col items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(14,116,144,.3),transparent_60%),linear-gradient(180deg,#071523,#0b1724_45%,#08121e)]" />

        <header className="flex w-full max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> رجوع
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black tracking-wide text-sky-200 sm:text-xs">
              <Compass className="h-4 w-4" /> مغامرة استكشاف
            </div>
            <h1 className="mt-0.5 truncate text-base font-black text-white drop-shadow sm:text-xl md:text-2xl">{adventureTitle || "مغامرة جزيرة الكنز"}</h1>
          </div>
          <div className="hidden min-w-24 shrink-0 text-left sm:block">
            <div className="text-[10px] font-bold text-white/50">المستكشف</div>
            <div className="truncate text-xs font-black text-amber-100">{studentName || "مستكشف جديد"}</div>
            {trackType && <div className="text-[9px] text-white/50">{trackType === "central" ? "المسار المركزي" : "نافس"}</div>}
          </div>
        </header>

        <section className="w-full max-w-6xl">
          <TreasureAdventureMap challengeCount={challengeCount} currentStage={1} completedStages={0} />
        </section>

        <section className="flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-white/15 bg-slate-900/75 p-3 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-100/20 bg-amber-300/10 text-amber-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-amber-100 sm:text-sm">رسالة الرحلة</div>
              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-5 text-white/75 sm:text-xs">
                {storyClue || "اعبري الجزيرة، أجيبي عن تحديات كل مستوى، واتبعي الطريق حتى صندوق الكنز."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-xl border border-sky-200/20 bg-sky-300/10 px-3 py-2 text-[10px] font-bold text-sky-100 md:flex">
              <Anchor className="h-3.5 w-3.5" /> ابدئي من الميناء
            </div>
            <button
              type="button"
              onClick={startAdventure}
              disabled={isLaunching}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-amber-100/40 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 px-5 py-3 text-sm font-black text-amber-950 shadow-[0_5px_0_#713f12,0_10px_26px_rgba(245,158,11,.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-75 sm:w-auto sm:min-w-52"
            >
              {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4 transition-transform group-hover:rotate-45" />}
              {isLaunching ? "جاري تجهيز الرحلة" : "ابدئي مغامرة الكنز"}
              {!isLaunching && <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
