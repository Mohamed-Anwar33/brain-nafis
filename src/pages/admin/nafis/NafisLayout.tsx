import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileQuestion,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Gamepad2,
  Puzzle,
  Timer,
  Sparkles,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NafisLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
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
          console.error("Unauthorized access attempt", error);
          await supabase.auth.signOut();
          navigate("/admin/login");
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Auth check failed", err);
        navigate("/admin/login");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { path: "/admin/nafis", icon: LayoutDashboard, label: "لوحة التحكم" },
    { path: "/admin/nafis/questions", icon: FileQuestion, label: "بنك الأسئلة" },
    { path: "/admin/nafis/matching", icon: Gamepad2, label: "لعبة المطابقة" },
    { path: "/admin/nafis/ordering", icon: Puzzle, label: "لغز الترتيب" },
    { path: "/admin/nafis/speed", icon: Timer, label: "تحدي السرعة" },
    { path: "/admin/nafis/wheel", icon: Sparkles, label: "عجلة العلوم" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-card border-b border-border p-4 flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">نظام SCIRISE (نافس)</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 right-0 z-40 w-72 bg-card border-l border-border transition-transform duration-300",
          "lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-slate-800">نظام SCIRISE (نافس)</h1>
                  <p className="text-xs text-slate-500">إدارة الأسئلة والألعاب</p>
                </div>
              </div>
              
              {/* Back to system selector */}
              <Link 
                to="/admin/system-selector"
                className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لاختيار النظام</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 mt-4">
              {navItems.map((item) => {
                const isActive =
                  item.path === "/admin/nafis"
                    ? location.pathname === item.path
                    : location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen min-w-0 w-full overflow-x-hidden">
          <div className="p-4 lg:p-8 w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
