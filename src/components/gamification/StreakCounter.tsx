import React from "react";
import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
  className?: string;
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  if (streak < 2) return null;

  const isSuperStreak = streak >= 5;
  const isMegaStreak = streak >= 8;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs sm:text-sm transition-all duration-300 animate-in zoom-in-75",
        isMegaStreak
          ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/30 animate-pulse"
          : isSuperStreak
          ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 scale-105"
          : "bg-amber-100 text-amber-800 border border-amber-300 shadow-sm",
        className
      )}
      dir="rtl"
    >
      <div className="relative">
        <Flame
          className={cn(
            "w-4 h-4 sm:w-5 sm:h-5 transition-transform",
            streak >= 3 && "animate-bounce text-amber-300",
            streak < 3 && "text-amber-500"
          )}
        />
        {isSuperStreak && (
          <span className="absolute inset-0 animate-ping opacity-75">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
          </span>
        )}
      </div>

      <span>
        {streak} متتالية!
      </span>

      <span className="text-[10px] sm:text-xs opacity-90 font-bold bg-black/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
        <Zap className="w-3 h-3 text-yellow-300" />
        {streak >= 5 ? "x3 XP" : "x2 XP"}
      </span>
    </div>
  );
}
