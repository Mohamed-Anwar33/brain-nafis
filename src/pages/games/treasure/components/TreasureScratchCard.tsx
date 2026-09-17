import React, { useRef, useState, useEffect, useCallback } from "react";
import { Sparkles, Trophy, Award, ArrowLeft, Star, Gift, CheckCircle2, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { treasureHalalAudio } from "@/lib/treasureAudio";

interface TreasureScratchCardProps {
  stageNumber: number; // 1, 2, 3, or 4
  stageTitle?: string;
  pointsAwarded: number; // 25
  totalAccumulatedScore: number; // 25, 50, 75, or 100
  onCompleted: () => void;
}

const STAGE_DETAILS: Record<
  number,
  {
    title: string;
    artifactName: string;
    icon: string;
    clue: string;
    color: string;
  }
> = {
  1: {
    title: "المرحلة الأولى: أختام بوابة الرياح",
    artifactName: "تميمة الياقوت الأثرية 💎",
    icon: "💎",
    clue: "تم كسر القفل الأول واستخراج التميمة السرية! حصلت على 25 نقطة",
    color: "from-amber-400 via-yellow-400 to-amber-500",
  },
  2: {
    title: "المرحلة الثانية: لؤلؤة الأعماق",
    artifactName: "لؤلؤة الحكمة الخالدة 🔮",
    icon: "🔮",
    clue: "نصف المسافة كُتبت بنجاح! طاقة البوابة تتضاعف الآن إلى 50 نقطة",
    color: "from-sky-400 via-cyan-400 to-blue-500",
  },
  3: {
    title: "المرحلة الثالثة: شعلة المعرفة الفائقة",
    artifactName: "مفتاح البوابة الملكية 🗝️",
    icon: "🗝️",
    clue: "أداء مذهل! مرحلة واحدة فقط تفصلك عن الكنز الأسطوري الأكبر (75 نقطة)",
    color: "from-emerald-400 via-teal-400 to-emerald-600",
  },
  4: {
    title: "المرحلة الرابعة: الكنز الأسطوري الأعظم",
    artifactName: "صندوق الكنز الذهبي المكتمل 👑",
    icon: "👑",
    clue: "مبروك يا بطل! حققت العلامة الكاملة 100/100 واستحققت وسام وشهادة التميز!",
    color: "from-amber-300 via-yellow-400 to-amber-600",
  },
};

export function TreasureScratchCard({
  stageNumber,
  stageTitle,
  pointsAwarded = 25,
  totalAccumulatedScore,
  onCompleted,
}: TreasureScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const stageInfo = STAGE_DETAILS[stageNumber] || STAGE_DETAILS[1];

  // Initialize Canvas with metallic golden/antique overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Metallic antique gold gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#ca8a04");
    gradient.addColorStop(0.3, "#eab308");
    gradient.addColorStop(0.5, "#fef08a");
    gradient.addColorStop(0.7, "#ca8a04");
    gradient.addColorStop(1, "#854d0e");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Antique texture / pattern
    ctx.strokeStyle = "rgba(113, 63, 18, 0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }

    // Border inner
    ctx.strokeStyle = "#713f12";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // Calligraphy / Text overlay
    ctx.fillStyle = "#451a03";
    ctx.font = "bold 20px 'Cairo', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🪙 اكشط هنا لكشف الكنز 🪙", width / 2, height / 2 - 14);

    ctx.font = "bold 13px 'Cairo', sans-serif";
    ctx.fillStyle = "#78350f";
    ctx.fillText("حرّك إصبعك أو الفأرة لكشف الجائزة", width / 2, height / 2 + 18);
  }, []);

  const triggerCelebration = useCallback(() => {
    try {
      treasureHalalAudio.playKeyFound();
      audioManager.playCorrect();
    } catch (e) {}

    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#f59e0b", "#fbbf24", "#10b981", "#3b82f6", "#ffffff"],
    });
  }, []);

  const revealCompletely = useCallback(() => {
    if (isRevealed) return;
    setIsRevealed(true);
    setScratchPercent(100);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    triggerCelebration();
  }, [isRevealed, triggerCelebration]);

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) {
        transparentCount += 4;
      }
    }

    const pct = Math.min(100, Math.round((transparentCount / totalPixels) * 100));
    setScratchPercent(pct);

    if (pct >= 40) {
      revealCompletely();
    }
  };

  const handleScratch = (clientX: number, clientY: number) => {
    if (isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    checkScratchPercentage();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300 select-none"
      dir="rtl"
    >
      <div className="relative max-w-md w-full bg-gradient-to-b from-[#fefce8] via-[#fffbeb] to-[#fef08a] border-4 border-[#b45309] rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 text-center shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_0_4px_#fde047] overflow-hidden space-y-4">
        {/* Antique Filigree Borders */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#b45309]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#b45309]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#b45309]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#b45309]" />

        {/* Header Ribbon */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-xs sm:text-sm shadow-md">
            <Sparkles className="w-4 h-4 text-stone-950" />
            <span>بطاقة كشف الكنز الأثري • المرحلة {stageNumber} من 4</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#451a03] pt-1">
            {stageTitle || stageInfo.title}
          </h3>
          <p className="text-xs text-[#78350f] font-bold">
            أكملت الأسئلة الثلاثة بنجاح! اكشط البطاقة للحصول على جائزتك 🪙
          </p>
        </div>

        {/* Scratch Area Container */}
        <div className="relative w-full max-w-[320px] sm:max-w-[340px] h-[190px] sm:h-[205px] mx-auto rounded-2xl overflow-hidden border-3 border-amber-600 shadow-inner bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200 flex items-center justify-center p-3">
          {/* UNDERNEATH: The Secret Prize Content */}
          <div className="w-full h-full flex flex-col items-center justify-center space-y-2 animate-in zoom-in-90 duration-300">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border-2 border-white flex items-center justify-center text-3xl sm:text-4xl shadow-lg ring-4 ring-amber-200 animate-bounce">
              {stageInfo.icon}
            </div>

            <div className="space-y-0.5">
              <span className="font-black text-xs sm:text-sm text-[#78350f] block">
                {stageInfo.artifactName}
              </span>
              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500 text-white font-black text-sm sm:text-base shadow-sm">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span>+{pointsAwarded} نقطة ذهبية!</span>
              </div>
            </div>

            <div className="text-[11px] font-black text-[#92400e]">
              إجمالي الرصيد:{" "}
              <span className="text-base text-amber-700 font-extrabold">
                {totalAccumulatedScore}
              </span>{" "}
              / 100
            </div>
          </div>

          {/* OVERLAY: The Scratchable Canvas */}
          <canvas
            ref={canvasRef}
            width={340}
            height={205}
            className={`absolute inset-0 w-full h-full cursor-pointer touch-none transition-opacity duration-500 ${
              isRevealed ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            onMouseDown={(e) => {
              setIsScratching(true);
              handleScratch(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              if (isScratching) handleScratch(e.clientX, e.clientY);
            }}
            onMouseUp={() => setIsScratching(false)}
            onMouseLeave={() => setIsScratching(false)}
            onTouchStart={(e) => {
              setIsScratching(true);
              const touch = e.touches[0];
              handleScratch(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleScratch(touch.clientX, touch.clientY);
            }}
            onTouchEnd={() => setIsScratching(false)}
          />
        </div>

        {/* Motivational Clue Text */}
        <p className="text-xs text-[#78350f] font-semibold leading-relaxed px-2">
          {stageInfo.clue}
        </p>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          {!isRevealed ? (
            <button
              type="button"
              onClick={revealCompletely}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-stone-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/30 hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gift className="w-5 h-5 text-stone-950" />
              <span>كشط البطاقة السحرية بنقرة واحدة ✨</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCompleted}
              className={`w-full py-3.5 px-6 rounded-2xl border-b-4 active:border-b-0 active:translate-y-1 text-white font-black text-base shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer animate-pulse ${
                stageNumber >= 4
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 border-emerald-700 shadow-emerald-500/30"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-amber-700 shadow-amber-500/30"
              }`}
            >
              {stageNumber >= 4 ? (
                <>
                  <Award className="w-5 h-5 text-yellow-300" />
                  <span>فتح غرفة الكنز واستلام الشهادة (100/100) 🏆📜</span>
                </>
              ) : (
                <>
                  <span>الانتقال إلى المرحلة {stageNumber + 1} 🗝️</span>
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
