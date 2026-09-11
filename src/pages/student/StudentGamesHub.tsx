import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Gamepad2,
  Puzzle,
  Timer,
  Zap,
  Compass,
  Sparkles,
  Flame,
  Award,
  ChevronLeft,
} from "lucide-react";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
  ensureStoredSelectionContext,
} from "@/lib/selection-context";
import { SelectionContext } from "@/types/selection";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { audioManager } from "@/lib/audio";
import PremiumBackground from "@/components/ui/PremiumBackground";
import { StudentPortalHub } from "@/components/student/StudentPortalHub";

const games = [
  {
    title: "لعبة المطابقة",
    tagline: "ربط وتناظر المفاهيم",
    description: "تحدي فكري ممتع لربط المفاهيم العلمية المتناظرة من واقع مقررك الدراسي بدقة وتركيز.",
    icon: Puzzle,
    path: "/games/matching",
    themeGradient: "from-rose-500 via-pink-600 to-rose-700",
    glowColor: "shadow-rose-500/25",
    borderHover: "hover:border-rose-400",
    badge: "ذكاء بصري 🧩",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    title: "لغز الترتيب",
    tagline: "ترتيب الخطوات والعمليات",
    description: "اختبر تسلسلك المنطقي في ترتيب مراحل الظواهر والخطوات العلمية بالترتيب الصحيح.",
    icon: Gamepad2,
    path: "/games/ordering",
    themeGradient: "from-emerald-500 via-teal-600 to-emerald-700",
    glowColor: "shadow-emerald-500/25",
    borderHover: "hover:border-emerald-400",
    badge: "تفكير منطقي 🔄",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    title: "تحدي السرعة",
    tagline: "سباق الإجابات السريعة",
    description: "أسئلة متتابعة سريعة تختبر سرعة بديهتك ودقة معلوماتك تحت ضغط الوقت مع عداد الحماس.",
    icon: Timer,
    path: "/games/speed",
    themeGradient: "from-amber-500 via-orange-600 to-red-600",
    glowColor: "shadow-orange-500/25",
    borderHover: "hover:border-orange-400",
    badge: "سرعة بديهة ⚡",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    title: "مغامرة الكنز 🗝️",
    tagline: "رحلة البحث وفك الأقفال",
    description: "استكشف الواحة العلمية وحل ألغاز المعرفة لفك أقفال البوابة الحجرية الثلاثة واكتشاف الكنز.",
    icon: Compass,
    path: "/games/treasure/active",
    themeGradient: "from-amber-600 via-yellow-600 to-amber-700",
    glowColor: "shadow-yellow-500/25",
    borderHover: "hover:border-amber-400",
    badge: "مغامرة كبرى 🗺️",
    badgeColor: "bg-yellow-50 text-yellow-800 border-yellow-200",
  },
];

export default function StudentGamesHub() {
  const navigate = useNavigate();
  const [context, setContext] = useState<SelectionContext | null>(() => {
    return getStoredSelectionContext() || ensureStoredSelectionContext("nafis");
  });

  useEffect(() => {
    const active = ensureStoredSelectionContext("nafis");
    setContext(active);
  }, []);

  const handleSelectGame = (path: string) => {
    audioManager.playPowerUp();
    navigate(path);
  };

  return (
    <PremiumBackground>
      <div className="min-h-screen pb-16" dir="rtl">
        {/* Sticky Glass Top Navigation */}
        <header className="sticky top-0 z-30 border-b border-white/80 bg-white/75 backdrop-blur-2xl shadow-sm">
          <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  audioManager.playClick();
                  navigate("/student/dashboard");
                }}
                className="gap-2 rounded-2xl bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 shadow-sm font-bold text-sm h-11 px-4 transition-all hover:scale-105 active:scale-95"
              >
                <ArrowRight className="h-4 w-4" />
                العودة للرئيسية
              </Button>
              <SoundToggle />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  ألعاب براين ساينس
                </h1>
                <p className="text-xs text-indigo-600 font-bold">
                  بيئة التعلم التفاعلي والتلعيب
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl space-y-8 sm:space-y-12">
          {/* Creative Hero Banner */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-6 sm:p-10 text-white shadow-2xl shadow-indigo-950/20 border border-indigo-700/40 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Ambient Lighting Orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-sky-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>تحديات علمية تفاعلية بأسلوب الألعاب</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                  اختر لعبتك العلمية وأثبت تفوقك 🎮✨
                </h2>

                <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                  حول المذاكرة والاختبارات إلى متعة وتحدٍ شيق. اختر التحدي الذي يناسبك واجمع نقاط الخبرة والأوسمة!
                </p>
              </div>

              {/* Scope Card */}
              <div className="w-full md:w-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 text-right space-y-2 shadow-inner">
                <span className="text-[11px] font-black text-sky-300 uppercase tracking-wider block">
                  السياق والمقرر الدراسي المختار:
                </span>
                <p className="text-sm sm:text-base font-black text-white">
                  {getSelectionDisplayText(context)}
                </p>
              </div>
            </div>
          </div>

          {/* Excellence & Motivation Hub (Leaderboard, Achievements, Progress, Certificates) */}
          <StudentPortalHub className="mt-0 pt-0 border-t-0" />

          {/* Games Arena Grid */}
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((game, idx) => {
              const Icon = game.icon;

              return (
                <div
                  key={game.path}
                  onMouseEnter={() => audioManager.playClick()}
                  onClick={() => handleSelectGame(game.path)}
                  className="group relative cursor-pointer text-right flex flex-col h-full"
                >
                  {/* Subtle hover glow aura */}
                  <div
                    className={`absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r ${game.themeGradient} opacity-0 group-hover:opacity-40 blur-2xl transition-all duration-500 pointer-events-none`}
                  />

                  <div className={`relative flex flex-col justify-between h-full rounded-[2.5rem] bg-gradient-to-b from-white via-slate-50/50 to-white p-6 sm:p-7 border-3 border-slate-200/90 shadow-xl shadow-slate-200/60 transition-all duration-500 group-hover:-translate-y-3 group-hover:scale-[1.02] group-hover:shadow-2xl ${game.borderHover}`}>
                    {/* Specular Shimmer Sweep on Hover */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none skew-x-12 rounded-[2.5rem]" />

                    <div className="relative space-y-4">
                      {/* Top Badge & Icon Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs font-black px-3 py-1 rounded-full border shadow-2xs ${game.badgeColor}`}>
                          {game.badge}
                        </span>

                        <div
                          className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white bg-gradient-to-br ${game.themeGradient} shadow-lg ${game.glowColor} group-hover:scale-115 group-hover:rotate-6 transition-transform duration-500 ring-4 ring-white/80`}
                        >
                          <Icon className="w-8 h-8" />
                        </div>
                      </div>

                      {/* Title & Tagline */}
                      <div className="space-y-1">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {game.title}
                        </h3>
                        <p className="text-xs font-black text-indigo-600/90">
                          {game.tagline}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-bold">
                        {game.description}
                      </p>
                    </div>

                    {/* 3D Tactile Launch Action Button */}
                    <div className="pt-6 border-t border-slate-100/90 relative mt-4">
                      <div
                        className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 text-white bg-gradient-to-r ${game.themeGradient} border-b-4 border-black/25 active:border-b-0 active:translate-y-1 shadow-md group-hover:shadow-xl transition-all group-hover:brightness-105`}
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        <span>العب وتحدَّ الآن</span>
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1.5 duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </PremiumBackground>
  );
}
