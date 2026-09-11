import React, { useState, useEffect, useRef } from "react";
import {
  Compass,
  Key,
  Sparkles,
  Search,
  Zap,
  Trophy,
  Star,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
  MapPin,
  Anchor,
  Flame,
  Award,
  BookOpen,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import { audioManager } from "@/lib/audio";

interface CinematicBriefingScrollProps {
  adventureTitle?: string;
  storyClue?: string;
  trackType?: string;
  studentName?: string;
  isMuted?: boolean;
  onStartExploration: () => void;
  onExit: () => void;
}

export const CinematicBriefingScroll: React.FC<CinematicBriefingScrollProps> = ({
  adventureTitle,
  storyClue,
  trackType,
  studentName,
  isMuted = false,
  onStartExploration,
  onExit,
}) => {
  // 'sealed' -> 'unrolling' -> 'revealed' -> 'launching'
  const [scrollState, setScrollState] = useState<"sealed" | "unrolling" | "revealed" | "launching">("sealed");
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Cinematic initial delay before auto-breaking the seal (or player clicks immediately)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBreakSeal();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleBreakSeal = () => {
    if (scrollState !== "sealed") return;

    // 1. Play procedural sound of breaking wax seal & ancient parchment unfurl
    treasureHalalAudio.playEpicScrollUnfurl();

    // 2. Burst golden magical dust & sparkles around the parchment
    confetti({
      particleCount: 65,
      spread: 80,
      origin: { y: 0.5, x: 0.5 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#fef08a", "#b45309", "#ef4444"],
      disableForReducedMotion: true,
    });

    setScrollState("unrolling");

    setTimeout(() => {
      setScrollState("revealed");
    }, 850);
  };

  const handleLaunch = () => {
    if (scrollState === "launching") return;

    audioManager.playPowerUp();
    treasureHalalAudio.playStoneGateRumble();

    setScrollState("launching");

    confetti({
      particleCount: 90,
      spread: 100,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#34d399", "#60a5fa", "#f59e0b"],
    });

    setTimeout(() => {
      onStartExploration();
    }, 650);
  };

  // Subtle 3D tilt tracking for authentic tactile depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || scrollState === "sealed") return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8; // max 8 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    setTilt({ x: y, y: x });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const isSealed = scrollState === "sealed";
  const isUnrolling = scrollState === "unrolling";
  const isLaunching = scrollState === "launching";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 select-none overflow-y-auto pointer-events-auto"
      style={{ perspective: "1400px" }}
      dir="rtl"
    >
      {/* 1. Dramatic Atmospheric Vignette & Firefly Glow Particles */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/85 backdrop-blur-[8px] transition-opacity duration-700 pointer-events-none" />

      {/* Floating Golden Embers & Mystery Sparks */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[12%] right-[15%] w-2.5 h-2.5 rounded-full bg-amber-400 blur-[1px] animate-pulse" style={{ animationDuration: "3s" }} />
        <div className="absolute top-[28%] left-[12%] w-3 h-3 rounded-full bg-yellow-300 blur-[1px] animate-ping" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-[22%] right-[18%] w-2 h-2 rounded-full bg-amber-300 blur-[1px] animate-pulse" style={{ animationDuration: "3.5s" }} />
        <div className="absolute bottom-[16%] left-[22%] w-2 h-2 rounded-full bg-yellow-200 blur-[0.5px] animate-bounce" style={{ animationDuration: "5s" }} />
        <div className="absolute top-[50%] right-[8%] w-2 h-2 rounded-full bg-amber-500 blur-[1px] animate-ping" style={{ animationDuration: "6s" }} />
      </div>

      {/* 2. Main 3D Scroll / Notebook Container */}
      <div
        className={`relative w-full max-w-2xl transition-all duration-700 ease-out flex flex-col items-center justify-center my-auto ${
          isLaunching
            ? "scale-90 -translate-y-12 opacity-0 filter blur-sm"
            : isSealed
            ? "scale-95 sm:scale-100"
            : "scale-100"
        }`}
        style={{
          transform: `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* ========================================================================= */}
        {/* CASE 1: SEALED ROLLED ANCIENT SCROLL (المخطوطة الأثرية الملفوفة بختم شمعي) */}
        {/* ========================================================================= */}
        {isSealed && (
          <div
            onClick={handleBreakSeal}
            className="cursor-pointer group flex flex-col items-center justify-center py-12 px-6 relative transition-transform duration-300 hover:scale-105 active:scale-95"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Ambient Mystical Aura */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-yellow-400/35 to-amber-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

            {/* Cinematic Scroll Callout Banner */}
            <div className="mb-6 px-6 py-2 rounded-full bg-gradient-to-r from-[#2c1407]/95 via-[#1a0c04]/95 to-[#2c1407]/95 border-2 border-amber-400/80 shadow-[0_8px_30px_rgba(245,158,11,0.4)] flex items-center gap-2.5 text-amber-200 font-black text-xs sm:text-sm animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "8s" }} />
              <span>📜 خَرِيطَةُ جَزِيرَةِ الكَنْزِ الأَسْطُورِيِّ • انْقُرْ لِفَكِّ الخَتْمِ</span>
              <Sparkles className="w-4 h-4 text-amber-400 -scale-x-100 animate-spin" style={{ animationDuration: "8s" }} />
            </div>

            {/* The 3D Rolled Scroll Cylinder */}
            <div className="relative w-72 sm:w-96 h-28 sm:h-36 rounded-2xl bg-gradient-to-b from-[#78350f] via-[#d97706] to-[#451a03] p-1.5 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_4px_12px_rgba(254,240,138,0.5),inset_0_-6px_12px_rgba(0,0,0,0.8)] border-2 border-[#fef08a] flex items-center justify-center overflow-hidden">
              {/* Parchment Core Texture */}
              <div className="absolute inset-x-6 inset-y-2 rounded-lg bg-gradient-to-r from-[#fef08a] via-[#fde047] to-[#fef08a] opacity-90 shadow-inner flex items-center justify-center">
                <div className="w-full h-full opacity-20 bg-[radial-gradient(#78350f_1px,transparent_1px)] [background-size:8px_8px]" />
              </div>

              {/* Royal Crimson Silk Ribbon Binding */}
              <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-rose-900 via-rose-700 to-rose-950 border-x-2 border-amber-300 shadow-xl flex items-center justify-center z-10">
                <div className="w-[1px] h-full bg-amber-300/40" />
              </div>

              {/* Golden End Finials on the Left and Right */}
              <div className="absolute left-0 inset-y-0 w-8 bg-gradient-to-r from-[#b45309] to-[#78350f] border-r-2 border-[#fef08a] rounded-l-xl flex items-center justify-center shadow-md">
                <div className="w-3 h-3 rounded-full bg-amber-200 shadow-[0_0_8px_#fef08a]" />
              </div>
              <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#b45309] to-[#78350f] border-l-2 border-[#fef08a] rounded-r-xl flex items-center justify-center shadow-md">
                <div className="w-3 h-3 rounded-full bg-amber-200 shadow-[0_0_8px_#fef08a]" />
              </div>

              {/* 3D Wax Seal Medallion in Center */}
              <div className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-rose-500 via-rose-700 to-red-950 border-3 border-amber-300 shadow-[0_10px_30px_rgba(0,0,0,0.7),inset_0_3px_6px_rgba(255,255,255,0.5)] flex flex-col items-center justify-center group-hover:rotate-6 transition-transform">
                <div className="absolute inset-1.5 rounded-full border border-rose-300/40" />
                <Compass className="w-9 h-9 sm:w-11 sm:h-11 text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-spin" style={{ animationDuration: "20s" }} />
                <span className="text-[8px] font-black text-amber-100 tracking-wider mt-0.5">افتح الخريطة</span>
              </div>
            </div>

            {/* Prompt Pulse Text */}
            <p className="mt-5 text-amber-300 font-bold text-xs flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <span>🗝️</span>
              <span>انقر لكسر الختم الشمعي وانطلاق اللقطة السينمائية</span>
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 2: UNROLLING / REVEALED ANCIENT TREASURE MAP & JOURNAL NOTEBOOK      */}
        {/* ========================================================================= */}
        {!isSealed && (
          <div
            className={`relative w-full transition-all duration-700 ease-out flex flex-col items-center ${
              isUnrolling ? "scale-y-75 opacity-90" : "scale-y-100 opacity-100"
            }`}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* --------------------------------------------------------------------- */}
            {/* A. Top Wooden / Brass Spindle Rod (العصا الأسطوانية العلوية للخريطة) */}
            {/* --------------------------------------------------------------------- */}
            <div className="relative w-[105%] sm:w-[108%] -mb-3 z-30 flex items-center justify-between filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]">
              {/* Left Brass Knob */}
              <div className="w-8 h-10 sm:w-10 sm:h-12 rounded-l-full bg-gradient-to-r from-[#78350f] via-[#d97706] to-[#fbbf24] border-2 border-[#fef08a] shadow-inner shrink-0 relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-100 shadow-[0_0_10px_#fef08a]" />
              </div>

              {/* Main Wooden Shaft */}
              <div className="flex-1 h-7 sm:h-9 bg-gradient-to-b from-[#b45309] via-[#78350f] to-[#451a03] border-y-2 border-[#fef08a]/80 shadow-[inset_0_2px_4px_rgba(254,240,138,0.5),inset_0_-2px_4px_rgba(0,0,0,0.9)] relative overflow-hidden flex items-center justify-between px-4">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#fef08a] to-transparent" />
                <div className="w-6 h-full bg-gradient-to-r from-amber-400/40 to-transparent" />
                <div className="w-6 h-full bg-gradient-to-l from-amber-400/40 to-transparent" />
              </div>

              {/* Right Brass Knob */}
              <div className="w-8 h-10 sm:w-10 sm:h-12 rounded-r-full bg-gradient-to-l from-[#78350f] via-[#d97706] to-[#fbbf24] border-2 border-[#fef08a] shadow-inner shrink-0 relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-100 shadow-[0_0_10px_#fef08a]" />
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* B. The Ancient Treasure Map Parchment Body (خريطة الكنز المعتقة)      */}
            {/* --------------------------------------------------------------------- */}
            <div
              className="relative w-full overflow-hidden p-5 sm:p-7 md:p-8 text-[#451a03] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_0_50px_rgba(180,83,9,0.25),inset_0_4px_16px_rgba(0,0,0,0.3)] border-x-4 border-[#854d0e] rounded-sm"
              style={{
                backgroundColor: "#fcf6dd",
                backgroundImage: `
                  radial-gradient(ellipse at center, rgba(255, 254, 240, 0.98) 0%, rgba(254, 243, 199, 0.92) 65%, rgba(245, 208, 97, 0.95) 100%),
                  radial-gradient(circle at 15% 15%, rgba(180, 83, 9, 0.12) 0%, transparent 40%),
                  radial-gradient(circle at 85% 85%, rgba(180, 83, 9, 0.12) 0%, transparent 40%)
                `,
              }}
            >
              {/* Burnt Deckle Paper Edges */}
              <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-[#78350f]/35 via-[#b45309]/15 to-transparent pointer-events-none" />
              <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-l from-[#78350f]/35 via-[#b45309]/15 to-transparent pointer-events-none" />

              {/* Antique Watermark Nautical Rosette */}
              <Compass className="absolute -left-14 -bottom-14 w-60 h-60 text-amber-900/[0.05] pointer-events-none rotate-12" />
              <Compass className="absolute -right-14 -top-14 w-60 h-60 text-amber-900/[0.05] pointer-events-none -rotate-12" />

              {/* Golden Corner Filigrees */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#b45309]/80" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#b45309]/80" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#b45309]/80" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#b45309]/80" />

              {/* Content Space */}
              <div className="relative space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* 1. Header Bar: Explorer Rank & Royal Crest */}
                <div className="flex items-center justify-between bg-[#fef08a]/90 border border-[#b45309]/50 rounded-2xl px-4 py-2 shadow-xs">
                  <div className="flex items-center gap-2.5 text-right">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#b45309] to-[#78350f] text-amber-100 flex items-center justify-center font-black text-sm shadow-xs border border-amber-300">
                      ⚓
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-[#451a03] block leading-tight">
                        وَثِيقَةُ وَخَرِيطَةُ اسْتِكْشَافِ الكَنْزِ • 3D
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#78350f]">
                        {studentName ? `المستكشف البطل: ${studentName}` : "رتبة المغامر: صائد الأسرار الأثرية 🎖️"}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-[#78350f] text-[#fef08a] hover:bg-[#78350f] text-xs font-black px-3.5 py-1 border-none shadow-xs">
                    {trackType === "central" ? "الاختبار المركزي" : "نافس الوطني 🇸🇦"}
                  </Badge>
                </div>

                {/* 2. Map Title Crest with 3D Golden Key Emblem */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 pt-1">
                  <div className="relative group">
                    <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 opacity-70 blur-sm animate-pulse" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#d97706] via-[#f59e0b] to-[#fde047] border-2 border-white shadow-xl flex items-center justify-center shrink-0">
                      <Key className="w-9 h-9 sm:w-11 sm:h-11 text-[#451a03] animate-[spin_12s_linear_infinite]" />
                    </div>
                  </div>

                  <div className="text-right sm:text-center">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#92400e] bg-amber-200/90 px-3.5 py-0.5 rounded-full border border-amber-400 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>مغامرة استكشافية تفاعلية</span>
                    </span>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#451a03] tracking-tight leading-tight drop-shadow-xs mt-0.5">
                      مغامرة جزيرة الكنز الأسطوري
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-[#b45309]">
                      {adventureTitle || "تحدي أسرار المادة والطاقة في قلب الجزيرة"}
                    </p>
                  </div>
                </div>

                {/* 3. The 3-Waypoint Expedition Trail (مسار المغامرة المنقط على الخريطة الأثرية) */}
                <div className="bg-[#fffbeb]/90 border-2 border-[#b45309]/30 rounded-2xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3 border-b border-[#b45309]/20 pb-2">
                    <span className="text-xs font-black text-[#78350f] flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#b45309]" />
                      <span>خارطة مراحل الحملة الاستكشافية:</span>
                    </span>
                    <span className="text-[10px] font-black text-[#92400e] bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                      ٣ محطات مجيدة
                    </span>
                  </div>

                  {/* Illustrated 3 Stations with Dotted Navigation Path */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative">
                    {/* Station 1 */}
                    <div className="relative bg-gradient-to-b from-white/95 to-amber-50/90 border-2 border-amber-300 rounded-xl p-3 flex flex-col items-center text-center shadow-xs hover:border-amber-500 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-white flex items-center justify-center mb-1.5 shadow-md group-hover:scale-110 transition-transform">
                        <Search className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-[#78350f] leading-tight">١. ساحل الاستكشاف</span>
                      <span className="text-[10px] text-stone-600 font-bold leading-tight mt-0.5">
                        مسح الجزيرة 360° والتقاط المفتاح الأثري 🗝️
                      </span>
                    </div>

                    {/* Station 2 */}
                    <div className="relative bg-gradient-to-b from-white/95 to-orange-50/90 border-2 border-orange-300 rounded-xl p-3 flex flex-col items-center text-center shadow-xs hover:border-orange-500 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white flex items-center justify-center mb-1.5 shadow-md group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-[#78350f] leading-tight">٢. بوابة الطاقة الحجرية</span>
                      <span className="text-[10px] text-stone-600 font-bold leading-tight mt-0.5">
                        فك أختام البوابة الثلاثة بألغاز المعرفة ⚡
                      </span>
                    </div>

                    {/* Station 3 */}
                    <div className="relative bg-gradient-to-b from-white/95 to-emerald-50/90 border-2 border-emerald-300 rounded-xl p-3 flex flex-col items-center text-center shadow-xs hover:border-emerald-500 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center mb-1.5 shadow-md group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-emerald-900 leading-tight">٣. قاعة الكنز والذهب</span>
                      <span className="text-[10px] text-stone-600 font-bold leading-tight mt-0.5">
                        فتح الصندوق وحصد +500XP وشهادة الفخر 💎
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Captain's Weathered Secret Logbook Note (مذكرات القبطان الميدانية) */}
                <div className="bg-gradient-to-r from-amber-200/95 via-yellow-100/95 to-amber-200/95 border-2 border-dashed border-[#b45309] rounded-2xl p-3.5 text-center shadow-xs relative">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-[#b45309]" />
                    <span className="text-xs font-black text-[#92400e]">مقتطف مذكرات القبطان المستكشف:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#78350f] font-black leading-relaxed">
                    "{storyClue || "أيها المغامر الذكي، لقد خُبئ المفتاح بعناية فائقة بجوار معالم الجزيرة المضيئة... استدر بالكاميرا 360° وتتبّع بريق الذهب لتبدأ فتح الأقفال!"}"
                  </p>
                </div>

                {/* 5. Expedition Spoils & Honor Badges */}
                <div className="flex items-center justify-center flex-wrap gap-2 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-900/10 border border-amber-600/30 text-xs font-black text-[#78350f]">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    +500 XP خبرة استكشافية
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-900/10 border border-amber-600/30 text-xs font-black text-[#78350f]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    عالم ثلاثي الأبعاد 360° 🌐
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-900/10 border border-amber-600/30 text-xs font-black text-[#78350f]">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    وسام صائد الكنوز المعتمد
                  </span>
                </div>

                {/* 6. Chunky 3D Action Launch Button (زر الاقتحام ثلاثي الأبعاد) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLaunch}
                    disabled={isLaunching}
                    className="w-full relative overflow-hidden py-4 sm:py-4.5 px-8 rounded-2xl border-b-4 border-amber-950 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-stone-950 font-black text-base sm:text-xl shadow-[0_10px_30px_rgba(245,158,11,0.55)] hover:brightness-110 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                  >
                    <Key className="w-6 h-6 text-stone-950 group-hover:rotate-45 transition-transform shrink-0" />
                    <span>⚔️ فُكَّ الخَتْمَ وَاقْتَحِمْ جَزِيرَةَ الكَنْزِ ⚔️</span>
                    <Key className="w-6 h-6 text-stone-950 -scale-x-100 group-hover:-rotate-45 transition-transform shrink-0" />
                  </button>
                </div>

                {/* Controls Hint */}
                <p className="text-[11px] sm:text-xs text-[#92400e] font-bold text-center flex items-center justify-center gap-1">
                  <span>💡</span>
                  <span>اسحب بالفأرة أو بإصبعك للدوران 360° حول الجزيرة، وتتبّع وميض المفتاح الذهبي</span>
                </p>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* C. Bottom Wooden / Brass Spindle Rod (العصا الأسطوانية السفلية للخريطة) */}
            {/* --------------------------------------------------------------------- */}
            <div className="relative w-[105%] sm:w-[108%] -mt-3 z-30 flex items-center justify-between filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.7)]">
              {/* Left Brass Knob */}
              <div className="w-8 h-10 sm:w-10 sm:h-12 rounded-l-full bg-gradient-to-r from-[#78350f] via-[#d97706] to-[#fbbf24] border-2 border-[#fef08a] shadow-inner shrink-0 relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-100 shadow-[0_0_10px_#fef08a]" />
              </div>

              {/* Main Wooden Shaft */}
              <div className="flex-1 h-7 sm:h-9 bg-gradient-to-b from-[#b45309] via-[#78350f] to-[#451a03] border-y-2 border-[#fef08a]/80 shadow-[inset_0_2px_4px_rgba(254,240,138,0.5),inset_0_-2px_4px_rgba(0,0,0,0.9)] relative overflow-hidden flex items-center justify-between px-4">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#fef08a] to-transparent" />
                <div className="w-6 h-full bg-gradient-to-r from-amber-400/40 to-transparent" />
                <div className="w-6 h-full bg-gradient-to-l from-amber-400/40 to-transparent" />
              </div>

              {/* Right Brass Knob */}
              <div className="w-8 h-10 sm:w-10 sm:h-12 rounded-r-full bg-gradient-to-l from-[#78350f] via-[#d97706] to-[#fbbf24] border-2 border-[#fef08a] shadow-inner shrink-0 relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-100 shadow-[0_0_10px_#fef08a]" />
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* D. Broken Royal Wax Seal Hanging (ختم الشمع الملكي المفكوك بأسفل الخريطة) */}
            {/* --------------------------------------------------------------------- */}
            <div className="absolute -bottom-8 z-40 flex flex-col items-center pointer-events-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
              {/* Ribbon Tails */}
              <div className="flex gap-2 -mb-2.5">
                <div className="w-3.5 h-9 bg-gradient-to-b from-rose-800 to-rose-950 shadow-md transform -rotate-12 rounded-b-sm border-l border-rose-400/40" />
                <div className="w-3.5 h-9 bg-gradient-to-b from-rose-800 to-rose-950 shadow-md transform rotate-12 rounded-b-sm border-r border-rose-400/40" />
              </div>

              {/* Wax Seal Medallion */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-600 via-rose-800 to-red-950 border-2 border-amber-300 shadow-[0_8px_20px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center relative">
                <div className="absolute inset-1.5 rounded-full border border-rose-400/50" />
                <Compass className="w-7 h-7 text-amber-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CinematicBriefingScroll;
