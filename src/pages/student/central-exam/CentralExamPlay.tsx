import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCentralExamQuestions, CentralExamQuestion } from "@/services/centralExamService";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import { ExplanationModal } from "@/components/exam/ExplanationModal";
import { CertificateModal } from "@/components/exam/CertificateModal";
import { 
  ChevronRight, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Star, 
  Zap, 
  Flame, 
  Rocket,
  Crown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  LogOut,
  AlertTriangle,
  Maximize2,
  PlayCircle,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { supabase } from "@/integrations/supabase/client";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
} from "@/lib/selection-context";
import { getScopedPayload } from "@/lib/selection-scope";

export default function CentralExamPlay() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<CentralExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [stage, setStage] = useState(1);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const startTime = useRef(Date.now());
  const selectionContext = useMemo(() => getStoredSelectionContext(), []);
  
  // Strict answer system - track wrong attempts
  const [questionsWithErrors, setQuestionsWithErrors] = useState<Set<string>>(new Set());
  const questionsWithErrorsRef = useRef<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [currentWrongReason, setCurrentWrongReason] = useState<string | null>(null);

  const handleExit = () => {
    setExitDialogOpen(true);
  };

  const confirmExit = () => {
    setExitDialogOpen(false);
    navigate("/student/dashboard");
  };

  useEffect(() => {
    if (!selectionContext || selectionContext.trackType !== "central") {
      navigate("/student/dashboard", { replace: true });
      return;
    }
    const initAudio = async () => {
      try {
        await audioManager.preload();
        console.log("✅ Audio preloaded successfully");
      } catch (err) {
        console.error("❌ Audio preload failed:", err);
      }
    };
    initAudio();

    // Fetch student profile for name
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("student_profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) {
          setStudentName(profile.full_name);
        }
      }
    };
    fetchProfile();
  }, [selectionContext, navigate]);

  const fetchQuestions = useCallback(async () => {
    if (!selectionContext || selectionContext.trackType !== "central") {
      setLoading(false);
      return;
    }

    try {
      const activeQuestions = await getCentralExamQuestions(selectionContext);
      
      // Filter questions matching current stage if stage_number exists
      const stageQuestions = activeQuestions.filter(q => !q.stage_number || q.stage_number === stage);
      const questionsToUse = stageQuestions.length > 0 ? stageQuestions : activeQuestions;

      // Deterministic order by stage and order_index - NO random shuffle or slicing
      const sortedQuestions = [...questionsToUse].sort((a, b) => {
        const stageA = a.stage_number ?? 1;
        const stageB = b.stage_number ?? 1;
        if (stageA !== stageB) {
          return stageA - stageB;
        }
        if (a.order_index !== undefined && b.order_index !== undefined && a.order_index !== b.order_index) {
          return a.order_index - b.order_index;
        }
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      setQuestions(sortedQuestions);
    } catch (err) {
      console.error("Error loading central exam questions:", err);
      toast.error("فشل تحميل أسئلة الاختبار المركزي");
    } finally {
      setLoading(false);
    }
  }, [selectionContext, stage]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSelectChoice = (choiceId: string) => {
    const currentQuestion = questions[currentIndex];
    const choice = currentQuestion.choices?.find(c => c.id === choiceId);
    const isCorrect = choice?.is_correct || false;
    
    setSelectedChoice(choiceId);
    
    if (isCorrect) {
      // ✅ CORRECT - play sound, add score, mark answered, advance after delay
      audioManager.playCorrect();
      setCurrentWrongReason(null);
      setIsAnswered(true);
      
      // Points are only awarded if this question was answered correctly on the FIRST attempt
      const hadError = questionsWithErrorsRef.current.has(currentQuestion.id);
      const nextScore = !hadError ? score + 1 : score;
      if (!hadError) {
        setScore(nextScore);
        toast.success("إجابة صحيحة! ✅", { duration: 1500 });
      } else {
        toast.info("إجابة صحيحة بعد المحاولة 👍", { duration: 1500 });
      }
      
      // Only advance if correct
      setTimeout(() => {
        handleNextQuestion(nextScore);
      }, 1500);
      
    } else {
      // ❌ WRONG - play sound, track error, DON'T advance, allow retry
      audioManager.playWrong();
      setCurrentWrongReason(currentQuestion.wrong_reason || null);
      
      // Count wrong attempt (only once per question)
      const isFirstWrong = !questionsWithErrorsRef.current.has(currentQuestion.id);
      if (isFirstWrong) {
        questionsWithErrorsRef.current.add(currentQuestion.id);
        setQuestionsWithErrors(new Set(questionsWithErrorsRef.current));
      }
      setWrongAttempts(prev => prev + 1);
      
      toast.error("إجابة خاطئة! حاول مرة أخرى ❌", { duration: 2000 });
      
      // Clear selection after short delay to allow retry
      setTimeout(() => {
        setSelectedChoice(null);
      }, 800);
    }
  };


  const handleNextQuestion = (currentRunningScore: number) => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedChoice(null);
      setIsAnswered(false);
      setCurrentWrongReason(null);
    } else {
      // Final question reached:
      // True correct count = total questions minus questions that had errors
      const finalWrongCount = questionsWithErrorsRef.current.size;
      const finalCorrectScore = Math.max(0, questions.length - finalWrongCount);
      setScore(finalCorrectScore);
      setIsFinished(true);
      setSaveStatus("saving");
      
      // Save attempt to database with genuine score
      void saveAttempt(finalCorrectScore);
      
      // Trigger celebration based on real percentage
      const percentage = questions.length > 0
        ? Math.round((finalCorrectScore / questions.length) * 100)
        : 0;
      if (percentage >= 60) {
        triggerConfetti();
        audioManager.playSuccess();
      }
    }
  };

  const startNextStage = () => {
    setStage(prev => prev + 1);
    setCurrentIndex(0);
    setSelectedChoice(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
    setLoading(true);
    setSaveStatus("idle");
    questionsWithErrorsRef.current = new Set();
    setQuestionsWithErrors(new Set());
    setWrongAttempts(0);
    setCurrentWrongReason(null);
    startTime.current = Date.now();
    fetchQuestions();
  };

  const saveAttempt = async (finalScore: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectionContext) {
        const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);
        const totalCount = questions.length;
        const wrongCount = questionsWithErrors.size;
        const correctCount = finalScore;
        const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        const resolvedStudentName = studentName || "طالب";
        
        const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
          user_id: user.id,
          game_type: "central_exam",
          score: correctCount,
          correct_count: correctCount,
          total_questions: totalCount,
          duration_seconds: durationSeconds,
          ...getScopedPayload(selectionContext),
          metadata: {
            student_name: resolvedStudentName,
            percentage: percentage,
            game_name: "الاختبار المركزي الشامل",
            exam_type: "central_exam",
            wrong_attempts: wrongCount,
            total_wrong_clicks: wrongAttempts,
            strict_mode: true,
            selection_context: getSelectionDisplayText(selectionContext)
          }
        }).select().single();

        if (insertError) {
          console.error("Error saving attempt:", insertError);
          setSaveStatus("error");
          toast.error("تعذر حفظ نتيجة الاختبار المركزي");
        } else {
          setSaveStatus("success");
          console.log("✅ Result saved successfully:", attemptData);
          
          // Trigger email notification
          const savedAttempt = attemptData as unknown as { id: string };
          if (savedAttempt) {
            const { error: emailError } = await supabase.functions.invoke('exam-finish', {
              body: { 
                attempt_id: savedAttempt.id, 
                is_game: true
              }
            });

            if (emailError) {
              console.error("Error sending central exam notification:", emailError);
              toast.error("تم حفظ النتيجة لكن تعذر إرسال إشعار الأدمن");
            }
          }
        }
      }
    } catch (err) {
      console.error("Error saving score:", err);
      setSaveStatus("error");
      toast.error("حدث خطأ أثناء حفظ النتيجة");
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#eab308']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#eab308']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-violet-600 font-bold text-lg">جاري التحميل...</p>
      </div>
    </div>
  );
  if (!questions.length) {
    const domainName = selectionContext?.domainName || "هذا القسم";
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-lg bg-white/95 backdrop-blur-2xl border-0 shadow-2xl p-8 sm:p-10 text-center rounded-3xl animate-in zoom-in duration-500">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
            <BookOpen className="w-12 h-12" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3">
            لا توجد أسئلة مضافة حالياً
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 font-medium">
            قسم <span className="font-black text-indigo-600">({domainName})</span> قيد التجهيز ولم يتم إدخال أسئلة له بعد من قِبل المعلمة. يمكنك التوجه للأقسام المتاحة التي تحتوي على أسئلة جاهزة: <br />
            <span className="inline-block mt-2 font-black text-emerald-600">الكيمياء • الفيزياء • الكهرباء</span>
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/student/dashboard")}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black shadow-xl shadow-indigo-500/25 text-lg"
            >
              <ArrowRight className="w-6 h-6 ml-2" />
              العودة لاختيار قسم متاح
            </Button>

            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-base"
            >
              الصفحة الرئيسية
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    const totalCount = questions.length;
    const wrongCount = questionsWithErrors.size;
    const correctCount = Math.max(0, totalCount - wrongCount);
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const resolvedStudentName = studentName || "طالب";
    
    // Determine achievement level
    let achievement = {
      icon: <Trophy className="w-16 h-16" />,
      title: "استمر في المحاولة! 💪",
      color: "from-amber-500 to-orange-500",
      bgColor: "from-amber-100 to-orange-100",
      message: "فرصة ممتازة للمراجعة والتحسن، التدريب المستمر يجعلك بطلاً!"
    };
    
    if (percentage >= 90) {
      achievement = {
        icon: <Crown className="w-16 h-16" />,
        title: "ممتاز! أداء استثنائي 👑",
        color: "from-yellow-400 via-amber-500 to-orange-500",
        bgColor: "from-yellow-100 via-amber-50 to-orange-100",
        message: "أحسنت يا بطل! أنت الأفضل"
      };
    } else if (percentage >= 75) {
      achievement = {
        icon: <Rocket className="w-16 h-16" />,
        title: "رائع جداً! مستوى متميز 🌟",
        color: "from-emerald-400 via-green-500 to-teal-500",
        bgColor: "from-emerald-100 to-teal-100",
        message: "استمر في التقدم! أنت في الطريق الصحيح"
      };
    } else if (percentage >= 60) {
      achievement = {
        icon: <Star className="w-16 h-16" />,
        title: "جيد جداً! خطوة ممتازة 👍",
        color: "from-blue-400 via-cyan-500 to-sky-500",
        bgColor: "from-blue-100 to-sky-100",
        message: "أداء جيد! يمكنك التحسن أكثر بالتمرين"
      };
    } else if (percentage >= 50) {
      achievement = {
        icon: <Sparkles className="w-16 h-16" />,
        title: "مستوى مقبول! تقدر تجيب أحسن 💪",
        color: "from-orange-400 to-amber-500",
        bgColor: "from-orange-100 to-amber-100",
        message: "أداء مقبول، راجع الأسئلة التي أخطأت بها وستتفوق!"
      };
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100 flex flex-col items-center justify-center p-4" dir="rtl">
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          
          {/* Confetti-like floating elements */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 3}s`,
                opacity: 0.4
              }}
            />
          ))}
        </div>
        
        <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-purple-500/20 p-8 md:p-12 relative overflow-hidden animate-in zoom-in duration-700">
          {/* Success Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${achievement.bgColor} opacity-50`} />
          
          <div className="relative z-10 text-center">
            {/* Trophy Icon with Animation */}
            <div className={`inline-flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-br ${achievement.color} p-1 shadow-2xl mb-6 animate-in zoom-in bounce-in duration-1000`}>
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className={`bg-gradient-to-br ${achievement.color} bg-clip-text text-transparent`}>
                  {achievement.icon}
                </div>
              </div>
              {/* Sparkles */}
              <div className="absolute -top-2 -right-2 text-3xl animate-bounce">✨</div>
              <div className="absolute -bottom-1 -left-2 text-2xl animate-bounce delay-100">⭐</div>
              <div className="absolute -top-1 -left-1 text-xl animate-pulse">🌟</div>
            </div>
            
            {/* Title & Message */}
            <h2 className={`text-3xl md:text-4xl font-black mb-2 bg-gradient-to-r ${achievement.color} bg-clip-text text-transparent`}>
              {achievement.title}
            </h2>
            <p className="text-slate-600 mb-6 text-lg font-medium">{achievement.message}</p>
            <p className="text-slate-500 mb-2 text-sm">المرحلة {stage}</p>
            
            {/* Student Name */}
            {resolvedStudentName && (
              <div className="mb-6 inline-block">
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>الطالب: {resolvedStudentName}</span>
                </div>
              </div>
            )}
            
            {/* Main Score Circle */}
            <div className="mb-8">
              <div className="relative w-48 h-48 mx-auto">
                {/* Outer ring */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${achievement.color} p-1 shadow-xl`}>
                  <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                    <span className={`text-6xl font-black bg-gradient-to-br ${achievement.color} bg-clip-text text-transparent`}>
                      {percentage}%
                    </span>
                    <span className="text-slate-400 font-medium mt-1">النسبة</span>
                  </div>
                </div>
                
                {/* Decorative ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 animate-spin" style={{ animationDuration: '20s' }}>
                  <circle cx="50%" cy="50%" r="47%" fill="none" stroke="url(#gradient)" strokeWidth="2" strokeDasharray="10 5" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-2xl font-black text-emerald-600">{correctCount}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">صحيحة</span>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-rose-500" />
                  <span className="text-2xl font-black text-rose-600">{wrongCount}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">أخطاء</span>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-black text-blue-600">{totalCount}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">المجموع</span>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Award className="w-5 h-5 text-violet-500" />
                  <span className="text-2xl font-black text-violet-600">
                    {percentage >= 60 ? '✓' : '!'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {percentage >= 60 ? 'ناجح' : 'يحتاج تدريب'}
                </span>
              </Card>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => setShowCertificateModal(true)}
                className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/20 text-slate-950"
              >
                <Award className="w-6 h-6 ml-3" />
                🎓 عرض وتحميل شهادة الشكر والتقدير
              </Button>

              <Button 
                onClick={startNextStage}
                className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 text-white"
              >
                <Sparkles className="w-6 h-6 ml-3" />
                الانتقال للمرحلة {stage + 1}
              </Button>
              
              <Button 
                onClick={() => navigate("/student/dashboard")}
                variant="outline"
                className="w-full h-12 text-lg font-bold rounded-xl border-2 border-slate-300 hover:bg-slate-100"
              >
                العودة للصفحة الرئيسية
              </Button>
            </div>

            <CertificateModal
              isOpen={showCertificateModal}
              onClose={() => setShowCertificateModal(false)}
              studentName={resolvedStudentName}
              score={correctCount}
              totalQuestions={totalCount}
              percentage={percentage}
              examTitle="الاختبار المركزي - منصة SCIRISE"
            />
            
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              {saveStatus === "saving" && (
                <>
                  <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-slate-500">جاري حفظ النتيجة...</span>
                </>
              )}
              {saveStatus === "success" && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-slate-500">تم حفظ النتيجة بنجاح</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-rose-600">تعذر حفظ النتيجة. راجع الاتصال ثم أعد المحاولة.</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100 flex flex-col" dir="rtl">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Modern Top Bar */}
      <div className="h-20 flex items-center justify-between px-6 bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 z-50 shadow-lg shadow-purple-500/5">
        <Button 
          variant="ghost" 
          onClick={handleExit}
          className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl px-4 py-2 transition-all"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          <span className="font-bold">خروج</span>
        </Button>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-2 rounded-full shadow-lg shadow-purple-500/30">
            <Target className="w-5 h-5" />
            <span className="font-bold">الاختبار المركزي - المرحلة {stage}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {wrongAttempts > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-600 rounded-full text-sm font-bold animate-pulse">
              <Flame className="w-4 h-4" />
              {wrongAttempts}
            </div>
          )}
          <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-md border border-slate-200">
            <span className="font-black text-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              {currentIndex + 1}
            </span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="font-bold text-slate-500">{questions.length}</span>
          </div>
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="h-2 w-full bg-white/50 backdrop-blur">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-700 ease-out shadow-lg shadow-purple-500/30"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 container max-w-4xl mx-auto px-4 py-8 flex flex-col relative z-10">
        {/* Question Card */}
        <Card className="mb-8 overflow-hidden border-0 shadow-2xl shadow-purple-500/10 bg-white/80 backdrop-blur-xl">
          {currentQuestion.image_url && (
            <div className="relative group">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative min-h-[200px] max-h-[400px] bg-slate-50/50 flex items-center justify-center overflow-hidden cursor-zoom-in transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/20 group-hover:scale-[1.01]">
                    <img 
                      src={currentQuestion.image_url} 
                      alt="Question" 
                      className="w-full h-full max-h-[400px] object-contain transition-transform duration-700"
                    />
                    
                    {/* Hover Overlay Hint */}
                    <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/5 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-xl">
                        <Maximize2 className="w-6 h-6 text-violet-600" />
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-slate-700 border border-white/50 shadow-sm z-10">
                      صورة توضيحية
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent shadow-none overflow-hidden" dir="rtl">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={currentQuestion.image_url} 
                      alt="Full Question" 
                      className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          
          <div className="p-8">
            {/* Question Number Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>سؤال {currentIndex + 1}</span>
              </div>
            </div>

            {selectionContext && (
              <div className="mb-6 text-center text-sm text-slate-500">
                {getSelectionDisplayText(selectionContext)}
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-black leading-relaxed text-center text-slate-800">
              {currentQuestion.text}
            </h2>
          </div>
        </Card>

        {/* Choices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Deduplicate choices by text, prefer is_correct=true when duplicates exist */}
          {Array.from(currentQuestion.choices
            ?.reduce((map, c) => {
              const existing = map.get(c.text);
              // Keep the one that is correct if there's a conflict
              if (!existing || (!existing.is_correct && c.is_correct)) {
                map.set(c.text, c);
              }
              return map;
            }, new Map<string, typeof currentQuestion.choices[0]>())
            .values() || [])
            ?.map((choice, index) => {
            const isSelected = selectedChoice === choice.id;
            const isCorrect = choice.is_correct;
            const letters = ['أ', 'ب', 'ج', 'د'];
            
            let cardClass = "bg-white/80 backdrop-blur border-2 border-slate-200 hover:border-violet-400 hover:bg-white hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1";
            let icon = null;
            
            if (isAnswered) {
              if (isCorrect) {
                cardClass = "bg-gradient-to-r from-emerald-400 to-green-500 border-emerald-500 text-white shadow-xl shadow-green-500/30 scale-105";
                icon = <CheckCircle2 className="w-8 h-8" />;
              } else if (isSelected && !isCorrect) {
                cardClass = "bg-gradient-to-r from-rose-400 to-red-500 border-rose-500 text-white shadow-lg";
                icon = <XCircle className="w-8 h-8" />;
              } else {
                cardClass = "bg-slate-100 border-slate-200 opacity-50";
              }
            } else if (isSelected) {
              cardClass = "bg-gradient-to-r from-violet-500 to-fuchsia-500 border-violet-500 text-white shadow-xl shadow-purple-500/30 scale-105";
            }

            return (
              <Card
                key={choice.id}
                onClick={() => !isAnswered && handleSelectChoice(choice.id)}
                className={`p-6 cursor-pointer transition-all duration-300 ${cardClass}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    isAnswered && isCorrect ? 'bg-white/20' :
                    isAnswered && isSelected && !isCorrect ? 'bg-white/20' :
                    isSelected ? 'bg-white/20' : 'bg-violet-100 text-violet-600'
                  }`}>
                    {isAnswered && isCorrect ? icon :
                     isAnswered && isSelected && !isCorrect ? icon :
                     isSelected ? <Sparkles className="w-6 h-6" /> : letters[index]}
                  </div>
                  <span className="text-lg font-bold flex-1">{choice.text}</span>
                </div>
              </Card>
            );
          })}
        </div>

        {(currentWrongReason || currentQuestion.explanation_url) && (
          <Card className="mb-8 border-amber-200 bg-amber-50/90 p-5 shadow-lg shadow-amber-100/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>توضيح السؤال والإجابة:</span>
              </div>
              <Button
                type="button"
                onClick={() => setShowExplanationModal(true)}
                className="bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 text-white font-bold text-xs sm:text-sm rounded-xl px-4 py-2 shadow-md shadow-primary/20"
              >
                <PlayCircle className="w-4 h-4 ml-1.5" />
                <span>🎥 شاهد شرح السؤال والدرس</span>
              </Button>
            </div>
            {currentWrongReason && (
              <p className="mt-2 text-sm leading-7 text-amber-950 font-medium pt-1 border-t border-amber-200/60">
                {currentWrongReason}
              </p>
            )}
            <div className="pt-2 flex items-center justify-end">
              <Button
                type="button"
                onClick={() => handleNextQuestion(score)}
                variant="outline"
                className="border-amber-400 text-amber-900 bg-white hover:bg-amber-100 font-bold px-4 py-1.5 rounded-xl shadow-sm text-xs sm:text-sm flex items-center gap-2"
              >
                <span>الانتقال للسؤال التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        <ExplanationModal
          isOpen={showExplanationModal}
          onClose={() => setShowExplanationModal(false)}
          questionText={currentQuestion.text}
          wrongReason={currentWrongReason || currentQuestion.wrong_reason}
          explanationUrl={currentQuestion.explanation_url}
        />

        {/* Feedback Area */}
        <div className="mt-auto pb-8 text-center">
          {isAnswered && (
            <div className="animate-in zoom-in duration-300">
              <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl ${
                selectedChoice && currentQuestion.choices?.find(c => c.id === selectedChoice)?.is_correct
                  ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-green-500/30'
                  : 'bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-rose-500/30'
              }`}>
                {selectedChoice && currentQuestion.choices?.find(c => c.id === selectedChoice)?.is_correct ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>إجابة صحيحة! أحسنت 🎉</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6" />
                    <span>حاول مرة أخرى 💪</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Beautiful Exit Confirmation Dialog */}
        <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
          <AlertDialogContent dir="rtl" className="border-rose-100 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-rose-600 font-bold text-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-rose-600" />
                </div>
                <span>الخروج من الاختبار؟</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right text-base leading-relaxed pt-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-amber-800 font-medium">
                      هل أنت متأكد من الانسحاب من الاختبار المركزي؟
                    </span>
                  </div>
                </div>
                <span className="text-slate-500">
                  سيتم فقدان تقدمك الحالي في هذا الاختبار. لن تتمكن من استعادة إجاباتك.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-2 mt-4">
              <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 font-bold px-6 h-12">
                <ArrowLeft className="w-4 h-4 ml-2" />
                مواصلة الاختبار
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmExit} 
                className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold px-6 h-12 shadow-lg shadow-rose-500/25"
              >
                <LogOut className="w-4 h-4 ml-2" />
                الخروج الآن
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
