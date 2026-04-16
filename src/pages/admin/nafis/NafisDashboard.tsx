import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  CheckCircle,
  FileQuestion,
  Gamepad2,
  LayoutList,
  Puzzle,
  Sparkles,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  totalQuestions: number;
  activeQuestions: number;
  matchingQuestions: number;
  orderingQuestions: number;
  speedQuestions: number;
  wheelSections: number;
  stagesQuestions: number;
  totalAttempts: number;
  gameAttempts: number;
}

export default function NafisDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    activeQuestions: 0,
    matchingQuestions: 0,
    orderingQuestions: 0,
    speedQuestions: 0,
    wheelSections: 0,
    stagesQuestions: 0,
    totalAttempts: 0,
    gameAttempts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          totalQuestions,
          activeQuestions,
          matchingQuestions,
          orderingQuestions,
          speedQuestions,
          wheelSections,
          stagesQuestions,
          gameAttemptsResponse,
        ] = await Promise.all([
          // Questions - Nafis only (track_type = 'nafis' or null)
          supabase.from("questions").select("*", { count: "exact", head: true })
            .or('track_type.eq.nafis,track_type.is.null'),
          supabase.from("questions").select("*", { count: "exact", head: true })
            .eq("active", true)
            .or('track_type.eq.nafis,track_type.is.null'),
          // Games - Nafis only
          supabase.from("matching_game_questions").select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .or('track_type.eq.nafis,track_type.is.null'),
          supabase.from("ordering_game_questions").select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .or('track_type.eq.nafis,track_type.is.null'),
          supabase.from("speed_challenge_questions").select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .or('track_type.eq.nafis,track_type.is.null'),
          supabase.from("wheel_sections").select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .or('track_type.eq.nafis,track_type.is.null'),
          supabase.from("stages_game_questions").select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .or('track_type.eq.nafis,track_type.is.null'),
          // Game attempts for Nafis games
          supabase.from("game_attempts").select("*", { count: "exact", head: true })
            .in("game_type", ["matching", "ordering", "speed", "wheel_science", "stages"]),
        ]);

        setStats({
          totalQuestions: totalQuestions.count || 0,
          activeQuestions: activeQuestions.count || 0,
          matchingQuestions: matchingQuestions.count || 0,
          orderingQuestions: orderingQuestions.count || 0,
          speedQuestions: speedQuestions.count || 0,
          wheelSections: wheelSections.count || 0,
          stagesQuestions: stagesQuestions.count || 0,
          totalAttempts: (gameAttemptsResponse.count || 0),
          gameAttempts: gameAttemptsResponse.count || 0,
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
      active: stats.activeQuestions,
      icon: FileQuestion,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/nafis/questions"
    },
    {
      title: "الأسئلة النشطة",
      value: stats.activeQuestions,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      href: "/admin/nafis/questions"
    },
    {
      title: "محاولات الألعاب",
      value: stats.gameAttempts,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
      href: "#"
    },
  ];

  const gameCards = [
    { 
      title: "المطابقة", 
      value: stats.matchingQuestions, 
      icon: Gamepad2, 
      className: "border-purple-100 bg-purple-50/30", 
      iconClass: "bg-purple-100 text-purple-600", 
      textClass: "text-purple-700",
      href: "/admin/nafis/matching"
    },
    { 
      title: "الترتيب", 
      value: stats.orderingQuestions, 
      icon: Puzzle, 
      className: "border-cyan-100 bg-cyan-50/30", 
      iconClass: "bg-cyan-100 text-cyan-600", 
      textClass: "text-cyan-700",
      href: "/admin/nafis/ordering"
    },
    { 
      title: "السرعة", 
      value: stats.speedQuestions, 
      icon: Timer, 
      className: "border-amber-100 bg-amber-50/30", 
      iconClass: "bg-amber-100 text-amber-600", 
      textClass: "text-amber-700",
      href: "/admin/nafis/speed"
    },
    { 
      title: "العجلة", 
      value: stats.wheelSections, 
      icon: Sparkles, 
      className: "border-rose-100 bg-rose-50/30", 
      iconClass: "bg-rose-100 text-rose-600", 
      textClass: "text-rose-700",
      href: "/admin/nafis/wheel"
    },
    { 
      title: "المراحل", 
      value: stats.stagesQuestions, 
      icon: LayoutList, 
      className: "border-sky-100 bg-sky-50/30", 
      iconClass: "bg-sky-100 text-sky-600", 
      textClass: "text-sky-700",
      href: "/admin/nafis/stages"
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">نظام نافس</h1>
          <p className="text-slate-500">ملخص حي للأسئلة والألعاب في النظام العام</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {overviewCards.map((card) => (
          <Link key={card.title} to={card.href}>
            <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoading ? "..." : card.value}</div>
                {card.active !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.active} نشط من أصل {card.value}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Games Section */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">ألعاب نافس</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">إدارة الألعاب التفاعلية في النظام العام</p>
          </div>
          <Trophy className="w-6 h-6 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {gameCards.map((card) => (
              <Link key={card.title} to={card.href}>
                <div className={`rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer ${card.className}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.iconClass}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-muted-foreground">{card.title}</div>
                  <div className={`text-3xl font-black ${card.textClass}`}>{isLoading ? "..." : card.value}</div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>البدء السريع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Link
                to="/admin/nafis/questions"
                className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
              >
                <FileQuestion className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold">إدارة الأسئلة</h3>
                <p className="text-sm text-muted-foreground mt-1">إضافة وتعديل وحذف أسئلة الاختبار</p>
              </Link>
              <Link
                to="/admin/nafis/matching"
                className="p-4 rounded-xl border border-border hover:border-purple-500/50 hover:bg-purple-50 transition-colors flex flex-col items-center text-center sm:items-start sm:text-right"
              >
                <Gamepad2 className="w-8 h-8 text-purple-500 mb-3" />
                <h3 className="font-semibold">لعبة المطابقة</h3>
                <p className="text-sm text-muted-foreground mt-1">إدارة أسئلة المطابقة</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated bg-gradient-to-br from-slate-50 to-white">
          <CardHeader>
            <CardTitle>معلومات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">نظام نافس</p>
                <p className="text-xs text-muted-foreground">النظام العام للأسئلة والألعاب</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              هذا النظام يحتوي على الأسئلة والألعاب العامة التي لا تتطلب تحديد مادة أو تخصص محدد. 
              الطلاب يمكنهم الاستمتاع بهذه الألعاب بشكل عام.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
