import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  TrendingUp,
  Trophy,
  Award,
  GraduationCap,
  Crown,
  Gamepad2,
  LogOut,
  Sparkles,
  X,
  User,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { audioManager } from "@/lib/audio";
import { supabase } from "@/integrations/supabase/client";
import {
  getPlatformLeaderboard,
  LeaderboardStudent,
  StudentProgressStats,
} from "@/services/leaderboardService";
import { LeaderboardModal } from "./LeaderboardModal";
import { AchievementsModal } from "./AchievementsModal";
import { ProgressModal } from "./ProgressModal";
import { CertificatesPortalModal } from "./CertificatesPortalModal";
import { isStudentFemale } from "@/lib/studentUtils";

export interface StudentSidebarProps {
  studentName?: string | null;
  activeItem?: "home" | "progress" | "achievements" | "badges" | "certificates" | "leaderboard" | "games";
  onNavigateHome?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export function StudentSidebar({
  studentName,
  activeItem = "home",
  onNavigateHome,
  isOpen,
  onClose,
  isOpenMobile,
  onCloseMobile,
  onLogout,
}: StudentSidebarProps) {
  const navigate = useNavigate();
  const [top10, setTop10] = useState<LeaderboardStudent[]>([]);
  const [stats, setStats] = useState<StudentProgressStats | null>(null);
  const [activeModal, setActiveModal] = useState<
    "leaderboard" | "achievements" | "progress" | "certificates" | null
  >(null);

  // Resolved menu open state
  const isMenuOpen = isOpen !== undefined ? isOpen : (isOpenMobile ?? false);
  const handleClose = useCallback(() => {
    if (onClose) onClose();
    if (onCloseMobile) onCloseMobile();
  }, [onClose, onCloseMobile]);

  const [resolvedName, setResolvedName] = useState<string>(
    studentName ||
      localStorage.getItem("student_name") ||
      sessionStorage.getItem("student_name") ||
      "طالب متميز"
  );

  useEffect(() => {
    if (studentName) {
      setResolvedName(studentName);
    }
  }, [studentName]);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await getPlatformLeaderboard(resolvedName);
        if (isMounted) {
          setTop10(data.top10);
          setStats(data.currentStudentStats);
        }
      } catch (err) {
        console.warn("Sidebar failed to load leaderboard stats", err);
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [resolvedName]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, handleClose]);

  // Gender detection for appropriate student avatar
  const isFemale = useMemo(() => isStudentFemale(resolvedName), [resolvedName]);

  const handleItemClick = (key: string) => {
    audioManager.playClick();
    handleClose();

    switch (key) {
      case "home":
        if (onNavigateHome) {
          onNavigateHome();
        } else {
          navigate("/student/dashboard");
        }
        break;
      case "progress":
        setActiveModal("progress");
        break;
      case "achievements":
      case "badges":
        setActiveModal("achievements");
        break;
      case "certificates":
        setActiveModal("certificates");
        break;
      case "leaderboard":
        setActiveModal("leaderboard");
        break;
      case "games":
        navigate("/student/games");
        break;
      case "logout":
        if (onLogout) {
          onLogout();
        } else {
          localStorage.removeItem("student_name");
          sessionStorage.removeItem("student_name");
          supabase.auth.signOut().finally(() => navigate("/"));
        }
        break;
      default:
        break;
    }
  };

  const navItems = [
    {
      key: "home",
      label: "الرئيسية",
      subtitle: "مسارات بنك نافس والمسار المركزي",
      icon: Home,
      iconBg: "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white",
      badge: "المسارات",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
      key: "leaderboard",
      label: "لوحة الصدارة",
      subtitle: "المتصدرون وقائمة شرف الأوائل",
      icon: Crown,
      iconBg: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
      badge: stats?.rank ? `#${stats.rank}` : "#1",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      key: "achievements",
      label: "إنجازاتي وأوسمتي",
      subtitle: "الأوسمة والشارات العلمية المكتسبة",
      icon: Trophy,
      iconBg: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950",
      badge: stats
        ? `${stats.achievements?.filter((a) => a.unlocked).length || 0} أوسمة`
        : "0 أوسمة",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      key: "progress",
      label: "مؤشر تقدمي",
      subtitle: "مستوى الدقة وإحصائيات الإنجاز",
      icon: TrendingUp,
      iconBg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      badge: stats ? `${stats.accuracy}% دقة` : "0% دقة",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      key: "certificates",
      label: "شهادات التقدير",
      subtitle: "جوازي الإلكتروني والشهادات الرسمية",
      icon: GraduationCap,
      iconBg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
      badge: "جوازي 🎓",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      key: "games",
      label: "الألعاب التفاعلية",
      subtitle: "4 ألعاب وتحديات علمية تفاعلية",
      icon: Gamepad2,
      iconBg: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
      badge: "4 ألعاب 🎮",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  return (
    <>
      {/* Smooth Dropdown Menu from Profile Button */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity cursor-pointer animate-in fade-in duration-200"
            onClick={handleClose}
            aria-label="إغلاق القائمة"
          />

          {/* Floating Dropdown Card smoothly descending from profile icon on the right */}
          <div
            className="fixed top-[4.25rem] sm:top-[4.5rem] right-2.5 sm:right-6 md:right-8 z-50 w-[calc(100vw-1.25rem)] sm:w-96 max-w-[380px] bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] border-2 border-slate-200/90 p-4 sm:p-5 flex flex-col justify-between max-h-[calc(100vh-5.5rem)] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 ease-out"
            dir="rtl"
            role="dialog"
            aria-label="قائمة الملف الشخصي والخدمات"
          >
            {/* Scrollable Main Area (Profile + Nav) */}
            <div className="flex-1 overflow-y-auto pr-1 pl-1 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {/* Drawer Header with Logo & Close button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-1">
                    <img src="/brain-science-logo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="font-black text-xs text-slate-900 block leading-tight">قائمة الخدمات والأنشطة</span>
                    <span className="text-[10px] font-bold text-indigo-600">اختر وجهتك التفاعلية 🎯</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer active:scale-95"
                  title="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Card: Clean, unclipped, full names */}
              <div className="p-3.5 rounded-3xl bg-gradient-to-br from-indigo-50/95 via-sky-50/80 to-emerald-50/85 border-2 border-indigo-100 shadow-xs flex items-center gap-3 relative overflow-hidden group">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-[2px] shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                      <span className="text-2xl select-none filter drop-shadow-xs">{isFemale ? "👩‍🎓" : "🧑‍🎓"}</span>
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-md">
                      طالب/ة متفوق/ة ⭐
                    </span>
                  </div>
                  <h3
                    className="text-sm sm:text-base font-black text-slate-900 mt-0.5 leading-snug break-words"
                    title={resolvedName}
                  >
                    {resolvedName}
                  </h3>
                  <p className="text-[10.5px] sm:text-[11px] font-bold text-slate-600 whitespace-nowrap mt-0.5">
                    المعلمة: أ/ هيفاء السلمي
                  </p>
                </div>
              </div>

              {/* Navigation List items styled as rich Select options */}
              <nav className="space-y-1.5 pt-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleItemClick(item.key)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-right transition-all duration-200 group cursor-pointer border ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-500/25 border-indigo-500 scale-[1.01]"
                          : "bg-white/80 hover:bg-indigo-50/60 text-slate-800 border-slate-100 hover:border-indigo-200/80 active:scale-[0.99]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0 shadow-2xs ${
                            isActive
                              ? "bg-white/20 text-white"
                              : item.iconBg
                          }`}
                        >
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs sm:text-sm font-black truncate ${isActive ? "text-white" : "text-slate-900 group-hover:text-indigo-700"}`}>
                            {item.label}
                          </span>
                          <span className={`text-[10px] font-bold truncate ${isActive ? "text-indigo-100" : "text-slate-400 group-hover:text-slate-500"}`}>
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 mr-1">
                        <span
                          className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-white/20 text-white border-white/30"
                              : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                        <ChevronLeft
                          className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${
                            isActive ? "text-white/80" : "text-slate-400 group-hover:text-indigo-600"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Fixed Bottom Footer Section: Platform Attribution & Logout */}
            <div className="space-y-2 pt-3 mt-2 border-t border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => handleItemClick("logout")}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-right font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200/60 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-black">تسجيل الخروج</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-rose-400 group-hover:-translate-x-1 transition-transform" />
              </button>

              {/* Small Platform Badge cleanly inside bounds */}
              <div className="text-center py-2 px-3 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                <p className="text-[10.5px] font-black text-slate-600">
                  منصة براين ساينس للتفوق 🚀
                </p>
                <p className="text-[9.5px] font-bold text-slate-400 mt-0.5">
                  المعلمة: أ/ هيفاء السلمي
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals integrated seamlessly */}
      <LeaderboardModal
        isOpen={activeModal === "leaderboard"}
        onClose={() => setActiveModal(null)}
        top10={top10}
        currentStudentName={resolvedName}
        currentStudentRank={stats?.rank ?? null}
      />

      <AchievementsModal
        isOpen={activeModal === "achievements"}
        onClose={() => setActiveModal(null)}
        achievements={stats?.achievements || []}
        studentName={resolvedName}
      />

      <ProgressModal
        isOpen={activeModal === "progress"}
        onClose={() => setActiveModal(null)}
        stats={stats}
        studentName={resolvedName}
      />

      <CertificatesPortalModal
        isOpen={activeModal === "certificates"}
        onClose={() => setActiveModal(null)}
        studentName={resolvedName}
        rank={stats?.rank ?? null}
        isInTop10={stats?.isInTop10 ?? false}
        totalScore={stats?.totalScore ?? 0}
        pointsToTop10={stats?.pointsToTop10 ?? 0}
      />
    </>
  );
}
