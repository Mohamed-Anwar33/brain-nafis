import React, { useEffect, useState } from "react";
import { Key, Sparkles, Zap, ArrowLeft, DoorClosed, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { treasureHalalAudio } from "@/lib/treasureAudio";

interface LockUnlockOverlayProps {
  unlockedStep: number;
  totalSteps: number;
  pointsEarned?: number;
  onAdvance: () => void;
}

export function LockUnlockOverlay({
  unlockedStep,
  totalSteps,
  pointsEarned = 30,
  onAdvance,
}: LockUnlockOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const remainingLocks = Math.max(0, totalSteps - unlockedStep);

  useEffect(() => {
    try {
      treasureHalalAudio.playKeyFound();
    } catch (e) {}

    // Pop the lock open after 250ms
    const openTimer = setTimeout(() => {
      setIsOpen(true);
      try {
        treasureHalalAudio.playStoneGateRumble();
        treasureHalalAudio.playCrystalPulse();
      } catch (e) {}

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.45 },
          colors: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6"],
        });
      } catch (e) {}
    }, 250);

    // Auto-advance quickly after 1.8s
    const autoAdvanceTimer = setTimeout(() => {
      onAdvance();
    }, 1800);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(autoAdvanceTimer);
    };
  }, [onAdvance]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative z-10 max-w-md w-full bg-gradient-to-b from-white via-amber-50/40 to-white rounded-[2.5rem] shadow-2xl p-6 sm:p-8 text-center border-3 border-amber-300 shadow-amber-500/20 animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Ambient Magical Glow */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Modern 3D Lock Icon */}
        <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center relative">
          <div className="absolute -inset-3 rounded-full bg-amber-400/30 blur-xl animate-pulse pointer-events-none" />
          <svg viewBox="0 0 100 110" className="w-24 h-24 overflow-visible drop-shadow-xl relative z-10">
            <defs>
              <linearGradient id="modernGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="30%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="modernChrome" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>

            {/* Shackle (المعدن المتحرك) */}
            <path
              d="M 32 50 L 32 26 A 18 18 0 0 1 68 26 L 68 50"
              fill="none"
              stroke="url(#modernChrome)"
              strokeWidth="9"
              strokeLinecap="round"
              style={{
                transformOrigin: "32px 50px",
                transform: isOpen ? "translateY(-12px) rotate(-35deg)" : "translateY(0) rotate(0)",
                transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />

            {/* Padlock Body */}
            <rect
              x="18"
              y="44"
              width="64"
              height="54"
              rx="16"
              fill="url(#modernGold)"
              stroke="#d97706"
              strokeWidth="2.5"
            />

            {/* Keyhole */}
            <circle cx="50" cy="67" r="5" fill="#451a03" />
            <polygon points="47.5,67 52.5,67 51.5,80 48.5,80" fill="#451a03" />
          </svg>

          {isOpen && (
            <div className="absolute -top-1 -right-1 w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-in zoom-in-50 ring-4 ring-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Celebratory Points Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-black shadow-2xs mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: "5s" }} />
          <span>+{pointsEarned} نقطة ذهبية مكافأة 🌟</span>
        </div>

        {/* Clean Modern Text */}
        <div className="space-y-1.5 mb-6">
          <h3 className="text-2xl font-black text-slate-900">
            تم فك القفل {unlockedStep} بنجاح! 🔓✨
          </h3>
          <p className="text-sm font-bold text-slate-600 leading-relaxed">
            {remainingLocks === 0
              ? "يا لك من بطل شجاع! فُتحت البوابة بالكامل والكنز بانتظارك! 🎉"
              : remainingLocks === 1
              ? "مذهل! باقي قفل واحد فقط وتكشف كنز الأساطير! 🗝️"
              : `عمل رائع! باقي ${remainingLocks} أقفال لفتح غرفة الكنز كاملة.`}
          </p>
        </div>

        {/* 3D Action Button */}
        <button
          type="button"
          onClick={onAdvance}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-white font-black text-base shadow-lg shadow-amber-500/30 hover:brightness-105 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {remainingLocks === 0 ? (
            <>
              <DoorClosed className="w-5 h-5" />
              <span>دخول غرفة الكنز الأسطورية 🗝️</span>
            </>
          ) : (
            <>
              <span>متابعة مغامرة الكنز</span>
              <ArrowLeft className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
