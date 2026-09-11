import React from "react";
import { Compass, Key, DoorClosed, Gem } from "lucide-react";

interface FallbackDioramaProps {
  currentPhase: string;
  keyFound: boolean;
  onInspectKey?: () => void;
  onApproachPortal?: () => void;
  disabled?: boolean;
}

export function FallbackDiorama({
  currentPhase,
  keyFound,
  onInspectKey,
  onApproachPortal,
  disabled = false,
}: FallbackDioramaProps) {
  return (
    <div className="relative w-full aspect-[16/9] max-h-[500px] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 rounded-3xl overflow-hidden border-2 border-amber-500/20 shadow-2xl select-none flex items-center justify-center p-6">
      {/* Background Starfield / Dust SVG */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="cavern-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#cavern-glow)" />
        <circle cx="15%" cy="20%" r="2" fill="#fcd34d" opacity="0.6" />
        <circle cx="85%" cy="25%" r="3" fill="#fcd34d" opacity="0.4" />
        <circle cx="45%" cy="15%" r="1.5" fill="#fcd34d" opacity="0.8" />
        <circle cx="70%" cy="40%" r="2" fill="#fcd34d" opacity="0.5" />
      </svg>

      {/* Floating 2.5D Island Diorama */}
      <div className="relative w-full max-w-2xl h-full flex flex-col justify-end items-center pb-8">
        {/* Floating Island Platform Base */}
        <div className="relative w-[90%] max-w-lg h-28 bg-gradient-to-b from-amber-950/80 via-stone-900 to-stone-950 rounded-[50%] border-t-4 border-amber-600/40 shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex items-center justify-around px-8">
          
          {/* Obelisk / Clue Landmark */}
          <div className="relative -top-12 flex flex-col items-center group cursor-pointer transition-transform hover:scale-105">
            <div className="w-8 h-24 bg-gradient-to-t from-stone-800 to-amber-700/80 rounded-t-md border-x border-t border-amber-400/40 shadow-lg flex items-center justify-center">
              <span className="text-[10px] text-amber-200/60 font-mono rotate-90">رمز قديم</span>
            </div>
            <span className="text-[11px] font-bold text-amber-200/80 mt-1 bg-black/40 px-2 py-0.5 rounded-full">
              المعلم الأثري
            </span>
          </div>

          {/* Golden Key Node */}
          {!keyFound ? (
            <button
              type="button"
              onClick={onInspectKey}
              disabled={disabled || currentPhase !== "exploration"}
              className={`relative -top-6 flex flex-col items-center group transition-all duration-300 ${
                currentPhase === "exploration"
                  ? "animate-bounce cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-4 ring-amber-300/30 group-hover:scale-110">
                <Key className="w-7 h-7 text-stone-950 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-amber-300 mt-2 bg-black/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                انقر لأخذ المفتاح 🗝️
              </span>
            </button>
          ) : (
            <div className="relative -top-6 flex flex-col items-center opacity-70">
              <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <span className="text-[11px] font-medium text-stone-400 mt-1">تم العثور على المفتاح</span>
            </div>
          )}

          {/* Portal Door Landmark */}
          <button
            type="button"
            onClick={onApproachPortal}
            disabled={disabled || !keyFound || currentPhase === "challenges" || currentPhase === "completed"}
            className={`relative -top-14 flex flex-col items-center group transition-all duration-300 ${
              keyFound && currentPhase !== "completed"
                ? "cursor-pointer hover:scale-105"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <div className={`w-20 h-28 rounded-t-full border-4 flex flex-col items-center justify-center transition-all ${
              keyFound
                ? "border-amber-400 bg-gradient-to-b from-amber-500/20 via-indigo-900/60 to-stone-950 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                : "border-stone-700 bg-stone-900/60"
            }`}>
              <DoorClosed className={`w-8 h-8 ${keyFound ? "text-amber-300 animate-pulse" : "text-stone-600"}`} />
              <div className="flex gap-1 mt-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
            </div>
            <span className={`text-xs font-bold mt-1 px-3 py-1 rounded-full border ${
              keyFound
                ? "bg-amber-500 text-stone-950 border-amber-300 shadow-md"
                : "bg-black/50 text-stone-400 border-stone-800"
            }`}>
              {currentPhase === "challenges" ? "التحديات نشطة 🔒" : "بوابة الكنز 🚪"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
