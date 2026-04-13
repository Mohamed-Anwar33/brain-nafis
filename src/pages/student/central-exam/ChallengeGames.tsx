import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  Gamepad2, 
  Puzzle, 
  CircleDot, 
  ListOrdered,
  Sparkles,
  Target,
  Zap,
  Brain,
  Trophy
} from "lucide-react";

interface GameCard {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
  path: string;
  color: string;
}

export default function ChallengeGames() {
  const navigate = useNavigate();

  const games: GameCard[] = [
    {
      id: "wheel",
      title: "عجلة العلوم الدوارة",
      description: "اختبر معلوماتك في العلوم مع العجلة الذكية - أحياء، كيمياء، فيزياء وعلوم عامة",
      features: [
        "4 أقسام علمية متخصصة",
        "نظام إجابة صارم (لازم تجاوب صح)",
        "خصم نقاط عند الإجابة الخاطئة"
      ],
      icon: <Sparkles className="w-10 h-10" />,
      gradient: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-500/30",
      path: "/games/wheel",
      color: "rose"
    },
    {
      id: "matching",
      title: "لعبة المطابقة",
      description: "صل بين العناصر المتشابهة في أسرع وقت ممكن",
      features: [
        "تطوير مهارات الملاحظة",
        "تعزيز الذاكرة البصرية",
        "تحدي ضد الزمن"
      ],
      icon: <Puzzle className="w-10 h-10" />,
      gradient: "from-purple-500 to-violet-600",
      shadow: "shadow-purple-500/30",
      path: "/games/matching",
      color: "purple"
    },
    {
      id: "ordering",
      title: "لعبة السحب والإفلات",
      description: "اسحب العناصر ورتبها في الترتيب الصحيح",
      features: [
        "تعلم التسلسل المنطقي",
        "تفاعل سحب وإفلات",
        "تعزيز الفهم العلمي"
      ],
      icon: <Gamepad2 className="w-10 h-10" />,
      gradient: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/30",
      path: "/games/ordering",
      color: "emerald"
    },
    {
      id: "stages",
      title: "ترتيب المراحل",
      description: "رتب المراحل العلمية بالترتيب الصحيح",
      features: [
        "فهم المراحل العلمية",
        "تسلسل منطقي دقيق",
        "تقييم المعرفة"
      ],
      icon: <ListOrdered className="w-10 h-10" />,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/30",
      path: "/games/stages",
      color: "blue"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[80px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/central-exam")}
              className="text-slate-500 hover:text-slate-800 gap-2"
            >
              <ChevronRight className="w-5 h-5" />
              العودة
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-800">ألعاب التحدي</h1>
                <p className="text-xs text-slate-500">اختر لعبتك المفضلة</p>
              </div>
            </div>

            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600">4 ألعاب تفاعلية ممتعة</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900">
            اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">تحديك</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            مجموعة متنوعة من الألعاب التعليمية المصممة لتعزيز مهاراتك بطريقة ممتعة وشيقة
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {games.map((game, idx) => (
            <div
              key={game.id}
              onClick={() => navigate(game.path)}
              className={`
                group relative bg-white rounded-[2rem] p-6 border border-slate-100 
                shadow-lg shadow-slate-200/50 hover:shadow-2xl 
                hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden
                animate-in slide-in-from-bottom-4 fade-in
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
              
              {/* Top Decoration */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${game.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>

              {/* Icon */}
              <div className={`
                w-20 h-20 rounded-2xl bg-gradient-to-br ${game.gradient} ${game.shadow}
                flex items-center justify-center mb-6 text-white
                transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300
                shadow-lg
              `}>
                {game.icon}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900">
                  {game.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                  {game.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {game.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${game.color}-500`}></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button className={`
                  w-full py-3 px-6 rounded-xl font-bold text-sm
                  bg-gradient-to-r ${game.gradient} text-white
                  ${game.shadow} shadow-lg
                  transform transition-all duration-300
                  group-hover:translate-y-[-2px] group-hover:shadow-xl
                  active:translate-y-0 active:shadow-md
                  flex items-center justify-center gap-2
                `}>
                  <Zap className="w-4 h-4" />
                  ابدأ اللعب
                </button>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-100 to-transparent rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 flex justify-center">
          <div className="inline-flex items-center gap-8 bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">تعزيز الذكاء</div>
                <div className="font-bold text-slate-800">تحدي ذهني</div>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">تقييم دقيق</div>
                <div className="font-bold text-slate-800">نتائج فورية</div>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-600" />
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
