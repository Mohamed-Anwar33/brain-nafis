import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, CheckCircle2, Lock, Sparkles, Star } from "lucide-react";
import { AchievementItem } from "@/services/leaderboardService";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementItem[];
  studentName: string | null;
}

export function AchievementsModal({
  isOpen,
  onClose,
  achievements,
  studentName,
}: AchievementsModalProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl" dir="rtl">
        <DialogHeader className="text-center space-y-3 mb-6">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Award className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            سجل الإنجازات • <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">الأوسمة العلمية</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-md mx-auto">
            تتبع أوسمتك ومراحل تفوقك الأكاديمي التي حققتها في منصة براين ساينس
          </p>
        </DialogHeader>

        {/* Overview Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 mb-6">
          <div className="flex items-center justify-between text-xs font-black text-emerald-800 mb-2">
            <span>نسبة إكمال الأوسمة</span>
            <span>{unlockedCount} من {totalCount} وسام ({percentage}%)</span>
          </div>
          <div className="w-full h-3 bg-emerald-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {achievements.map((item) => {
            return (
              <div
                key={item.id}
                className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  item.unlocked
                    ? "bg-gradient-to-b from-white to-emerald-50/40 border-emerald-300 shadow-sm"
                    : "bg-slate-50/70 border-slate-200 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl">{item.icon}</span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    {item.unlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>{item.unlocked ? "تم الإنجاز ✓" : "قيد التقدم"}</span>
                  <span>{item.progress} / {item.maxProgress}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
