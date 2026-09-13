import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Sparkles,
  User,
  ArrowLeft,
  Target,
  Zap,
  Trophy,
  Award,
  Rocket,
  Gamepad2,
  Atom,
  Star,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import PremiumBackground from "@/components/ui/PremiumBackground";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { audioManager } from "@/lib/audio";

interface StartScreenProps {
  onStart: (studentName: string) => Promise<void>;
  isLoading: boolean;
}

export function StartScreen({ onStart, isLoading }: StartScreenProps) {
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");

  const validateName = (name: string): boolean => {
    const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length < 3) {
      setError("يرجى إدخال الاسم الثلاثي كاملاً (3 كلمات على الأقل)");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateName(studentName)) {
      audioManager.playWrong();
      return;
    }

    try {
      audioManager.playPowerUp();
      await onStart(studentName.trim());
    } catch (err) {
      toast.error("حدث خطأ أثناء بدء الاختبار");
    }
  };

  return (
    <PremiumBackground>
      <div className="min-h-screen flex flex-col justify-between" dir="rtl">
        {/* Scoped Keyframe Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(2.5deg); }
          }
          @keyframes floatSlowReverse {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(8px) rotate(-2.5deg); }
          }
        `}} />

        {/* Top Official Governance Bar - Jeddah Education Directorate */}
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-2xl shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-4 flex-wrap">
            {/* Ministry & Jeddah Directorate Identity */}
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src="/jeddah-education-logo.png"
                alt="شعار وزارة التعليم - إدارة تعليم جدة"
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-xs transition-transform duration-300 hover:scale-105"
              />
              <div className="border-r border-slate-300/80 pr-3 text-right">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block leading-tight">
                  المملكة العربية السعودية • وزارة التعليم
                </span>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-snug">
                  الإدارة العامة للتعليم بمحافظة جدة
                </h2>
              </div>
            </div>

            {/* School & Teacher Attribution */}
            <div className="flex items-center gap-3">
              <div className="text-left sm:text-right px-3.5 py-1.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/70 shadow-2xs">
                <span className="text-xs font-black text-indigo-900 block leading-tight">
                  المتوسطة الثانية والثمانون
                </span>
                <span className="text-[10px] font-bold text-indigo-700/80 block leading-tight">
                  المعلمة: أ/ هيفا السلمي
                </span>
              </div>

              <SoundToggle />
            </div>
          </div>
        </header>

        {/* Hero & Student Registration Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center relative">
          {/* Ambient Floating Science & Gamification Badges (Desktop) */}
          <div
            className="hidden lg:flex absolute top-12 -right-16 items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-amber-200/90 shadow-lg shadow-amber-500/10 text-amber-800 pointer-events-none select-none z-10"
            style={{ animation: "floatSlow 5s ease-in-out infinite" }}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="text-xs font-black">اختبارات سريعة وتصحيح فوري ⚡</span>
          </div>

          <div
            className="hidden lg:flex absolute top-12 -left-16 items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-fuchsia-200/90 shadow-lg shadow-fuchsia-500/10 text-fuchsia-800 pointer-events-none select-none z-10"
            style={{ animation: "floatSlowReverse 6s ease-in-out infinite" }}
          >
            <Gamepad2 className="w-4 h-4 text-fuchsia-600" />
            <span className="text-xs font-black">4 ألعاب ومغامرة الكنز 🗝️</span>
          </div>

          <div
            className="hidden xl:flex absolute bottom-24 -right-12 items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-emerald-200/90 shadow-lg shadow-emerald-500/10 text-emerald-800 pointer-events-none select-none z-10"
            style={{ animation: "floatSlowReverse 6.5s ease-in-out infinite" }}
          >
            <Award className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black">شهادات تقدير معتمدة 📜</span>
          </div>

          <div
            className="hidden xl:flex absolute bottom-24 -left-12 items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-purple-200/90 shadow-lg shadow-purple-500/10 text-purple-800 pointer-events-none select-none z-10"
            style={{ animation: "floatSlow 5.8s ease-in-out infinite" }}
          >
            <Trophy className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-black">لوحة شرف الأبطال 🏆</span>
          </div>

          {/* Ambient Lighting Orbs */}
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-sky-400/15 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Platform Logo & Hero Branding */}
          <div className="text-center space-y-4 mb-8 sm:mb-10 w-full animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Mascot Capsule Badge */}
            <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border-2 border-indigo-200/90 shadow-xs text-xs sm:text-sm font-black text-slate-800">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: "5s" }} />
              <span>مرحباً بك في منصة براين ساينس للتفوق 🚀✨</span>
            </div>

            {/* Science Logo Presentation */}
            <div className="relative inline-flex items-center justify-center group my-1">
              <div className="absolute -inset-3 bg-gradient-to-r from-sky-400/30 via-indigo-500/30 to-emerald-400/30 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="relative p-4 rounded-3xl bg-white/95 backdrop-blur-xl shadow-xl shadow-indigo-100/60 border border-white group-hover:scale-105 transition-transform duration-500">
                <img
                  src="/logo.jpg"
                  alt="براين ساينس"
                  className="h-20 sm:h-28 w-auto object-contain mix-blend-multiply"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                منصة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-sky-600 to-blue-700">براين ساينس</span> للتفوق
              </h1>
            </div>
          </div>

          {/* Student Access Card (3D Gamified Entrance) */}
          <div className="w-full max-w-xl bg-gradient-to-b from-white via-indigo-50/30 to-white backdrop-blur-2xl p-7 sm:p-10 rounded-[2.5rem] border-3 border-indigo-200/90 shadow-[0_25px_80px_rgba(79,70,229,0.16)] space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Top Shimmer Energy Beam */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500" />

            {/* Header with 3D Avatar Emblem */}
            <div className="text-center space-y-3">
              <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-indigo-500/35 ring-4 ring-indigo-100">
                <Rocket className="w-9 h-9 sm:w-10 sm:h-10 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  سجّل اسمك يا بطل وابدأ المغامرة! 🌟
                </h3>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <Label
                  htmlFor="studentName"
                  className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>اسم الطالب الثلاثي (باللغة العربية):</span>
                </Label>
                <div className="relative group">
                  <Input
                    id="studentName"
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="اكتب اسمك الثلاثي هنا (مثال: سارة محمد الغامدي)"
                    className="h-16 sm:h-18 text-base sm:text-xl text-center rounded-2xl border-3 border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 shadow-xs font-black"
                    dir="rtl"
                  />
                </div>
                {error ? (
                  <p className="text-rose-500 text-xs font-black animate-pulse text-center mt-1">
                    {error}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 font-bold text-center">
                    💡 يُسجل اسمك في الشهادات الرسمية وقائمة المتصدرين تماماً كما تكتبه هنا
                  </p>
                )}
              </div>

              {/* 4 Gamified Platform Highlights Tokens */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-xs font-black text-amber-900 shadow-2xs">
                  <span className="text-base">⚡</span>
                  <span>اختبارات سريعة وتصحيح</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-fuchsia-50/90 border border-fuchsia-200/90 text-xs font-black text-fuchsia-900 shadow-2xs">
                  <span className="text-base">🎮</span>
                  <span>4 ألعاب ومغامرة الكنز</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-xs font-black text-emerald-900 shadow-2xs">
                  <span className="text-base">📜</span>
                  <span>شهادات تكريم فورية</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-purple-50/90 border border-purple-200/90 text-xs font-black text-purple-900 shadow-2xs">
                  <span className="text-base">🏆</span>
                  <span>لوحة الشرف وتنافس حي</span>
                </div>
              </div>

              {/* 3D Tactile Launch Action Button */}
              <button
                type="submit"
                disabled={isLoading || !studentName.trim()}
                onMouseEnter={() => audioManager.playClick()}
                className="w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-base sm:text-xl text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/55 hover:brightness-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Brain className="animate-spin w-6 h-6" />
                    <span>جاري تجهيز عالم التحدي...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>انطلق إلى التحدي العلمي 🚀</span>
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
                  </span>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] font-black text-slate-500 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>دخول مباشر وسريع • بدون كلمة مرور • حفظ فوري لنقاطك</span>
              </div>
            </form>
          </div>
        </main>
      </div>
    </PremiumBackground>
  );
}
