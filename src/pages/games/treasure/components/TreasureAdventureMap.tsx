import { useEffect, useState } from "react";
import { Check, Compass, Ship, Sparkles, Star } from "lucide-react";

const MAP_WIDTH = 1672;
const MAP_HEIGHT = 941;
const LEVELS = [
  { title: "ميناء البداية", shortTitle: "الميناء", x: 355, y: 632 },
  { title: "أطلال الغابة", shortTitle: "الأطلال", x: 614, y: 514 },
  { title: "شلال الجزيرة", shortTitle: "الشلال", x: 965, y: 419 },
  { title: "كهف البركان", shortTitle: "الكهف", x: 1238, y: 268 },
];
const CHEST = { x: 1434, y: 147 };
const ROUTE_SEGMENTS = [
  [355, 632, 425, 615, 515, 520, 614, 514],
  [614, 514, 735, 498, 850, 431, 965, 419],
  [965, 419, 1082, 408, 1156, 307, 1238, 268],
  [1238, 268, 1307, 235, 1371, 160, 1434, 147],
];
const ROUTE = "M 355 632 C 425 615, 515 520, 614 514 C 735 498, 850 431, 965 419 C 1082 408, 1156 307, 1238 268 C 1307 235, 1371 160, 1434 147";

interface TreasureAdventureMapProps {
  challengeCount?: number;
  currentStage?: number;
  completedStages?: number;
  completedQuestionsInStage?: number;
  compact?: boolean;
  missionMode?: boolean;
  movingFromStage?: number;
  showTreasure?: boolean;
}

export function TreasureAdventureMap({
  challengeCount = 12,
  currentStage = 1,
  completedStages = currentStage - 1,
  completedQuestionsInStage = 0,
  compact = false,
  missionMode,
  movingFromStage,
  showTreasure = false,
}: TreasureAdventureMapProps) {
  const stageCounts = (() => {
    const base = Math.floor(challengeCount / 4);
    const extra = challengeCount % 4;
    return LEVELS.map((_, index) => base + (index < extra ? 1 : 0));
  })();
  const activeStageIndex = Math.max(0, Math.min(3, currentStage - 1));
  const activeStageCount = stageCounts[activeStageIndex] || 1;
  const stageProgress = Math.min(1, Math.max(0, completedQuestionsInStage / activeStageCount));
  const totalProgress = showTreasure ? 1 : Math.min(1, (completedStages + stageProgress) / LEVELS.length);
  const routeSegmentIndex = Math.min(LEVELS.length - 1, Math.floor(totalProgress * LEVELS.length));
  const segmentProgress = totalProgress >= 1 ? 1 : totalProgress * LEVELS.length - routeSegmentIndex;
  const [fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY] = ROUTE_SEGMENTS[routeSegmentIndex];
  const t = segmentProgress;
  const inverseT = 1 - t;
  const routePosition = {
    x: inverseT ** 3 * fromX + 3 * inverseT ** 2 * t * cp1x + 3 * inverseT * t ** 2 * cp2x + t ** 3 * toX,
    y: inverseT ** 3 * fromY + 3 * inverseT ** 2 * t * cp1y + 3 * inverseT * t ** 2 * cp2y + t ** 3 * toY,
  };
  const travelerProgress = Math.max(0.055, segmentProgress);
  const visibleT = travelerProgress;
  const visibleInverseT = 1 - visibleT;
  const travelerPosition = {
    x: visibleInverseT ** 3 * fromX + 3 * visibleInverseT ** 2 * visibleT * cp1x + 3 * visibleInverseT * visibleT ** 2 * cp2x + visibleT ** 3 * toX,
    y: visibleInverseT ** 3 * fromY + 3 * visibleInverseT ** 2 * visibleT * cp1y + 3 * visibleInverseT * visibleT ** 2 * cp2y + visibleT ** 3 * toY,
  };
  const [travelerStage, setTravelerStage] = useState(movingFromStage || currentStage);
  const animatingBetweenStages = Boolean(movingFromStage && movingFromStage !== currentStage);

  useEffect(() => {
    if (!movingFromStage || movingFromStage === currentStage) {
      setTravelerStage(currentStage);
      return;
    }
    setTravelerStage(movingFromStage);
    const timer = window.setTimeout(() => setTravelerStage(currentStage), 180);
    return () => window.clearTimeout(timer);
  }, [currentStage, movingFromStage]);

  const stageCountsLabel = stageCounts.join(" · ");

  return (
    <div className={`relative w-full overflow-hidden rounded-[1.4rem] border border-[#f4d899]/70 bg-[#49b5d4] shadow-[0_22px_65px_rgba(4,18,27,.45),inset_0_1px_0_rgba(255,255,255,.28)] ${compact ? "" : "max-w-6xl"}`} dir="ltr" aria-label="خريطة مغامرة الكنز بأربع مراحل">
      <div
        className={`relative isolate aspect-[16/9] min-w-0 overflow-hidden ${missionMode ? "min-h-[230px]" : ""}`}
        style={{
          backgroundImage: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(8,37,46,.06)),url('/images/treasure-adventure-island.jpg')",
          backgroundPosition: "center",
          backgroundSize: "100% 100%",
        }}
      >
        <div className="absolute left-[3.5%] top-[4.5%] z-20 w-[37%] -rotate-1 rounded-lg border-2 border-[#76441e] bg-gradient-to-b from-[#f6d49a] via-[#dba267] to-[#bc7942] px-2.5 py-1.5 text-center shadow-[0_5px_0_#713f20,0_8px_18px_rgba(48,30,18,.38)] sm:w-[32%] sm:px-4 sm:py-2" dir="rtl">
          <div className="text-[11px] font-black leading-tight text-[#472715] sm:text-base">مغامرة الكنز</div>
          <div className="mt-0.5 text-[7px] font-bold leading-tight text-[#56331f]/85 sm:text-[10px]">أجيبي عن الألغاز وتقدمي في الرحلة</div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
          <svg className="h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="treasure-route-progress-v2" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#fff2a8" /><stop offset="1" stopColor="#ffad32" /></linearGradient>
              <filter id="treasure-route-glow-v2" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path d={ROUTE} pathLength="100" fill="none" stroke="url(#treasure-route-progress-v2)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${totalProgress * 100} 100`} filter="url(#treasure-route-glow-v2)" opacity=".88" />
          </svg>
        </div>

        {LEVELS.map((level, index) => {
          const stage = index + 1;
          const complete = stage <= completedStages;
          const active = stage === currentStage;
          const stageQuestionsDone = complete ? activeStageCount : active ? completedQuestionsInStage : 0;
          const starsEarned = complete ? 3 : Math.min(3, Math.round((stageQuestionsDone / (stageCounts[index] || 1)) * 3));
          return (
            <div key={level.title} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(level.x / MAP_WIDTH) * 100}%`, top: `${(level.y / MAP_HEIGHT) * 100}%` }} aria-label={`المرحلة ${stage}: ${level.title}`}>
              <div className={`relative flex h-[clamp(2rem,6vw,4.8rem)] w-[clamp(2rem,6vw,4.8rem)] items-center justify-center rounded-full transition-transform duration-300 ${active ? "scale-110" : ""}`}>
                {active && <span className="absolute -inset-1.5 rounded-full border-[3px] border-[#fff1a6] shadow-[0_0_22px_rgba(255,220,100,.9)] animate-pulse" />}
                {complete && <span className="absolute -inset-1 rounded-full border-2 border-[#d9f6ba] shadow-[0_0_14px_rgba(153,255,139,.75)]" />}
                <span className="relative z-10 text-[clamp(1.1rem,3vw,2.25rem)] font-black leading-none text-white drop-shadow-[0_2px_2px_rgba(61,42,33,.9)]" style={{ WebkitTextStroke: "1px rgba(65,43,31,.55)" }}>
                  {stage}
                </span>
                {complete && <span className="absolute -right-1 -top-1 z-20 flex h-[clamp(.85rem,2vw,1.4rem)] w-[clamp(.85rem,2vw,1.4rem)] items-center justify-center rounded-full border border-white bg-[#6ba853] text-white shadow-md"><Check className="h-[65%] w-[65%]" /></span>}
              </div>
              <div className="absolute left-1/2 top-[calc(100%+0.2rem)] flex -translate-x-1/2 items-center justify-center gap-0.5 whitespace-nowrap drop-shadow-[0_1px_2px_rgba(63,40,20,.8)]" aria-label={`${starsEarned} من 3 نجوم`}>
                {[0, 1, 2].map((star) => (
                  <Star key={star} className={`h-[clamp(.75rem,2.5vw,1.35rem)] w-[clamp(.75rem,2.5vw,1.35rem)] ${star < starsEarned ? "fill-[#ffd34f] text-[#a85216]" : "fill-[#5c5147]/55 text-[#fff0c3]/75"}`} strokeWidth={2.4} />
                ))}
              </div>
            </div>
          );
        })}

        <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(CHEST.x / MAP_WIDTH) * 100}%`, top: `${(CHEST.y / MAP_HEIGHT) * 100}%` }}>
          <div className={`relative flex h-[clamp(2rem,5.5vw,4.4rem)] w-[clamp(2rem,5.5vw,4.4rem)] items-center justify-center rounded-2xl ${showTreasure ? "animate-bounce" : ""}`}>
            {showTreasure && <span className="absolute inset-1 rounded-2xl bg-[#ffe17b]/45 blur-lg" />}
          </div>
        </div>

        {!showTreasure && (
          <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-[left,top] ease-in-out" style={{ transitionDuration: "2100ms", left: `${(animatingBetweenStages ? (LEVELS[Math.max(0, Math.min(3, travelerStage - 1))]?.x ?? travelerPosition.x) : travelerPosition.x) / MAP_WIDTH * 100}%`, top: `${(animatingBetweenStages ? (LEVELS[Math.max(0, Math.min(3, travelerStage - 1))]?.y ?? travelerPosition.y) : travelerPosition.y) / MAP_HEIGHT * 100}%` }} aria-label={animatingBetweenStages ? `المستكشفة في طريقها إلى ${LEVELS[currentStage - 1]?.title || "المحطة التالية"}` : `المستكشفة على مسار المرحلة ${currentStage}`}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/65 bg-[#153949]/90 px-1.5 py-0.5 text-[7px] font-black text-white shadow-md sm:-top-6 sm:px-2 sm:text-[9px]">أنتِ هنا</span>
            <span className="relative flex h-[clamp(1.65rem,4vw,2.6rem)] w-[clamp(1.65rem,4vw,2.6rem)] items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#67d5ee] to-[#12649d] text-white shadow-[0_3px_12px_rgba(4,29,50,.7)] ring-4 ring-[#fff8c3]/45">
              <span className="absolute -inset-1.5 rounded-full border border-white/75 animate-ping" />
              <Ship className="relative z-10 h-[62%] w-[62%] drop-shadow" />
            </span>
          </div>
        )}

        <div className="absolute bottom-[3%] right-[3.5%] z-20 flex items-center gap-1.5 rounded-full border border-white/40 bg-[#124259]/80 px-2.5 py-1 text-[8px] font-black text-white shadow-lg backdrop-blur sm:px-3 sm:py-1.5 sm:text-[10px]">
          <Compass className="h-3 w-3 text-[#ffe07b] sm:h-3.5 sm:w-3.5" />
          {completedStages} من 4 محطات
          <Sparkles className="h-3 w-3 text-[#ffe07b] sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{stageCountsLabel} أسئلة</span>
        </div>
      </div>
    </div>
  );
}
