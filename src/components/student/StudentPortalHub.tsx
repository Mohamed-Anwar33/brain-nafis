import { useState, useEffect } from "react";
import { Trophy, Award, TrendingUp, Sparkles, Lock, CheckCircle2 } from "lucide-react";
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

export interface StudentPortalHubProps {
  studentName?: string | null;
  className?: string;
}

export function StudentPortalHub({ studentName, className = "" }: StudentPortalHubProps) {
  const [top10, setTop10] = useState<LeaderboardStudent[]>([]);
  const [stats, setStats] = useState<StudentProgressStats | null>(null);
  const [activeModal, setActiveModal] = useState<
    "leaderboard" | "achievements" | "progress" | "certificates" | null
  >(null);
  const [resolvedStudentName, setResolvedStudentName] = useState<string | null>(studentName || null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      let activeName = studentName;
      if (!activeName || activeName === "طالب") {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const { data: profile } = await supabase
              .from("student_profiles")
              .select("full_name")
              .eq("id", session.user.id)
              .maybeSingle();
            if (profile?.full_name?.trim()) {
              activeName = profile.full_name.trim();
            } else if (session.user.user_metadata?.full_name?.trim()) {
              activeName = session.user.user_metadata.full_name.trim();
            }
          }
          if (!activeName || activeName === "طالب") {
            const localName =
              localStorage.getItem("student_name") ||
              sessionStorage.getItem("student_name");
            if (localName?.trim()) {
              activeName = localName.trim();
            }
          }
        } catch (e) {
          console.warn("Could not resolve student profile name", e);
        }
      }

      if (isMounted && activeName) {
        setResolvedStudentName(activeName);
      }

      const data = await getPlatformLeaderboard(activeName);
      if (isMounted) {
        setTop10(data.top10);
        setStats(data.currentStudentStats);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentName]);

  const handleOpen = (type: "leaderboard" | "achievements" | "progress" | "certificates") => {
    audioManager.playClick();
    setActiveModal(type);
  };

  const isInTop10 = stats?.isInTop10 || false;
  const unlockedBadgesCount = stats?.achievements.filter((a) => a.unlocked).length || 0;

  return (
    <section className={`w-full ${className || "mt-6 sm:mt-10 pt-6 border-t border-slate-200/80"}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            مركز التميز والتحفيز العلمي
          </h3>
        </div>
        <span className="text-xs font-bold text-slate-500">
          تتبع رتبتك • أوسمتك • شهاداتك
        </span>
      </div>

      {/* The 4 Grid Cards - Inspired by user request & screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Card 1: Leaderboard (المتصدرون) */}
        <button
          type="button"
          onClick={() => handleOpen("leaderboard")}
          className="group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-xl border-2 border-slate-200/80 hover:border-amber-400 shadow-sm hover:shadow-xl hover:-translate-y-1.5 active:scale-95 transition-all text-right flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center transition-all duration-300 shadow-2xs">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-black bg-amber-100/90 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
              أفضل 10 🏆
            </span>
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
              المتصدرون
            </h4>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
              لوحة شرف الأوائل
            </p>
          </div>
        </button>

        {/* Card 2: Achievements (الإنجازات) */}
        <button
          type="button"
          onClick={() => handleOpen("achievements")}
          className="group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-xl border-2 border-slate-200/80 hover:border-emerald-400 shadow-sm hover:shadow-xl hover:-translate-y-1.5 active:scale-95 transition-all text-right flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-black bg-emerald-100/90 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {unlockedBadgesCount} مكتسبة ⭐
            </span>
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
              الإنجازات
            </h4>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
              الأوسمة والشارات
            </p>
          </div>
        </button>

        {/* Card 3: My Progress (تقدمي) */}
        <button
          type="button"
          onClick={() => handleOpen("progress")}
          className="group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-xl border-2 border-slate-200/80 hover:border-blue-400 shadow-sm hover:shadow-xl hover:-translate-y-1.5 active:scale-95 transition-all text-right flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-black bg-blue-100/90 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-200">
              دقة {stats?.accuracy || 0}%
            </span>
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
              تقدمي
            </h4>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
              المستوى والدقة
            </p>
          </div>
        </button>

        {/* Card 4: Certificates (الشهادات - للمتصدرين فقط) */}
        <button
          type="button"
          onClick={() => handleOpen("certificates")}
          className={`group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-xl border-2 shadow-sm hover:shadow-xl hover:-translate-y-1.5 active:scale-95 transition-all text-right flex flex-col justify-between overflow-hidden ${
            isInTop10
              ? "border-amber-300 hover:border-amber-500 ring-2 ring-amber-400/20"
              : "border-slate-200/80 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xs ${
              isInTop10
                ? "bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-slate-950"
                : "bg-slate-100 text-slate-500"
            }`}>
              {isInTop10 ? <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" /> : <Lock className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border ${
              isInTop10
                ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {isInTop10 ? "متاحة لك 🏅" : "للمتصدرين 🔒"}
            </span>
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
              الشهادات
            </h4>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
              شهادات التقدير الرسمية
            </p>
          </div>
        </button>
      </div>

      {/* Modals */}
      <LeaderboardModal
        isOpen={activeModal === "leaderboard"}
        onClose={() => setActiveModal(null)}
        top10={top10}
        currentStudentName={resolvedStudentName}
        currentStudentRank={stats?.rank || null}
      />

      <AchievementsModal
        isOpen={activeModal === "achievements"}
        onClose={() => setActiveModal(null)}
        achievements={stats?.achievements || []}
        studentName={resolvedStudentName}
      />

      <ProgressModal
        isOpen={activeModal === "progress"}
        onClose={() => setActiveModal(null)}
        stats={stats}
        studentName={resolvedStudentName}
      />

      <CertificatesPortalModal
        isOpen={activeModal === "certificates"}
        onClose={() => setActiveModal(null)}
        studentName={resolvedStudentName}
        rank={stats?.rank || null}
        isInTop10={isInTop10}
        totalScore={stats?.totalScore || 0}
        pointsToTop10={stats?.pointsToTop10 || 0}
      />
    </section>
  );
}
