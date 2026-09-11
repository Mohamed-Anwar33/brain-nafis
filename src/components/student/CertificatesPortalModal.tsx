import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Lock, Sparkles, Trophy, Download, Printer, ArrowLeft } from "lucide-react";
import { CertificateModal } from "@/components/exam/CertificateModal";

interface CertificatesPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string | null;
  rank: number | null;
  isInTop10: boolean;
  totalScore: number;
  pointsToTop10: number;
}

export function CertificatesPortalModal({
  isOpen,
  onClose,
  studentName,
  rank,
  isInTop10,
  totalScore,
  pointsToTop10,
}: CertificatesPortalModalProps) {
  const [showFullCertificate, setShowFullCertificate] = useState(false);

  return (
    <>
      <Dialog open={isOpen && !showFullCertificate} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl" dir="rtl">
          <DialogHeader className="text-center space-y-3 mb-6">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              بوابة الشهادات • <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600">شهادات المتصدرين</span>
            </DialogTitle>
            <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-md mx-auto">
              شهادات شكر وتقدير رسمية ومعتمدة تصدر خصيصاً لأفضل 10 طلاب في قائمة الشرف
            </p>
          </DialogHeader>

          {isInTop10 ? (
            /* Unlocked State - Student is in Top 10 */
            <div className="space-y-6 text-center">
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50 via-yellow-50/50 to-white border-2 border-amber-300/80 shadow-md">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-2xl shadow-md">
                  👑
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                  شهادة متصدر معتمدة ✓
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3 mb-1">
                  مبارك، {studentName || "بطلنا"}!
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-sm mx-auto leading-relaxed">
                  بصفتك في <span className="text-amber-700 font-black">المركز #{rank}</span> ضمن العشرة الأوائل بمجموع <span className="text-amber-700 font-black">{totalScore} نقطة</span>، تم اعتماد شهادة شكر وتقدير رسمية لك باسم منصة براين ساينس ومدرستك.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={() => setShowFullCertificate(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black px-6 py-2.5 rounded-2xl shadow-lg shadow-amber-500/25 gap-2 text-sm"
                  >
                    <Award className="w-4 h-4" />
                    <span>عرض وطباعة الشهادة الرسمية</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Locked State - Student is NOT in Top 10 */
            <div className="space-y-6 text-center">
              <div className="p-6 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center shadow-xs">
                  <Lock className="w-7 h-7" />
                </div>
                <span className="text-xs font-black text-slate-600 bg-slate-200/80 px-3 py-1 rounded-full">
                  الشهادة مقيدة بالمتصدرين 🔒
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-3 mb-1">
                  الشهادات مخصصة للمتصدرين العشرة الأوائل
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
                  وفق معايير التميز في المنصة، تمنح شهادات التقدير فقط لأفضل 10 طلاب على لوحة الشرف.
                </p>

                <div className="mt-5 p-3.5 rounded-2xl bg-white border border-slate-200 text-right space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>ترتيبك الحالي:</span>
                    <span className="font-black text-indigo-700">{rank ? `#${rank}` : "غير مصنف"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>النقاط المطلوبة لدخول العشرة الأوائل:</span>
                    <span className="font-black text-amber-600">+{pointsToTop10} نقطة</span>
                  </div>
                </div>

                <p className="text-xs font-black text-indigo-600 mt-4">
                  💡 واصل حل الاختبارات والتحديات لترفع رصيدك وتنتزع مقعدك بين العشرة الأوائل!
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Official Certificate Full Modal when opened */}
      {showFullCertificate && (
        <CertificateModal
          isOpen={showFullCertificate}
          onClose={() => setShowFullCertificate(false)}
          studentName={studentName || "طالب متميز"}
          score={totalScore}
          totalQuestions={totalScore}
          percentage={100}
          isTop10={true}
          rank={rank || 1}
          examTitle={`قائمة الشرف • متصدر المركز #${rank || 1} في منصة براين ساينس`}
        />
      )}
    </>
  );
}
