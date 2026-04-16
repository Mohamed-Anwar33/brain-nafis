import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  FileQuestion,
  Gamepad2,
  LayoutList,
  Puzzle,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

interface Stats {
  totalQuestions: number;
  activeQuestions: number;
  centralExamQuestions: number;
  speedQuestions: number;
  matchingQuestions: number;
  orderingQuestions: number;
  wheelQuestions: number;
  stagesQuestions: number;
  totalAttempts: number;
  examAttempts: number;
  gameAttempts: number;
  averageScore: number;
  requiredQuestions: number;
  activityAttempts: {
    quickQuiz: number;
    centralExam: number;
    wheelScience: number;
    speed: number;
    matching: number;
    ordering: number;
    stages: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    activeQuestions: 0,
    centralExamQuestions: 0,
    speedQuestions: 0,
    matchingQuestions: 0,
    orderingQuestions: 0,
    wheelQuestions: 0,
    stagesQuestions: 0,
    totalAttempts: 0,
    examAttempts: 0,
    gameAttempts: 0,
    averageScore: 0,
    requiredQuestions: 20,
    activityAttempts: {
      quickQuiz: 0,
      centralExam: 0,
      wheelScience: 0,
      speed: 0,
      matching: 0,
      ordering: 0,
      stages: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const countRows = async (
      table: string,
      applyFilters?: (query: any) => any,
    ) => {
      let query = supabase.from(table).select("*", { count: "exact", head: true });
      if (applyFilters) {
        query = applyFilters(query);
      }

      const { count, error } = await query;
      if (error) {
        console.warn(`Count failed for ${table}:`, error.message);
        return 0;
      }

      return count || 0;
    };

    const fetchStats = async () => {
      try {
        const [
          totalQuestions,
          activeQuestions,
          centralExamQuestions,
          speedQuestions,
          matchingQuestions,
          orderingQuestions,
          wheelQuestions,
          stagesQuestions,
          examAttemptsResponse,
          gameAttemptsResponse,
          settingsResponse,
        ] = await Promise.all([
          countRows("questions"),
          countRows("questions", (query) => query.eq("active", true)),
          countRows("central_exam_questions", (query) => query.eq("active", true)),
          countRows("speed_challenge_questions", (query) => query.eq("is_active", true)),
          countRows("matching_game_questions", (query) => query.eq("is_active", true)),
          countRows("ordering_game_questions", (query) => query.eq("is_active", true)),
          countRows("wheel_section_questions", (query) => query.eq("is_active", true)),
          countRows("stages_game_questions", (query) => query.eq("is_active", true)),
          supabase.from("attempts").select("score, question_count, finished_at"),
          supabase.from("game_attempts").select("game_type, score, total_questions, correct_count, metadata"),
          supabase.from("settings").select("exam_question_count").eq("id", 1).maybeSingle(),
        ]);

        const examAttempts = examAttemptsResponse.data || [];
        const gameAttempts = gameAttemptsResponse.data || [];

        const examPercentages = examAttempts
          .filter((attempt: any) => attempt.finished_at && attempt.question_count > 0)
          .map((attempt: any) => (attempt.score / attempt.question_count) * 100);

        const gamePercentages = gameAttempts
          .filter((attempt: any) => attempt.total_questions > 0)
          .map((attempt: any) => {
            const metadata =
              attempt.metadata && typeof attempt.metadata === "object" ? attempt.metadata : {};
            if (typeof metadata.percentage === "number") {
              return metadata.percentage;
            }
            return (attempt.correct_count / attempt.total_questions) * 100;
          });

        const allPercentages = [...examPercentages, ...gamePercentages];
        const averageScore =
          allPercentages.length > 0
            ? Math.round(allPercentages.reduce((sum, value) => sum + value, 0) / allPercentages.length)
            : 0;

        setStats({
          totalQuestions,
          activeQuestions,
          centralExamQuestions,
          speedQuestions,
          matchingQuestions,
          orderingQuestions,
          wheelQuestions,
          stagesQuestions,
          totalAttempts: examAttempts.length + gameAttempts.length,
          examAttempts: examAttempts.length,
          gameAttempts: gameAttempts.length,
          averageScore,
          requiredQuestions: settingsResponse.data?.exam_question_count || 20,
          activityAttempts: {
            quickQuiz: examAttempts.length,
            centralExam: gameAttempts.filter((attempt: any) => attempt.game_type === "central_exam").length,
            wheelScience: gameAttempts.filter((attempt: any) => attempt.game_type === "wheel_science").length,
            speed: gameAttempts.filter((attempt: any) => attempt.game_type === "speed").length,
            matching: gameAttempts.filter((attempt: any) => attempt.game_type === "matching").length,
            ordering: gameAttempts.filter((attempt: any) => attempt.game_type === "ordering").length,
            stages: gameAttempts.filter((attempt: any) => attempt.game_type === "stages").length,
          },
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const overviewCards = [
    {
      title: "بنك الأسئلة",
      value: stats.totalQuestions,
      icon: FileQuestion,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "الأسئلة النشطة",
      value: stats.activeQuestions,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "إجمالي المحاولات",
      value: stats.totalAttempts,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "متوسط النتائج",
      value: `${stats.averageScore}%`,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  const questionCards = [
    { title: "المركزي", value: stats.centralExamQuestions, icon: Target, className: "border-indigo-100 bg-indigo-50/30", iconClass: "bg-indigo-100 text-indigo-600", textClass: "text-indigo-700" },
    { title: "السرعة", value: stats.speedQuestions, icon: Timer, className: "border-amber-100 bg-amber-50/30", iconClass: "bg-amber-100 text-amber-600", textClass: "text-amber-700" },
    { title: "المطابقة", value: stats.matchingQuestions, icon: Gamepad2, className: "border-purple-100 bg-purple-50/30", iconClass: "bg-purple-100 text-purple-600", textClass: "text-purple-700" },
    { title: "الترتيب", value: stats.orderingQuestions, icon: Puzzle, className: "border-cyan-100 bg-cyan-50/30", iconClass: "bg-cyan-100 text-cyan-600", textClass: "text-cyan-700" },
    { title: "العجلة", value: stats.wheelQuestions, icon: Sparkles, className: "border-rose-100 bg-rose-50/30", iconClass: "bg-rose-100 text-rose-600", textClass: "text-rose-700" },
    { title: "المراحل", value: stats.stagesQuestions, icon: LayoutList, className: "border-sky-100 bg-sky-50/30", iconClass: "bg-sky-100 text-sky-600", textClass: "text-sky-700" },
  ];

  const attemptCards = [
    { title: "الاختبار السريع", value: stats.activityAttempts.quickQuiz, icon: FileQuestion, className: "border-blue-100 bg-blue-50/30", iconClass: "bg-blue-100 text-blue-600", textClass: "text-blue-700" },
    { title: "الاختبار المركزي", value: stats.activityAttempts.centralExam, icon: Target, className: "border-indigo-100 bg-indigo-50/30", iconClass: "bg-indigo-100 text-indigo-600", textClass: "text-indigo-700" },
    { title: "عجلة العلوم", value: stats.activityAttempts.wheelScience, icon: Sparkles, className: "border-rose-100 bg-rose-50/30", iconClass: "bg-rose-100 text-rose-600", textClass: "text-rose-700" },
    { title: "تحدي السرعة", value: stats.activityAttempts.speed, icon: Timer, className: "border-amber-100 bg-amber-50/30", iconClass: "bg-amber-100 text-amber-600", textClass: "text-amber-700" },
    { title: "المطابقة", value: stats.activityAttempts.matching, icon: Gamepad2, className: "border-purple-100 bg-purple-50/30", iconClass: "bg-purple-100 text-purple-600", textClass: "text-purple-700" },
    { title: "الترتيب", value: stats.activityAttempts.ordering, icon: Puzzle, className: "border-cyan-100 bg-cyan-50/30", iconClass: "bg-cyan-100 text-cyan-600", textClass: "text-cyan-700" },
    { title: "المراحل", value: stats.activityAttempts.stages, icon: LayoutList, className: "border-sky-100 bg-sky-50/30", iconClass: "bg-sky-100 text-sky-600", textClass: "text-sky-700" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">ملخص حي لأسئلة الموقع ومحاولات الطلاب في كل الأنشطة الحالية</p>
      </div>

      {!isLoading && stats.activeQuestions < stats.requiredQuestions && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-destructive">تنبيه: عدد أسئلة الاختبار السريع غير كافٍ</h3>
            <p className="text-sm text-destructive/90 mt-1">
              عدد الأسئلة النشطة ({stats.activeQuestions}) أقل من العدد المطلوب للاختبار ({stats.requiredQuestions}).
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title} className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? "..." : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>أسئلة الأنشطة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          {questionCards.map((card) => (
            <div key={card.title} className={`rounded-2xl border p-4 ${card.className}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.iconClass}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-sm text-muted-foreground">{card.title}</div>
              <div className={`text-3xl font-black ${card.textClass}`}>{isLoading ? "..." : card.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>المحاولات حسب النشاط</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {attemptCards.map((card) => (
            <div key={card.title} className={`rounded-2xl border p-4 ${card.className}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.iconClass}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-sm text-muted-foreground">{card.title}</div>
              <div className={`text-3xl font-black ${card.textClass}`}>{isLoading ? "..." : card.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>ملخص النتائج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-muted-foreground">محاولات الاختبار السريع</span>
              <span className="font-bold text-slate-800">{isLoading ? "..." : stats.examAttempts}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-muted-foreground">محاولات الألعاب والأنشطة</span>
              <span className="font-bold text-slate-800">{isLoading ? "..." : stats.gameAttempts}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-muted-foreground">إجمالي المحاولات</span>
              <span className="font-bold text-slate-800">{isLoading ? "..." : stats.totalAttempts}</span>
            </div>
            
            <a
              href="/admin/results"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 p-3 font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Trophy className="w-5 h-5" />
              عرض صفحة النتائج بالتفصيل
            </a>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>البدء السريع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <a
                href="/admin/questions"
                className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
              >
                <FileQuestion className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold">إدارة الأسئلة</h3>
                <p className="text-sm text-muted-foreground mt-1">إضافة وتعديل وحذف أسئلة الاختبار السريع</p>
              </a>
              <a
                href="/admin/results"
                className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
              >
                <Trophy className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-semibold">النتائج</h3>
                <p className="text-sm text-muted-foreground mt-1">مراجعة النتائج المرسلة من كل الأنشطة</p>
              </a>
              <a
                href="/admin/settings"
                className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
              >
                <TrendingUp className="w-8 h-8 text-accent mb-3" />
                <h3 className="font-semibold">الإعدادات</h3>
                <p className="text-sm text-muted-foreground mt-1">ضبط عدد الأسئلة والبريد والتنبيهات</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
