import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExamResult } from "@/types/exam";
import { Trophy, Clock, AlertCircle, Home, RotateCcw, CheckCircle2, XCircle, Star, Award } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { CertificateModal } from "@/components/exam/CertificateModal";

interface ResultScreenProps {
  result: ExamResult;
}

export function ResultScreen({ result }: ResultScreenProps) {
  const navigate = useNavigate();
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const percentage = result.question_count > 0 ? Math.round((result.score / result.question_count) * 100) : 0;

  const getGradeInfo = () => {
    if (percentage >= 90) return { label: "كفو يا بطل! أسطوري", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", emoji: "👑" };
    if (percentage >= 75) return { label: "ممتاز، استمر مبدع!", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", emoji: "🌟" };
    if (percentage >= 60) return { label: "شغل عالي، بس نبي أكثر", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", emoji: "👍" };
    if (percentage >= 50) return { label: "زين، بس تقدر تجيب أحسن", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", emoji: "💪" };
    return { label: "معوض خير، الجايات أحسن", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", emoji: "📚" };
  };

  const grade = getGradeInfo();

  useEffect(() => {
    if (percentage >= 50) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [percentage]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden animate-fade-in-up">

          {/* Header Section */}
          <div className="relative p-8 pb-16 text-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
            <div className="mb-6 inline-flex p-4 rounded-full bg-white shadow-lg shadow-slate-200/50 animate-bounce-slow">
              <span className="text-6xl filter drop-shadow-md">{grade.emoji}</span>
            </div>

            <h1 className={`text-4xl md:text-5xl font-black mb-2 tracking-normal ${grade.color}`}>
              {grade.label}
            </h1>
            <p className="text-slate-500 font-medium">نتيجتك في التحدي</p>
          </div>

          {/* Stats Grid - Overlapping the Header */}
          <div className="px-8 -mt-10 mb-8 relative z-20">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">

              {/* Score Circle */}
              <div className="flex items-center gap-4">
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border-4 ${grade.color} bg-white shadow-inner`}>
                  <span className={`text-2xl font-bold ${grade.color}`}>{percentage}%</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400 font-bold mb-1">الدرجة المستحقة</p>
                  <p className="text-3xl font-black text-slate-800">{result.score}<span className="text-lg text-slate-400 font-medium">/{result.question_count}</span></p>
                </div>
              </div>

              <div className="h-12 w-px bg-slate-100 hidden md:block"></div>

              {/* Score Breakdown */}
              <div className="flex gap-4 sm:gap-8">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-2 text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{result.score}</p>
                  <p className="text-xs text-slate-500 font-bold">إجابات صحيحة</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{result.total_penalty}</p>
                  <p className="text-xs text-slate-500 font-bold">أخطاء وخصومات</p>
                </div>
              </div>

            </div>
          </div>

          {/* Details Section */}
          <div className="px-8 pb-8 space-y-6">

            {/* Student Info Card */}
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 font-bold border shadow-sm">
                  {result.student_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-bold">البطل</p>
                  <p className="font-bold text-slate-800">{result.student_name}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-400 font-bold">الوقت</p>
                <p className="font-bold text-slate-800 font-mono text-sm">
                  {format(new Date(result.finished_at), "hh:mm a", { locale: ar })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setShowCertificateModal(true)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 shadow-xl shadow-amber-500/25 font-black text-lg sm:text-xl transform hover:scale-[1.01] active:scale-95 transition-all"
              >
                <Award className="w-6 h-6 ml-2" />
                🎓 عرض وتحميل شهادة الشكر والتقدير
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="h-14 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold text-lg"
                >
                  <Home className="w-5 h-5 ml-2" />
                  الرئيسية
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  className="h-14 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg shadow-primary/25 font-bold text-lg"
                >
                  <RotateCcw className="w-5 h-5 ml-2" />
                  اختبار جديد
                </Button>
              </div>
            </div>

            <CertificateModal
              isOpen={showCertificateModal}
              onClose={() => setShowCertificateModal(false)}
              studentName={result.student_name}
              score={result.score}
              totalQuestions={result.question_count}
              percentage={percentage}
              examTitle="اختبار منصة SCIRISE"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
