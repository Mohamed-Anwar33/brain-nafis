import React from "react";
import { audioManager } from "@/lib/audio";
import { Wand2, Lightbulb, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PowerUpsBarProps {
  fiftyFiftyAvailable: boolean;
  hintAvailable: boolean;
  shieldActive: boolean;
  shieldAvailable: boolean;
  onUseFiftyFifty: () => void;
  onUseHint: () => void;
  onUseShield: () => void;
  disabled?: boolean;
}

export function PowerUpsBar({
  fiftyFiftyAvailable,
  hintAvailable,
  shieldActive,
  shieldAvailable,
  onUseFiftyFifty,
  onUseHint,
  onUseShield,
  disabled = false,
}: PowerUpsBarProps) {
  const handleFiftyFifty = () => {
    if (!fiftyFiftyAvailable || disabled) return;
    audioManager.playPowerUp();
    onUseFiftyFifty();
  };

  const handleHint = () => {
    if (!hintAvailable || disabled) return;
    audioManager.playPowerUp();
    onUseHint();
  };

  const handleShield = () => {
    if (!shieldAvailable || disabled || shieldActive) return;
    audioManager.playPowerUp();
    onUseShield();
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3 p-2 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-sm"
      dir="rtl"
    >
      <span className="text-xs font-black text-slate-500 hidden sm:inline-block ml-1">
        وسائل المساعدة:
      </span>

      {/* 50:50 */}
      <button
        type="button"
        onClick={handleFiftyFifty}
        disabled={!fiftyFiftyAvailable || disabled}
        title="حذف خيارين خاطئين (مرة واحدة)"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-200",
          fiftyFiftyAvailable && !disabled
            ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-600 hover:text-white hover:scale-105 active:scale-95 shadow-sm"
            : "opacity-40 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        )}
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span>50:50</span>
      </button>

      {/* Hint */}
      <button
        type="button"
        onClick={handleHint}
        disabled={!hintAvailable || disabled}
        title="تلميح ذكي للسؤال"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-200",
          hintAvailable && !disabled
            ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white hover:scale-105 active:scale-95 shadow-sm"
            : "opacity-40 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        )}
      >
        <Lightbulb className="w-3.5 h-3.5" />
        <span>تلميح</span>
      </button>

      {/* Shield */}
      <button
        type="button"
        onClick={handleShield}
        disabled={!shieldAvailable || disabled || shieldActive}
        title="درع الحماية: يمنع خصم النقاط عند الخطأ"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-200",
          shieldActive
            ? "bg-emerald-600 text-white border border-emerald-500 animate-pulse shadow-md shadow-emerald-500/20"
            : shieldAvailable && !disabled
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:scale-105 active:scale-95 shadow-sm"
            : "opacity-40 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        )}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{shieldActive ? "الدرع نشط 🛡️" : "درع الأمان"}</span>
      </button>
    </div>
  );
}
