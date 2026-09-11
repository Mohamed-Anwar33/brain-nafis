import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface FloatingXpProps {
  amount: number;
  triggerKey: number | string;
  isCombo?: boolean;
}

export function FloatingXp({ amount, triggerKey, isCombo = false }: FloatingXpProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (amount <= 0) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [triggerKey, amount]);

  if (!visible || amount <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center">
      <div className="animate-in fade-in-0 zoom-in-75 slide-in-from-bottom-6 duration-700">
        <div
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-lg sm:text-xl shadow-2xl ${
            isCombo
              ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white shadow-orange-500/50 scale-110"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/40"
          }`}
          style={{
            animation: "floatUpAndFade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <Sparkles className="w-5 h-5 text-yellow-200 animate-spin" />
          <span>+{amount} XP</span>
          {isCombo && <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full mr-1">سلسلة! 🔥</span>}
        </div>
      </div>

      <style>{`
        @keyframes floatUpAndFade {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translateY(0px) scale(1.05);
          }
          80% {
            opacity: 1;
            transform: translateY(-25px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-45px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
