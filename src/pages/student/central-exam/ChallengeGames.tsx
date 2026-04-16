import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  ChevronRight,
  Gamepad2,
  ListOrdered,
  Puzzle,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
} from "@/lib/selection-context";

interface GameCard {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
  path: string;
  dotClass: string;
}

const games: GameCard[] = [
  {
    id: "wheel",
    title: "عجلة العلوم الدوارة",
    description:
      "اختبر معلوماتك في العلوم مع العجلة الذكية عبر أقسام ومراحل متعددة.",
    features: [
      "أقسام علمية متخصصة",
      "نظام إجابة صارم",
      "خصم نقاط عند الإجابة الخاطئة",
    ],
    icon: <Sparkles className="h-10 w-10" />,
    gradient: "from-rose-500 to-pink-600",
    shadow: "shadow-rose-500/30",
    path: "/games/wheel",
    dotClass: "bg-rose-500",
  },
  {
    id: "matching",
    title: "لعبة المطابقة",
    description: "صل بين العناصر المتشابهة في أسرع وقت ممكن داخل نفس السياق.",
    features: [
      "تنمية الملاحظة",
      "تعزيز الذاكرة البصرية",
      "تحدي ضد الزمن",
    ],
    icon: <Puzzle className="h-10 w-10" />,
    gradient: "from-purple-500 to-violet-600",
    shadow: "shadow-purple-500/30",
    path: "/games/matching",
    dotClass: "bg-violet-500",
  },
  {
    id: "ordering",
    title: "لعبة السحب والإفلات",
    description: "اسحب العناصر ورتبها بالترتيب الصحيح حسب السؤال المعروض.",
    features: ["تعلم التسلسل المنطقي", "تفاعل سحب وإفلات", "تعزيز الفهم العلمي"],
    icon: <Gamepad2 className="h-10 w-10" />,
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/30",
    path: "/games/ordering",
    dotClass: "bg-emerald-500",
  },
  {
    id: "stages",
    title: "ترتيب المراحل",
    description: "رتب المراحل العلمية بالترتيب الصحيح واختبر فهمك للتسلسل.",
    features: ["فهم المراحل العلمية", "تسلسل منطقي دقيق", "تقييم المعرفة"],
    icon: <ListOrdered className="h-10 w-10" />,
    gradient: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/30",
    path: "/games/stages",
    dotClass: "bg-blue-500",
  },
  {
    id: "speed",
    title: "تحدي السرعة",
    description: "إجابات سريعة داخل نفس الصف والمادة والمجال المختار.",
    features: ["إيقاع سريع", "التزام كامل بالسياق", "لا انتقال إلا بإجابة صحيحة"],
    icon: <Timer className="h-10 w-10" />,
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/30",
    path: "/games/speed",
    dotClass: "bg-amber-500",
  },
];

export default function ChallengeGames() {
  const navigate = useNavigate();
  const selectionContext = useMemo(() => getStoredSelectionContext(), []);

  useEffect(() => {
    if (!selectionContext || selectionContext.trackType !== "central") {
      navigate("/student/dashboard", { replace: true });
    }
  }, [navigate, selectionContext]);

  if (!selectionContext || selectionContext.trackType !== "central") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-5%] top-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute left-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-[80px]" />
      </div>

      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/student/dashboard")}
              className="gap-2 text-slate-500 hover:text-slate-800"
            >
              <ChevronRight className="h-5 w-5" />
              العودة
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="text-right">
                <h1 className="text-lg font-bold text-slate-800">ألعاب التحدي</h1>
                <p className="text-xs text-slate-500">اختر لعبتك المفضلة</p>
              </div>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-12 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-2 shadow-sm">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600">
              5 ألعاب تفاعلية ممتعة
            </span>
          </div>

          <h2 className="text-4xl font-black text-slate-900 md:text-5xl">
            اختر{" "}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              تحديك
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            مجموعة متنوعة من الألعاب التعليمية المصممة لتعزيز مهاراتك بطريقة
            ممتعة مع الالتزام الكامل بالسياق الدراسي الذي اخترته.
          </p>
        </div>

        <div className="mx-auto mb-8 max-w-4xl rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-200/60">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-slate-900 px-4 py-1 text-white hover:bg-slate-900">
              السياق الحالي
            </Badge>
            <span className="text-sm text-slate-600">
              {getSelectionDisplayText(selectionContext)}
            </span>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game, idx) => (
            <div
              key={game.id}
              onClick={() => navigate(game.path)}
              className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-5`}
              />
              <div
                className={`absolute left-0 top-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r ${game.gradient} transition-transform duration-500 group-hover:scale-x-100`}
              />

              <div
                className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${game.gradient} ${game.shadow} text-white shadow-lg transition-all duration-300 group-hover:rotate-6 group-hover:scale-110`}
              >
                {game.icon}
              </div>

              <div className="relative z-10">
                <h3 className="mb-2 text-xl font-bold text-slate-800 group-hover:text-slate-900">
                  {game.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  {game.description}
                </p>

                <ul className="mb-6 space-y-2">
                  {game.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-xs text-slate-600"
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${game.dotClass}`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 group-hover:-translate-y-[2px] group-hover:shadow-xl ${game.gradient} ${game.shadow}`}
                >
                  <Zap className="h-4 w-4" />
                  ابدأ اللعب
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-transparent opacity-50 transition-transform duration-500 group-hover:scale-150" />
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <div className="inline-flex items-center gap-8 rounded-2xl border border-slate-100 bg-white px-8 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <Brain className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">تعزيز الذكاء</div>
                <div className="font-bold text-slate-800">تحدي ذهني</div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">تقييم دقيق</div>
                <div className="font-bold text-slate-800">نتائج فورية</div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">نقاط ومكافآت</div>
                <div className="font-bold text-slate-800">تنافس شريف</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
