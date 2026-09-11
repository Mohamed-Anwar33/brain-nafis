import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, LogOut, BookOpen, Target, Compass } from "lucide-react";
import AdminResults from "./AdminResults";

export default function AdminResultsPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/system-selector')}
              className="gap-2 text-slate-700 hover:text-slate-900 font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              العودة لاختيار النظام
            </Button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-800 leading-none">براين ساينس</h1>
                <p className="text-[11px] text-slate-400 mt-0.5">نتائج الطلاب والتقارير</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/nafis')}
              className="gap-1.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>نظام نافس</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/central-exam')}
              className="gap-1.5 text-xs text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>الاختبار المركزي</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/treasure')}
              className="gap-1.5 text-xs text-slate-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>مغامرة الكنز</span>
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto p-6 lg:p-8" dir="rtl">
          <AdminResults />
        </div>
      </main>
    </div>
  );
}
