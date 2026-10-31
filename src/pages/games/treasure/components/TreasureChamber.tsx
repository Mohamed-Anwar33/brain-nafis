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
  const earnedPerfectScore = finalResult.subject_point_eligible === true;

  return (
    <div
      className={`relative z-30 max-w-lg w-full mx-auto my-auto p-7 sm:p-9 rounded-[2.5rem] backdrop-blur-2xl border-2 shadow-2xl text-center select-none animate-in zoom-in-95 duration-300 overflow-hidden ${earnedPerfectScore ? "bg-gradient-to-br from-emerald-50 via-white to-amber-50 border-emerald-300 shadow-emerald-500/25" : "bg-white/95 border-amber-300 shadow-amber-500/20"}`}
      dir="rtl"
    >
      {/* Ambient Victory Aura */}
      <div className={`absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none ${earnedPerfectScore ? "bg-amber-400/35" : "bg-amber-400/25"}`} />
      <div className={`absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none ${earnedPerfectScore ? "bg-emerald-400/35" : "bg-emerald-400/20"}`} />

      {/* 1. 3D Trophy Header with Glow */}
      <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
        <div className={`absolute -inset-2 rounded-3xl blur-lg animate-pulse pointer-events-none ${earnedPerfectScore ? "bg-emerald-400/45" : "bg-amber-400/30"}`} />
        <div className={`relative w-22 h-22 rounded-3xl text-amber-950 flex items-center justify-center shadow-xl ring-4 ${earnedPerfectScore ? "bg-gradient-to-tr from-emerald-400 via-teal-400 to-amber-400 shadow-emerald-500/40 ring-emerald-100 motion-safe:animate-bounce" : "bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 shadow-amber-500/40 ring-amber-100"}`}>
          <Trophy className="w-11 h-11 text-white filter drop-shadow-md" />
        </div>
      </div>

      {/* 2. Clear Title */}
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
        {earnedPerfectScore
          ? "مبروك! أتممتِ جميع التحديات بامتياز 🎉"
          : finalResult.final_score === 100
            ? "نتيجة كاملة! بقي شرط المكافأة الذهبية 🌟"
            : isPassed
              ? "أحسنتِ! أنهيتِ مغامرة الكنز 🌟"
              : "انتهت المغامرة"}
      </h2>
      <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed font-bold">
        {earnedPerfectScore
          ? "أجبتِ إجابة صحيحة عن جميع التحديات، وأنهيتِ المغامرة في أقل من ٥ دقائق. تستحقين درجة إضافية في المادة!"
          : finalResult.final_score === 100
            ? "أحرزتِ ١٠٠ نقطة! لتحصلي على الدرجة الإضافية، أجيبي عن كل التحديات إجابة صحيحة وأنهي المغامرة في أقل من ٥ دقائق."
            : "لم يحالفك الحظ هذه المرة، لا تيأسي! راجعي التحديات وحاولي مجددًا؛ قد تكون محاولتك القادمة هي الفوز."}
      </p>

      {gradePointAwarded && earnedPerfectScore && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 font-black text-emerald-800">
          <Award className="h-5 w-5 shrink-0" />
          <span>حصلتِ على درجة واحدة إضافية في المادة</span>
        </div>
      )}
      {!gradePointAwarded && gradePointError && (
        <div role="alert" className="mb-5 space-y-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          <p>{gradePointError}</p>
          {onRetryGradePoint && !finalResult.session_id.startsWith("session_") && (
            <button
              type="button"
              onClick={onRetryGradePoint}
              disabled={isRetryingGradePoint}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
            >
              {isRetryingGradePoint ? "جارٍ إعادة المحاولة…" : "أعد تسجيل الدرجة"}
            </button>
          )}
        </div>
      )}

      {/* 3. Clean Modern Score Card */}
      <div className={`bg-gradient-to-b rounded-3xl p-5 mb-6 text-center space-y-4 shadow-sm border-2 ${earnedPerfectScore ? "from-emerald-50 to-white border-emerald-200" : "from-amber-50/60 to-white border-amber-200/80"}`}>
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
            <span className={`text-base font-black flex items-center justify-center gap-0.5 ${earnedPerfectScore ? "text-emerald-600" : "text-slate-400"}`}>
              <Zap className="w-3.5 h-3.5" />
              +{finalResult.speed_bonus}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 font-bold block">الوقت المستغرق</span>
            <span className={`text-base font-black font-mono ${earnedPerfectScore ? "text-emerald-700" : "text-slate-800"}`}>
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
