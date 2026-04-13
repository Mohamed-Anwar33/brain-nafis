import { Outlet, NavLink } from "react-router-dom";
import { Settings, FileQuestion, CircleDot, ListOrdered } from "lucide-react";

export default function AdminCentralExamLayout() {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">الاختبار المركزي</h1>
        <p className="text-muted-foreground">صمم تجربة مذهلة وحصرية للطلاب لإجراء الاختبار المركزي الشامل.</p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-xl shadow-sm border flex flex-wrap items-center gap-1">
        <NavLink
          to="/admin/central-exam/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <Settings className="w-4 h-4" />
          الإعدادات العامة
        </NavLink>
        <NavLink
          to="/admin/central-exam/questions"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <FileQuestion className="w-4 h-4" />
          بنك الأسئلة المخصص
        </NavLink>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <NavLink
          to="/admin/central-exam/wheel"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <CircleDot className="w-4 h-4" />
          العجلة الدوارة
        </NavLink>
        <NavLink
          to="/admin/central-exam/stages"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <ListOrdered className="w-4 h-4" />
          ترتيب المراحل
        </NavLink>
      </div>

      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}
