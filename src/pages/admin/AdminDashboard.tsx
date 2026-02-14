import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Users, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";

interface Stats {
  totalQuestions: number;
  activeQuestions: number;
  speedQuestions: number;
  matchingQuestions: number;
  orderingQuestions: number;
  totalAttempts: number;
  averageScore: number;
  requiredQuestions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    activeQuestions: 0,
    speedQuestions: 0,
    matchingQuestions: 0,
    orderingQuestions: 0,
    totalAttempts: 0,
    averageScore: 0,
    requiredQuestions: 20,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get questions count (Regular)
        const { count: totalQuestions } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true });

        const { count: activeQuestions } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("active", true);

        // Get Game Question Counts
        const { count: speedQuestions } = await supabase
          .from("speed_challenge_questions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        const { count: matchingQuestions } = await supabase
          .from("matching_game_questions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        const { count: orderingQuestions } = await supabase
          .from("ordering_game_questions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Get attempts stats
        const { data: attempts } = await supabase
          .from("attempts")
          .select("score, question_count")
          .not("finished_at", "is", null);

        const totalAttempts = attempts?.length || 0;
        const averageScore = attempts && attempts.length > 0
          ? attempts.reduce((acc, a) => acc + (a.score / a.question_count) * 100, 0) / attempts.length
          : 0;

        // Get settings
        const { data: settings } = await supabase
          .from("settings")
          .select("exam_question_count")
          .eq("id", 1)
          .single();

        setStats({
          totalQuestions: totalQuestions || 0,
          activeQuestions: activeQuestions || 0,
          speedQuestions: speedQuestions || 0,
          matchingQuestions: matchingQuestions || 0,
          orderingQuestions: orderingQuestions || 0,
          totalAttempts,
          averageScore: Math.round(averageScore),
          requiredQuestions: settings?.exam_question_count || 20,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "بنك الأسئلة",
      value: stats.totalQuestions,
      icon: FileQuestion,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">مرحباً بك في لوحة إدارة بنك الاختبارات</p>
      </div>

      {/* Warning Alert */}
      {!isLoading && stats.activeQuestions < stats.requiredQuestions && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-destructive">تنبيه هام: عدد الأسئلة غير كافٍ!</h3>
            <p className="text-sm text-destructive/90 mt-1">
              عدد الأسئلة النشطة ({stats.activeQuestions}) أقل من العدد المطلوب للاختبار ({stats.requiredQuestions}).
              <br />
              <span className="font-semibold">لن يتمكن الطلاب من بدء الاختبار وسيظهر لهم خطأ.</span>
              <br />
              يرجى تفعيل المزيد من الأسئلة أو تقليل عدد أسئلة الاختبار من الإعدادات.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "..." : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Game Stats */}
        <Card className="card-elevated border-indigo-100 bg-indigo-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تحدي السرعة</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><TrendingUp className="w-5 h-5" /></div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-indigo-700">{stats.speedQuestions}</div></CardContent>
        </Card>

        <Card className="card-elevated border-pink-100 bg-pink-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المطابقة</CardTitle>
            <div className="p-2 rounded-lg bg-pink-100 text-pink-600"><CheckCircle className="w-5 h-5" /></div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-pink-700">{stats.matchingQuestions}</div></CardContent>
        </Card>

        <Card className="card-elevated border-orange-100 bg-orange-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الترتيب</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><FileQuestion className="w-5 h-5" /></div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-orange-700">{stats.orderingQuestions}</div></CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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
              <p className="text-sm text-muted-foreground mt-1">
                إضافة وتعديل وحذف الأسئلة
              </p>
            </a>
            <a
              href="/admin/settings"
              className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
            >
              <TrendingUp className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold">الإعدادات</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ضبط عدد أسئلة الاختبار
              </p>
            </a>
            <a
              href="/"
              target="_blank"
              className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
            >
              <Users className="w-8 h-8 text-success mb-3" />
              <h3 className="font-semibold">صفحة الطلاب</h3>
              <p className="text-sm text-muted-foreground mt-1">
                معاينة صفحة الاختبار
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
