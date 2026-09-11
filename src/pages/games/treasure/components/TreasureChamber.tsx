import React from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Award, RotateCcw, Home, Clock, Zap, CheckCircle2 } from "lucide-react";
import { FinalizeAttemptResponse } from "@/types/treasure";

interface TreasureChamberProps {
  finalResult: FinalizeAttemptResponse;
  onOpenCertificate: () => void;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export function TreasureChamber({
  finalResult,
  onOpenCertificate,
  onPlayAgain,
  onGoHome,
}: TreasureChamberProps) {
  const durationMins = Math.floor(finalResult.duration_seconds / 60);
  const durationSecs = finalResult.duration_seconds % 60;
  const isPassed = finalResult.is_passed;

  return (
    <div
      className="relative z-30 max-w-lg w-full mx-auto my-auto p-7 sm:p-9 rounded-[2.5rem] bg-white/95 backdrop-blur-2xl border-3 border-amber-300 shadow-2xl shadow-amber-500/20 text-center select-none animate-in zoom-in-95 duration-300 overflow-hidden"
      dir="rtl"
    >
      {/* Ambient Victory Aura */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* 1. 3D Trophy Header with Glow */}
      <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
        <div className="absolute -inset-2 rounded-3xl bg-amber-400/30 blur-lg animate-pulse pointer-events-none" />
        <div className="relative w-22 h-22 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-amber-950 flex items-center justify-center shadow-xl shadow-amber-500/40 ring-4 ring-amber-100">
          <Trophy className="w-11 h-11 text-white filter drop-shadow-md animate-bounce [animation-duration:2s]" />
        </div>
      </div>

      {/* 2. Clear Title */}
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
        {isPassed ? "مبروك يا بطل! تم فتح الكنز 🗝️🎉" : "أحسنت المحاولة يا بطل! 🌟"}
      </h2>
      <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed font-bold">
        {isPassed
          ? "أجبت على جميع التحديات العلمية بنجاح وفتحت بوابة الكنز الأسطوري بذكائك الفائق!"
          : "خضت تجربة رائعة في الجزيرة، يمكنك المحاولة مجدداً لتحقيق درجات أعلى وأوسمة جديدة."}
      </p>

      {/* 3. Clean Modern Score Card */}
      <div className="bg-gradient-to-b from-amber-50/60 to-white border-2 border-amber-200/80 rounded-3xl p-5 mb-6 text-center space-y-4 shadow-sm">
        <div>
          <span className="text-xs text-amber-800 font-black block mb-1">الدرجة النهائية المستحقة 🏆</span>
          <div className="flex items-baseline justify-center gap-1.5 font-sans">
            <span className="text-5xl sm:text-6xl font-black text-amber-600 tracking-tight">
              {finalResult.final_score}
            </span>
            <span className="text-lg font-bold text-slate-400">/ 100</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-amber-200/70 text-center">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 font-bold block">نقاط الأقفال</span>
            <span className="text-base font-black text-slate-800">{finalResult.base_score}</span>
          </div>
          <div className="space-y-0.5 border-x border-amber-200/70">
            <span className="text-[11px] text-slate-500 font-bold block">بونص السرعة</span>
            <span className="text-base font-black text-emerald-600 flex items-center justify-center gap-0.5">
              <Zap className="w-3.5 h-3.5" />
              +{finalResult.speed_bonus}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 font-bold block">الوقت المستغرق</span>
            <span className="text-base font-black text-slate-800 font-mono">
              {durationMins.toString().padStart(2, "0")}:{durationSecs.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* 4. 3D Tactile Action Buttons */}
      <div className="space-y-3">
        {finalResult.is_certificate_eligible && (
          <button
            type="button"
            onClick={onOpenCertificate}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-white font-black text-base shadow-lg shadow-amber-500/30 hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Award className="w-5 h-5" />
            <span>عرض وتحميل شهادة التميز 📜</span>
          </button>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-2xl font-black text-sm border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-700 shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>إعادة المغامرة</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="py-3 px-5 rounded-2xl font-black text-sm border-2 border-slate-200 bg-white hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-600 shadow-2xs"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
