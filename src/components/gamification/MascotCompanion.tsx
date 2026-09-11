import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export type MascotMood = "idle" | "happy" | "encourage" | "streak" | "celebrate";

interface MascotCompanionProps {
  mood?: MascotMood;
  customMessage?: string | null;
  className?: string;
  compact?: boolean;
}

const MOOD_MESSAGES: Record<MascotMood, string[]> = {
  idle: [
    "أنا معك يا بطل، ركّز وتألق! 🧠",
    "اقرأ السؤال بهدوء، أنت قادر على حلّه ✨",
    "العلم نور وقوة.. انطلق بثقة 🚀",
  ],
  happy: [
    "كفووو! إجابة عبقرية! 🌟",
    "ما شاء الله عليك، استمر في الصدارة! 👑",
    "إبداع حقيقي! فخور بك يا بطل 👏",
    "أحسنت! إجابة صحيحة مئة بالمئة 💯",
  ],
  encourage: [
    "لا بأس يا بطل، كل خطأ هو خطوة نحو التعلم! 🌱",
    "فكر مرة ثانية بهدوء، أنت تقدر عليها! 💡",
    "راجع السؤال جيداً.. الإجابة قريبة جداً 🧐",
    "ركز أكثر، التحدي يصنع الأبطال! 💪",
  ],
  streak: [
    "سلسلة نارية أسطورية! واصل الاشتعال! 🔥🔥🔥",
    "وااااو! تفوق كاسح بدون أي توقف! ⚡🚀",
    "طاقتك في القمة اليوم! استمر مبدعاً! 🏆",
  ],
  celebrate: [
    "مبارك إنجازك الأسطوري! لقد أثبتت جدارتك 🎓🎉",
    "وسام الشرف يليق بك يا بطل براين ساينس! 🌟",
  ],
};

export function MascotCompanion({
  mood = "idle",
  customMessage,
  className,
  compact = false,
}: MascotCompanionProps) {
  const displayMessage = useMemo(() => {
    if (customMessage) return customMessage;
    const messages = MOOD_MESSAGES[mood] || MOOD_MESSAGES.idle;
    return messages[Math.floor(Math.random() * messages.length)];
  }, [mood, customMessage]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 transition-all duration-500",
        compact ? "p-2" : "p-3 sm:p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-indigo-100 shadow-sm",
        className
      )}
      dir="rtl"
    >
      {/* Animated Mascot Robot SVG */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center relative transition-transform duration-300",
            mood === "happy" && "animate-bounce",
            mood === "streak" && "animate-pulse scale-110",
            mood === "encourage" && "scale-100",
            "bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 text-white"
          )}
        >
          {/* Pulsing Aura */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl blur-md -z-10 transition-opacity",
              mood === "streak" ? "bg-amber-400/60 opacity-100 animate-ping" : "bg-indigo-400/40 opacity-50"
            )}
          />

          {/* Robot Face Graphic */}
          <svg
            viewBox="0 0 64 64"
            className="w-9 h-9 sm:w-10 sm:h-10 fill-none"
          >
            {/* Antenna */}
            <circle cx="32" cy="8" r="4" fill="#fbbf24" className="animate-pulse" />
            <line x1="32" y1="12" x2="32" y2="18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Ears / Headbolts */}
            <rect x="8" y="28" width="4" height="8" rx="2" fill="#93c5fd" />
            <rect x="52" y="28" width="4" height="8" rx="2" fill="#93c5fd" />

            {/* Head Body */}
            <rect x="12" y="18" width="40" height="34" rx="10" fill="#ffffff" fillOpacity="0.95" />

            {/* Visor Screen */}
            <rect x="16" y="24" width="32" height="18" rx="6" fill="#0f172a" />

            {/* Eyes */}
            {mood === "happy" || mood === "streak" || mood === "celebrate" ? (
              // Happy Arc Eyes ^^
              <>
                <path d="M 22 34 Q 26 29 30 34" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                <path d="M 34 34 Q 38 29 42 34" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : mood === "encourage" ? (
              // Thinking / Gentle Eyes
              <>
                <circle cx="26" cy="33" r="3.5" fill="#facc15" />
                <circle cx="38" cy="33" r="3.5" fill="#facc15" />
              </>
            ) : (
              // Normal Friendly Visor Eyes
              <>
                <circle cx="26" cy="33" r="3" fill="#38bdf8" className="animate-pulse" />
                <circle cx="38" cy="33" r="3" fill="#38bdf8" className="animate-pulse" />
              </>
            )}

            {/* Mouth / Smile */}
            {mood === "happy" || mood === "streak" ? (
              <path d="M 27 45 Q 32 49 37 45" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <line x1="28" y1="46" x2="36" y2="46" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </div>

        {/* Mascot Name Tag */}
        <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-max text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-400 border border-slate-700 shadow-sm">
          لَبيب 🤖
        </span>
      </div>

      {/* Speech Bubble */}
      <div className="flex-1 text-right">
        <div className="relative inline-block bg-white px-3.5 py-2 rounded-2xl rounded-tr-none border border-slate-200/90 shadow-sm">
          <p
            key={displayMessage}
            className={cn(
              "text-xs sm:text-sm font-black transition-all duration-300 animate-in fade-in-50 slide-in-from-right-2",
              mood === "happy" && "text-emerald-700",
              mood === "streak" && "text-amber-600 font-extrabold",
              mood === "encourage" && "text-indigo-700",
              mood === "idle" && "text-slate-700"
            )}
          >
            {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
