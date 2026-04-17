import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Target, ArrowLeft, Sparkles, BookOpen, Gamepad2, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminSystemSelector() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (error || !roleData || roleData.role !== 'admin') {
        await supabase.auth.signOut();
        navigate("/admin/login");
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-800">براين ساينس</h1>
              <p className="text-xs text-slate-500">لوحة الإدارة - اختيار النظام</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Title Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              مرحباً بك في لوحة التحكم
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              اختر النظام الذي تريد إدارته
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              كل نظام له إعداداته وأسئلته وألعابه المستقلة. اختر النظام المناسب لبدء الإدارة.
            </p>
          </div>

          {/* Systems Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Nafis System Card */}
            <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
                  onClick={() => navigate('/admin/nafis')}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardContent className="relative p-8">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-primary transition-colors">
                      نظام براين ساينس
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      النظام الأساسي للأسئلة والألعاب العامة. يحتوي على بنك الأسئلة وألعاب: المطابقة، الترتيب، السرعة، المراحل، والعجلة.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        بنك الأسئلة
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        5 ألعاب
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        أسئلة عامة
                      </span>
                    </div>

                    <Button className="btn-primary-gradient w-full gap-2">
                      دخول نظام براين ساينس
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Central Exam System Card */}
            <Card className="group relative overflow-hidden border-2 border-transparent hover:border-indigo-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer"
                  onClick={() => navigate('/admin/central-exam')}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardContent className="relative p-8">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                      الاختبار المركزي
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      نظام متقدم للاختبارات المقررة. يدعم تحديد المادة والتخصص (المجال) لكل سؤال ولعبة.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        أسئلة مقررة
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        تحديد المادة
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        تحديد التخصص
                      </span>
                    </div>

                    <Button className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700">
                      دخول الاختبار المركزي
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Results Card */}
            <Card className="group relative overflow-hidden border-2 border-transparent hover:border-amber-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer"
                  onClick={() => navigate('/admin/results')}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardContent className="relative p-8">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
                      نتائج الطلاب
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      عرض ومتابعة جميع نتائج الطلاب في الاختبارات والألعاب من النظامين.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        كل النتائج
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        بحث بالاسم
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        حذف وتصدير
                      </span>
                    </div>

                    <Button className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                      عرض النتائج
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
