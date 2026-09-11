import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Target, Zap, Trophy, Award, CheckCircle2 } from "lucide-react";
import { StudentProgressStats } from "@/services/leaderboardService";

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StudentProgressStats | null;
  studentName: string | null;
}

export function ProgressModal({
  isOpen,
  onClose,
  stats,
  studentName,
}: ProgressModalProps) {
  const score = stats?.totalScore || 0;
  const accuracy = stats?.accuracy || 0;
  const completedExams = stats?.completedExams || 0;
  const completedGames = stats?.completedGames || 0;
  const totalCompleted = stats?.totalCompleted || 0;
  const rank = stats?.rank;
  const isInTop10 = stats?.isInTop10;
  const pointsToTop10 = stats?.pointsToTop10 || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl" dir="rtl">
        <DialogHeader className="text-center space-y-3 mb-6">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            سجل تقدمي • <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">المستوى العلمي</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-md mx-auto">
            مؤشرات دقيقة لأدائك وإنجازاتك في الاختبارات والألعاب العلمية
          </p>
        </DialogHeader>

        {/* Student Highlight Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/50 border border-slate-200 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-bold text-slate-500">الطالب المتألق</span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">{studentName || "طالب براين ساينس"}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">حالة الترتيب:</span>
            <span className={`px-3 py-1 rounded-xl text-xs font-black ${
              isInTop10
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}>
              {rank ? `المركز #${rank}` : "بانتظار أول تحدٍ"}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 mb-6">
          {/* Card 1: Score */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-bold">مجموع النقاط</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{score}</p>
            <span className="text-[10px] font-bold text-slate-400">نقطة علمية مكتسبة</span>
          </div>

          {/* Card 2: Accuracy */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-bold">معدل الدقة</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{accuracy}%</p>
            <span className="text-[10px] font-bold text-slate-400">نسبة الإجابات الصحيحة</span>
          </div>

          {/* Card 3: Exams */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">الاختبارات</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{completedExams}</p>
            <span className="text-[10px] font-bold text-slate-400">اختبار مركزي ونافس مكتمل</span>
          </div>

          {/* Card 4: Games */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 text-fuchsia-600 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-bold">الألعاب</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{completedGames}</p>
            <span className="text-[10px] font-bold text-slate-400">تحديات ألعاب مجتازة</span>
          </div>
        </div>

        {/* Motivational Callout for Top 10 Entry */}
        {!isInTop10 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-200 text-center">
            <p className="text-xs sm:text-sm font-black text-amber-900 leading-relaxed">
              ⭐ ينقصك <span className="text-indigo-700 font-black">{pointsToTop10} نقطة</span> لدخول قائمة العشرة المتصدرين والحصول على شهادتك المعتمدة!
            </p>
          </div>
        )}

        {isInTop10 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 text-center">
            <p className="text-xs sm:text-sm font-black text-emerald-900 leading-relaxed">
              🎉 أنت أحد أبطال العشرة المتصدرين! شهادتك المعتمدة متاحة في قسم الشهادات.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
