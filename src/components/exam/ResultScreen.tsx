import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExamResult } from "@/types/exam";
import {
  Trophy,
  Clock,
  AlertCircle,
  Home,
  RotateCcw,
  CheckCircle2,
  Star,
  Award,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { CertificateModal } from "@/components/exam/CertificateModal";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { audioManager } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface ResultScreenProps {
  result: ExamResult;
}

export function ResultScreen({ result }: ResultScreenProps) {
  const navigate = useNavigate();
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [revealedStars, setRevealedStars] = useState(0);

  const percentage =
    result.question_count > 0
      ? Math.round((result.score / result.question_count) * 100)
      : 0;

  const earnedStars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;

  const getGradeInfo = () => {
    if (percentage >= 90)
      return {
        label: "كفو يا بطل! أداء أسطوري 👑",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        emoji: "👑",
      };
    if (percentage >= 75)
      return {
        label: "ممتاز، استمر مبدعاً! 🌟",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        emoji: "🌟",
      };
    if (percentage >= 60)
      return {
        label: "شغل عالي، بس نبي أكثر! 🚀",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        emoji: "👍",
      };
    if (percentage >= 50)
      return {
        label: "زين، بس تقدر تجيب أحسن! 💪",
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        emoji: "💪",
      };
    return {
      label: "معوض خير، الجايات أحسن! 🌱",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      emoji: "📚",
    };
  };

  const grade = getGradeInfo();

  useEffect(() => {
    // Play Victory Fanfare
    audioManager.playVictory();

    // Staggered Star Reveal
    if (earnedStars > 0) {
      for (let i = 1; i <= earnedStars; i++) {
        setTimeout(() => {
          setRevealedStars(i);
          audioManager.playStar(i);
        }, i * 450);
      }
    }

    // Confetti on success
    if (percentage >= 50) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) =>
        Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    }
  }, [percentage, earnedStars]);

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Top Floating Sound Control */}
      <div className="fixed top-4 left-4 z-50">
        <SoundToggle />
      </div>

      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-sky-200/40 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-3xl relative z-10 py-8">
        <div className="bg-white/85 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-700">
          {/* Header Section */}
          <div className="relative p-6 sm:p-10 pb-16 text-center bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
            {/* 3-Star Rating Animation */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {[1, 2, 3].map((starIndex) => {
                const isLit = starIndex <= revealedStars;
                return (
                  <div
                    key={starIndex}
                    className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md",
                      isLit
                        ? "bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 scale-110 rotate-6 shadow-amber-400/40"
                        : "bg-slate-100 text-slate-300 scale-95"
                    )}
                  >
                    <Star
                      className={cn(
                        "w-7 h-7 sm:w-9 sm:h-9",
                        isLit ? "fill-amber-400 text-amber-500" : "fill-slate-200 text-slate-300"
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <h1
              className={`text-3xl sm:text-5xl font-black mb-2 tracking-normal ${grade.color}`}
            >
              {grade.label}
            </h1>
            <p className="text-slate-500 font-bold text-sm sm:text-base">
              نتيجتك في تحدي براين ساينس
            </p>
          </div>

          {/* Stats Card Overlap */}
          <div className="px-6 sm:px-10 -mt-10 mb-6 relative z-20">
            <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">
              {/* Score Circle */}
              <div className="flex items-center gap-4">
                <div
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-4 ${grade.color} bg-white shadow-inner`}
                >
                  <span className={`text-2xl sm:text-3xl font-black ${grade.color}`}>
                    {percentage}%
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-slate-400 font-bold mb-0.5">
                    الدرجة المستحقة
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-slate-800">
                    {result.score}
                    <span className="text-lg text-slate-400 font-medium">
                      /{result.question_count}
                    </span>
                  </p>
                </div>
              </div>

              <div className="h-12 w-px bg-slate-100 hidden md:block" />

              {/* Score Breakdown */}
              <div className="flex gap-6 sm:gap-10">
                <div className="text-center">
                  <div className="w-11 h-11 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-1 text-emerald-600 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-black text-slate-800">{result.score}</p>
                  <p className="text-xs text-slate-500 font-bold">إجابات صحيحة</p>
                </div>

                <div className="text-center">
                  <div className="w-11 h-11 mx-auto bg-rose-50 rounded-2xl flex items-center justify-center mb-1 text-rose-600 shadow-sm">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {result.total_penalty}
                  </p>
                  <p className="text-xs text-slate-500 font-bold">خصومات وأخطاء</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Earned Section */}
          <div className="px-6 sm:px-10 mb-6">
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-3">
              <span className="text-xs sm:text-sm font-black text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>أوسمة الإنجاز المكتسبة في هذه الجولة:</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                    🚀
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">وسام الإصرار</p>
                    <p className="text-[10px] text-slate-500">إكمال التحدي</p>
                  </div>
                </div>

                {result.total_penalty === 0 ? (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-emerald-200 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                      ⚡
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-700">وسام الدقة</p>
                      <p className="text-[10px] text-emerald-600">بدون أي خصم!</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                      💡
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">وسام المحاولة</p>
                      <p className="text-[10px] text-slate-500">التعلم بالتجربة</p>
                    </div>
                  </div>
                )}

                {percentage >= 90 && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-amber-200 shadow-sm col-span-2 sm:col-span-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                      👑
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-700">العلامة الكاملة</p>
                      <p className="text-[10px] text-amber-600">درجة فائقة</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="px-6 sm:px-10 pb-8 space-y-4">
            {/* Student Info Card */}
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-indigo-700 font-black border shadow-sm text-base">
                  {result.student_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">البطل العلمي</p>
                  <p className="font-black text-slate-800">{result.student_name}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400 font-bold">وقت الإنجاز</p>
                <p className="font-bold text-slate-800 text-xs sm:text-sm">
                  {result.finished_at
                    ? format(new Date(result.finished_at), "hh:mm a", { locale: ar })
                    : "الآن"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => setShowCertificateModal(true)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 shadow-xl shadow-amber-500/25 font-black text-base sm:text-lg transform hover:scale-[1.01] active:scale-95 transition-all"
              >
                <Award className="w-6 h-6 ml-2" />
                🎓 عرض وتحميل شهادة الشكر والتقدير
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => navigate("/student/dashboard")}
                  variant="outline"
                  className="h-12 sm:h-14 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-base"
                >
                  <Home className="w-5 h-5 ml-2" />
                  لوحة التحديات
                </Button>
                <Button
                  onClick={() => navigate("/student/dashboard")}
                  className="h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 text-white shadow-lg shadow-indigo-500/20 font-bold text-base hover:scale-[1.01] active:scale-95 transition-all"
                >
                  <RotateCcw className="w-5 h-5 ml-2" />
                  تحدي جديد
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
              examTitle="اختبار منصة براين ساينس"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
