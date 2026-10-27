import React from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Award, RotateCcw, Home, Zap } from "lucide-react";
import { FinalizeAttemptResponse } from "@/types/treasure";

interface TreasureChamberProps {
  finalResult: FinalizeAttemptResponse;
  gradePointAwarded: boolean;
  gradePointError?: string;
  isRetryingGradePoint?: boolean;
  onRetryGradePoint?: () => void;
  onOpenCertificate: () => void;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export function TreasureChamber({
  finalResult,
  gradePointAwarded,
  gradePointError,
  isRetryingGradePoint = false,
  onRetryGradePoint,
  onOpenCertificate,
  onPlayAgain,
  onGoHome,
}: TreasureChamberProps) {
  const durationMins = Math.floor(finalResult.duration_seconds / 60);
  const durationSecs = finalResult.duration_seconds % 60;
  const isPassed = finalResult.is_passed;

  return (
    <div
      className="relative z-30 max-w-lg w-full mx-auto my-auto p-6 sm:p-8 rounded-[2rem] bg-slate-950/90 backdrop-blur-xl border border-amber-300/30 shadow-2xl shadow-slate-950/40 text-center text-white select-none animate-in zoom-in-95 duration-300 overflow-hidden"
      dir="rtl"
    >
      {/* Ambient Victory Aura */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. 3D Trophy Header with Glow */}
      <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
        <div className="absolute -inset-2 rounded-3xl bg-amber-400/20 blur-lg pointer-events-none" />
        <div className="relative w-22 h-22 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-600 text-amber-950 flex items-center justify-center shadow-xl shadow-amber-500/25 ring-1 ring-white/30">
          <Trophy className="w-11 h-11 text-white filter drop-shadow-md" />
        </div>
      </div>

      {/* 2. Clear Title */}
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
        {isPassed ? "وصلتِ إلى الكنز!" : "انتهت المغامرة"}
      </h2>
      <p className="text-sm text-slate-300 mb-6 max-w-sm mx-auto leading-relaxed font-medium">
        {isPassed
          ? "أكملتِ مراحل المغامرة وفتحتِ صندوق الكنز."
          : "يمكنك إعادة المغامرة والمحاولة مرة أخرى."}
      </p>

      {gradePointAwarded && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 font-black text-emerald-200">
          <Award className="h-5 w-5 shrink-0" />
          <span>حصلتِ على درجة واحدة إضافية في المادة</span>
        </div>
      )}
      {!gradePointAwarded && gradePointError && (
        <div role="alert" className="mb-5 space-y-3 rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
          <p>{gradePointError}</p>
          {onRetryGradePoint && !finalResult.session_id.startsWith("session_") && (
            <button
              type="button"
              onClick={onRetryGradePoint}
              disabled={isRetryingGradePoint}
              className="rounded-xl border border-amber-100/25 bg-amber-200/10 px-4 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-200/20 disabled:cursor-wait disabled:opacity-60"
            >
              {isRetryingGradePoint ? "جارٍ إعادة المحاولة…" : "أعيدي تسجيل الدرجة"}
            </button>
          )}
        </div>
      )}

      {/* 3. Clean Modern Score Card */}
      <div className="bg-white/[0.06] border border-white/10 rounded-3xl p-5 mb-6 text-center space-y-4">
        <div>
          <span className="text-xs text-slate-300 font-bold block mb-1">النتيجة النهائية</span>
          <div className="flex items-baseline justify-center gap-1.5 font-sans">
            <span className="text-5xl sm:text-6xl font-black text-amber-300 tracking-tight">
              {finalResult.final_score}
            </span>
            <span className="text-lg font-bold text-slate-400">/ 100</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 font-bold block">الدرجة الأساسية</span>
            <span className="text-base font-black text-white">{finalResult.base_score}</span>
          </div>
          <div className="space-y-0.5 border-x border-white/10">
            <span className="text-[11px] text-slate-400 font-bold block">إضافة السرعة</span>
            <span className="text-base font-black text-emerald-300 flex items-center justify-center gap-0.5">
              <Zap className="w-3.5 h-3.5" />
              +{finalResult.speed_bonus}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 font-bold block">الوقت المستغرق</span>
            <span className="text-base font-black text-white font-mono">
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
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-lg shadow-amber-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Award className="w-5 h-5" />
            <span>عرض الشهادة</span>
          </button>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm border border-white/15 bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-white"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
            <span>إعادة المغامرة</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="py-3 px-5 rounded-2xl font-bold text-sm border border-white/15 bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-200"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
