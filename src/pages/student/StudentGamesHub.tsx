import { useEffect, useMemo } from "react";
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
} from "lucide-react";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
} from "@/lib/selection-context";

const games = [
  {
    title: "لعبة المطابقة",
    description: "ربط العناصر المتناظرة من نفس سياقك الدراسي.",
    icon: Puzzle,
    path: "/games/matching",
    color: "from-rose-500 to-pink-600",
  },
  {
    title: "لغز الترتيب",
    description: "ترتيب الخطوات أو العناصر بالتسلسل الصحيح.",
    icon: Gamepad2,
    path: "/games/ordering",
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "تحدي السرعة",
    description: "أسئلة متتابعة بسرعة مع نفس التصفية الحالية.",
    icon: Timer,
    path: "/games/speed",
    color: "from-amber-500 to-orange-600",
  },
];

export default function StudentGamesHub() {
  const navigate = useNavigate();
  const context = useMemo(() => getStoredSelectionContext(), []);

  useEffect(() => {
    if (!context || context.trackType !== "nafis") {
      navigate("/student/dashboard", { replace: true });
    }
  }, [context, navigate]);

  if (!context || context.trackType !== "nafis") {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.14),_transparent_28%),linear-gradient(135deg,#f8fafc,#ecfeff,#fff7ed)]"
      dir="rtl"
    >
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/dashboard")}
            className="gap-2 rounded-full"
          >
            <ArrowRight className="h-4 w-4" />
            العودة
          </Button>

          <div className="text-left">
            <h1 className="text-lg font-black text-slate-900">ألعاب نافس</h1>
            <p className="text-sm text-slate-500">
              اختر اللعبة المناسبة داخل نفس السياق
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="border-0 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-slate-900 px-4 py-1 text-white hover:bg-slate-900">
                السياق الحالي
              </Badge>
              <span className="text-sm text-slate-600">
                {getSelectionDisplayText(context)}
              </span>
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-3">
            {games.map((game) => {
              const Icon = game.icon;

              return (
                <button
                  key={game.path}
                  type="button"
                  onClick={() => navigate(game.path)}
                  className="text-right"
                >
                  <Card className="h-full border-0 bg-white/90 p-6 shadow-xl shadow-slate-200/60 transition-all hover:-translate-y-1 hover:shadow-2xl">
                    <div
                      className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} text-white shadow-lg`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900">
                      {game.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {game.description}
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Zap className="h-4 w-4" />
                      ابدأ اللعبة
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
