import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, FileQuestion, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { getCentralExamConfig } from "@/services/centralExamService";

export default function CentralExamDashboard() {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    activeQuestions: 0,
    isExamActive: false,
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get exam config
      const config = await getCentralExamConfig();
      
      // Get questions count
      const { data: questionsData, error: questionsError } = await supabase
        .from("central_exam_questions")
        .select("id, active", { count: "exact" });

      if (questionsError) throw questionsError;

      const totalQuestions = questionsData?.length || 0;
      const activeQuestions = questionsData?.filter(q => q.active).length || 0;

      setStats({
        totalQuestions,
        activeQuestions,
        isExamActive: config?.is_active || false,
        loading: false
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">الاختبار المركزي</h1>
          <p className="text-slate-500">نظام الاختبارات المقررة والمخصصة</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <FileQuestion className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">{stats.totalQuestions}</div>
                <div className="text-sm text-slate-600">إجمالي الأسئلة</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.activeQuestions}</div>
                <div className="text-sm text-slate-600">الأسئلة النشطة</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-600">{stats.totalQuestions - stats.activeQuestions}</div>
                <div className="text-sm text-slate-600">الأسئلة المخفية</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${stats.isExamActive ? 'from-green-50 to-green-100/50 border-green-200' : 'from-amber-50 to-amber-100/50 border-amber-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stats.isExamActive ? 'bg-green-500/10' : 'bg-amber-500/10'} flex items-center justify-center`}>
                <Target className={`w-5 h-5 ${stats.isExamActive ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${stats.isExamActive ? 'text-green-600' : 'text-amber-600'}`}>
                  {stats.isExamActive ? 'مفعل' : 'معطل'}
                </div>
                <div className="text-sm text-slate-600">حالة الاختبار</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-indigo-600" />
              إدارة الأسئلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm leading-relaxed">
              قم بإضافة وإدارة أسئلة الاختبار المركزي. يمكنك تحديد المادة والصف والتخصص لكل سؤال.
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              الإعدادات العامة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm leading-relaxed">
              تحكم في إعدادات الاختبار المركزي، تفعيل/تعطيل الظهور للطلاب، وتخصيص العنوان والوصف.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
