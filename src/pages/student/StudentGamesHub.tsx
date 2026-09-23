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
    title: "لعبة المطابقة العلمية",
    tagline: "ربط وتناظر المفاهيم التخصصية",
    description: "طابق المفاهيم والمصطلحات العلمية بالصور والأشكال التوضيحية المقابلة في عمودين تفاعليين بحسب مجالك المختار.",
    icon: Puzzle,
    path: "/games/matching",
    themeGradient: "from-rose-500 via-pink-600 to-rose-700",
    glowColor: "shadow-rose-500/25",
    borderHover: "hover:border-rose-400",
    badge: "ذكاء بصري 🧩",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    title: "عجلة العلوم",
    tagline: "تدوير العجلة وتحدي الأقسام",
    description: "أدر عجلة العلوم واختبر معلوماتك ومهاراتك في أقسام التخصص المتنوعة مع احتساب النقاط والأوسمة.",
    icon: Sparkles,
    path: "/games/wheel",
    themeGradient: "from-purple-600 via-indigo-600 to-pink-600",
    glowColor: "shadow-purple-500/25",
    borderHover: "hover:border-purple-400",
    badge: "عجلة العلوم 🎡",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
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
              <div className="w-11 h-11 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                <img src="/brain-science-logo.png" alt="Logo" className="w-full h-full object-contain" />
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

          {/* Games Arena List (as requested: على شكل قوائم) */}
          <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
            {games.map((game, idx) => {
              const Icon = game.icon;

              return (
                <div
                  key={game.path}
                  onMouseEnter={() => audioManager.playClick()}
                  onClick={() => handleSelectGame(game.path)}
                  className="group relative cursor-pointer text-right w-full"
                >
                  <div
                    className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-white/95 hover:bg-gradient-to-r hover:from-white hover:via-slate-50/60 hover:to-white p-5 sm:p-6 border-2 border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] overflow-hidden`}
                  >
                    {/* Right part: Icon + Title + Description */}
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${game.themeGradient} shadow-md ${game.glowColor} group-hover:scale-105 transition-transform shrink-0`}
                      >
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {game.title}
                          </h3>
                          <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${game.badgeColor}`}>
                            {game.badge}
                          </span>
                        </div>
                        <p className="text-xs font-black text-indigo-600/90">
                          {game.tagline}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed line-clamp-2">
                          {game.description}
                        </p>
                      </div>
                    </div>

                    {/* Left part: Action CTA */}
                    <div className="flex items-center justify-end w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div
                        className={`w-full sm:w-auto py-3 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 text-white bg-gradient-to-r ${game.themeGradient} border-b-4 border-black/20 active:border-b-0 active:translate-y-0.5 shadow-md group-hover:shadow-lg transition-all group-hover:brightness-105`}
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        <span>العب وتحدَّ الآن</span>
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 duration-300" />
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
