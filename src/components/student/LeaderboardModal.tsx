import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Medal, Crown, Star, Sparkles, UserCheck } from "lucide-react";
import { LeaderboardStudent } from "@/services/leaderboardService";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  top10: LeaderboardStudent[];
  currentStudentName: string | null;
  currentStudentRank: number | null;
}

export function LeaderboardModal({
  isOpen,
  onClose,
  top10,
  currentStudentName,
  currentStudentRank,
}: LeaderboardModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl" dir="rtl">
        <DialogHeader className="text-center space-y-3 mb-6">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-8 h-8 animate-pulse" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            لوحة الشرف • <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600">العشرة المتصدرون</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-md mx-auto">
            أفضل 10 طلاب حققوا أعلى النتائج في الاختبار المركزي والألعاب التفاعلية على مستوى المنصة
          </p>
        </DialogHeader>

        {/* Current Student Rank Callout */}
        {currentStudentName && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200/80 flex items-center justify-between gap-4 flex-wrap shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-700">ترتيبك الشخصي الحالي</p>
                <p className="text-base font-black text-slate-900">{currentStudentName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">المركز:</span>
              <span className={`px-3 py-1 rounded-xl text-sm font-black shadow-xs ${
                currentStudentRank && currentStudentRank <= 10
                  ? "bg-amber-400 text-slate-950 border border-amber-500 animate-pulse"
                  : "bg-white text-indigo-700 border border-indigo-200"
              }`}>
                {currentStudentRank ? `#${currentStudentRank}` : "غير مصنف بعد"}
              </span>
            </div>
          </div>
        )}

        {/* Top 10 List */}
        <div className="space-y-2.5">
          {top10.length > 0 ? (
            top10.map((student) => {
              const isTop3 = student.rank <= 3;
              const isFirst = student.rank === 1;

              return (
                <div
                  key={student.rank}
                  className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    student.isCurrentStudent
                      ? "bg-gradient-to-r from-amber-50/90 via-yellow-50/70 to-amber-50/90 border-amber-300 shadow-md ring-2 ring-amber-400/40"
                      : isFirst
                      ? "bg-gradient-to-r from-amber-50/60 to-yellow-50/40 border-amber-200/80 shadow-sm"
                      : "bg-slate-50/80 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Rank Badge */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm">
                      {student.rank === 1 && (
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/30 text-base">
                          🥇
                        </span>
                      )}
                      {student.rank === 2 && (
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 text-slate-800 shadow-md text-base">
                          🥈
                        </span>
                      )}
                      {student.rank === 3 && (
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md text-base">
                          🥉
                        </span>
                      )}
                      {student.rank > 3 && (
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
                          {student.rank}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base text-slate-900">
                          {student.name}
                        </span>
                        {student.isCurrentStudent && (
                          <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                            أنت 🌟
                          </span>
                        )}
                        {isFirst && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 mt-0.5">
                        <span>{student.completedCount} تحديات مكتملة</span>
                        <span>•</span>
                        <span>دقة: {student.accuracy}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-right">
                    <span className="text-base sm:text-lg font-black text-indigo-700">
                      {student.totalScore}
                    </span>
                    <span className="text-xs font-bold text-slate-400">نقطة</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm">كن أول من يخوض التحديات ويتصدر قائمة الشرف!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
