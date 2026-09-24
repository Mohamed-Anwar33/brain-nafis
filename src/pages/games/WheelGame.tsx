import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowRight,
  RotateCw,
  Trophy,
  Sparkles,
  Target,
  HelpCircle,
  Award,
  Video,
  CheckCircle2,
  XCircle,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
  ensureStoredSelectionContext,
} from "@/lib/selection-context";
import { getScopedPayload } from "@/lib/selection-scope";
import { CertificateModal } from "@/components/exam/CertificateModal";
import { ExplanationModal } from "@/components/exam/ExplanationModal";

interface WheelQuestionChoice {
  id: string;
  text: string;
  is_correct: boolean;
  image_url?: string | null;
}

interface WheelQuestion {
  id: string;
  text: string;
  image_url: string | null;
  choices: WheelQuestionChoice[];
  points: number;
  section_id?: string;
  domain_id?: string;
  wrong_reason?: string | null;
  explanation_url?: string | null;
}

const SLICE_COLORS = [
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#3b82f6", // Blue
];

const WHEEL_QUESTIONS_COUNT = 8;

export default function WheelGame() {
  const navigate = useNavigate();
  const selectionContext = useMemo(
    () => getStoredSelectionContext() || ensureStoredSelectionContext("nafis"),
    []
  );

  const [loading, setLoading] = useState(true);
  const [allQuestionsPool, setAllQuestionsPool] = useState<WheelQuestion[]>([]);
  const [wheelQuestions, setWheelQuestions] = useState<WheelQuestion[]>([]);
  const [solvedQuestionIds, setSolvedQuestionIds] = useState<Set<string>>(new Set());

  // Current Question in Modal
  const [currentQuestion, setCurrentQuestion] = useState<WheelQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Wheel Animation & State
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  // Game Progress
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [studentName, setStudentName] = useState<string>("");
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  useEffect(() => {
    audioManager.preload();
    fetchData();
  }, [navigate, selectionContext]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeContext = selectionContext || ensureStoredSelectionContext("nafis");

      // Fetch student name
      const storedName =
        localStorage.getItem("student_name") ||
        sessionStorage.getItem("student_name") ||
        "طالب متميز";
      setStudentName(storedName);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .single();
          if (profile?.full_name) {
            setStudentName(profile.full_name);
          }
        }
      } catch (e) {
        console.warn("Session check fallback:", e);
      }

      // 1. Fetch questions matching current domain if specified
      let fetchedQuestions: WheelQuestion[] = [];
      if (activeContext.domainId && activeContext.domainId !== "all") {
        const { data: domQuestions } = await supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("is_active", true)
          .eq("domain_id", activeContext.domainId);
        if (domQuestions && domQuestions.length > 0) {
          fetchedQuestions = domQuestions as unknown as WheelQuestion[];
        }
      }

      // 2. Fallback: try by track_type or grade_subject_id
      if (fetchedQuestions.length === 0 && activeContext.gradeSubjectId) {
        const { data: gsQuestions } = await supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("is_active", true)
          .eq("grade_subject_id", activeContext.gradeSubjectId);
        if (gsQuestions && gsQuestions.length > 0) {
          fetchedQuestions = gsQuestions as unknown as WheelQuestion[];
        }
      }

      // 3. Fallback: any active questions in wheel_section_questions
      if (fetchedQuestions.length === 0) {
        const { data: anyQuestions } = await supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("is_active", true)
          .limit(80);
        if (anyQuestions && anyQuestions.length > 0) {
          fetchedQuestions = anyQuestions as unknown as WheelQuestion[];
        }
      }

      // 4. Ultimate fallback: sample questions
      if (fetchedQuestions.length === 0) {
        fetchedQuestions = generateSampleQuestions();
      }

      // Shuffle pool
      const shuffled = [...fetchedQuestions].sort(() => Math.random() - 0.5);
      setAllQuestionsPool(shuffled);

      // Select first batch of 8 questions for Stage 1
      loadStageQuestions(shuffled, 1);
    } catch (error) {
      console.error("Error fetching wheel questions, using sample fallback:", error);
      const fallbackQuestions = generateSampleQuestions();
      setAllQuestionsPool(fallbackQuestions);
      loadStageQuestions(fallbackQuestions, 1);
    } finally {
      setLoading(false);
    }
  };

  const loadStageQuestions = (pool: WheelQuestion[], stageNumber: number) => {
    if (pool.length === 0) return;
    const startIdx = ((stageNumber - 1) * WHEEL_QUESTIONS_COUNT) % pool.length;
    let selected = pool.slice(startIdx, startIdx + WHEEL_QUESTIONS_COUNT);
    if (selected.length < WHEEL_QUESTIONS_COUNT) {
      selected = [...selected, ...pool.slice(0, WHEEL_QUESTIONS_COUNT - selected.length)];
    }
    // Ensure we always have exactly WHEEL_QUESTIONS_COUNT items
    while (selected.length < WHEEL_QUESTIONS_COUNT) {
      selected.push(pool[selected.length % pool.length]);
    }

    setWheelQuestions(selected);
    setSolvedQuestionIds(new Set());
    setRotation(0);
    setIsSpinning(false);
    setShowQuestionDialog(false);
  };

  const generateSampleQuestions = (): WheelQuestion[] => [
    {
      id: "q1",
      text: "ما هي وحدة بناء الكائنات الحية الأساسية؟",
      image_url: null,
      choices: [
        { id: "c1", text: "الخلية", is_correct: true },
        { id: "c2", text: "النسيج", is_correct: false },
        { id: "c3", text: "العضو", is_correct: false },
        { id: "c4", text: "الجهاز", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q2",
      text: "ناتج ضرب 8 × 7 يساوي؟",
      image_url: null,
      choices: [
        { id: "c1", text: "56", is_correct: true },
        { id: "c2", text: "54", is_correct: false },
        { id: "c3", text: "48", is_correct: false },
        { id: "c4", text: "64", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q3",
      text: "ما هو رمز الذهب في الجدول الدوري؟",
      image_url: null,
      choices: [
        { id: "c1", text: "Au", is_correct: true },
        { id: "c2", text: "Ag", is_correct: false },
        { id: "c3", text: "Fe", is_correct: false },
        { id: "c4", text: "Cu", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q4",
      text: "أي مما يلي يمثل شحنة الإلكترون؟",
      image_url: null,
      choices: [
        { id: "c1", text: "سالبة", is_correct: true },
        { id: "c2", text: "موجبة", is_correct: false },
        { id: "c3", text: "متعادلة", is_correct: false },
        { id: "c4", text: "مزدوجة", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q5",
      text: "ناتج ضرب 2 × 6 يساوي؟",
      image_url: null,
      choices: [
        { id: "c1", text: "12", is_correct: true },
        { id: "c2", text: "14", is_correct: false },
        { id: "c3", text: "10", is_correct: false },
        { id: "c4", text: "16", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q6",
      text: "ما هو الغاز الأكثر وفرة في الغلاف الجوي؟",
      image_url: null,
      choices: [
        { id: "c1", text: "النيتروجين", is_correct: true },
        { id: "c2", text: "الأكسجين", is_correct: false },
        { id: "c3", text: "ثاني أكسيد الكربون", is_correct: false },
        { id: "c4", text: "الهيدروجين", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q7",
      text: "ناتج ضرب 3 × 6 يساوي؟",
      image_url: null,
      choices: [
        { id: "c1", text: "18", is_correct: true },
        { id: "c2", text: "21", is_correct: false },
        { id: "c3", text: "15", is_correct: false },
        { id: "c4", text: "24", is_correct: false },
      ],
      points: 10,
    },
    {
      id: "q8",
      text: "ما هي سرعة الضوء التقريبية في الفراغ؟",
      image_url: null,
      choices: [
        { id: "c1", text: "300,000 كم/ثانية", is_correct: true },
        { id: "c2", text: "150,000 كم/ثانية", is_correct: false },
        { id: "c3", text: "500,000 كم/ثانية", is_correct: false },
        { id: "c4", text: "1,000,000 كم/ثانية", is_correct: false },
      ],
      points: 10,
    },
  ];

  // Helper to extract a short preview text for the wheel segment
  const getQuestionSnippet = (qText: string) => {
    if (!qText) return "";
    const clean = qText.replace(/[؟?]/g, "").trim();
    if (clean.length <= 15) return clean;
    return clean.slice(0, 14) + "..";
  };

  // Spin Wheel to an unsolved question
  const spinWheel = () => {
    if (isSpinning || wheelQuestions.length === 0) return;

    // Find indices of questions not yet solved
    const unsolvedIndices = wheelQuestions
      .map((q, idx) => (!solvedQuestionIds.has(q.id) ? idx : null))
      .filter((idx): idx is number => idx !== null);

    if (unsolvedIndices.length === 0) {
      setGameOver(true);
      return;
    }

    setIsSpinning(true);
    setShowQuestionDialog(false);
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setIsCorrectAnswer(false);
    setWrongAttempts(0);

    // Pick one random unsolved question as the winner
    const randomPick = Math.floor(Math.random() * unsolvedIndices.length);
    const targetIndex = unsolvedIndices[randomPick];
    const targetQuestion = wheelQuestions[targetIndex];

    // Math calculation to land precisely under the top pointer needle (at 0° / 12 o'clock)
    const N = wheelQuestions.length;
    const sliceAngle = 360 / N;
    // Slice i center angle clockwise from top (0 deg) is (i + 0.5) * sliceAngle
    const sliceCenterAngle = (targetIndex + 0.5) * sliceAngle;
    const desiredStopAngle = (360 - sliceCenterAngle) % 360;
    const currentNormalized = ((rotation % 360) + 360) % 360;
    const delta = (desiredStopAngle - currentNormalized + 360) % 360;
    const fullSpins = 5; // 5 full rotations for suspense
    const targetRotation = rotation + fullSpins * 360 + delta;

    const wheel = wheelRef.current;
    if (!wheel) {
      setRotation(targetRotation);
      setTimeout(() => finishSpin(targetQuestion, targetIndex), 4000);
      return;
    }

    // Play initial spin audio
    audioManager.playClick();

    // Pull-back anticipation (250ms)
    const pullBack = rotation - 20;
    wheel.animate(
      [
        { transform: `rotate(${rotation}deg)` },
        { transform: `rotate(${pullBack}deg)` },
      ],
      {
        duration: 250,
        easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        fill: "forwards",
      }
    );

    // Main smooth spin animation (4000ms) with realistic friction
    setTimeout(() => {
      const spinAnim = wheel.animate(
        [
          { transform: `rotate(${pullBack}deg)` },
          { transform: `rotate(${targetRotation}deg)` },
        ],
        {
          duration: 4000,
          easing: "cubic-bezier(0.12, 0.8, 0.15, 1)",
          fill: "forwards",
        }
      );

      // Play tick sounds as slices pass
      let lastSliceTick = -1;
      const tickInterval = setInterval(() => {
        const computed = getComputedStyle(wheel).transform;
        if (computed && computed !== "none") {
          const values = computed.split("(")[1].split(")")[0].split(",");
          const a = parseFloat(values[0]);
          const b = parseFloat(values[1]);
          const currentDeg = (Math.round(Math.atan2(b, a) * (180 / Math.PI)) + 360) % 360;
          const currentSlice = Math.floor(currentDeg / sliceAngle);
          if (currentSlice !== lastSliceTick) {
            lastSliceTick = currentSlice;
            audioManager.playTick();
          }
        }
      }, 70);

      spinAnim.onfinish = () => {
        clearInterval(tickInterval);
        setRotation(targetRotation);
        finishSpin(targetQuestion, targetIndex);
      };
    }, 250);
  };

  const finishSpin = (selectedQ: WheelQuestion, index: number) => {
    setIsSpinning(false);
    setCurrentQuestion(selectedQ);
    setCurrentQuestionIndex(index);

    audioManager.playPowerUp();

    toast.success(`🎯 توقفت العجلة عند: سؤال ${index + 1}!`, {
      description: "أجب عن السؤال لتحصل على النقاط وتكمل العجلة!",
      duration: 2500,
    });

    setTimeout(() => {
      setShowQuestionDialog(true);
    }, 600);
  };

  const handleAnswer = (choiceId: string) => {
    if (!currentQuestion || isAnswered) return;

    setSelectedChoiceId(choiceId);
    const choice = currentQuestion.choices.find((c) => c.id === choiceId);
    const isCorrect = choice?.is_correct ?? false;

    if (isCorrect) {
      audioManager.playCorrect();
      setIsCorrectAnswer(true);
      setIsAnswered(true);

      const points = currentQuestion.points || 10;
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      toast.success(`🎉 أحسنت يا بطل! إجابة صحيحة (+${points} نقطة)`);

      // Mark this question as solved
      const nextSolved = new Set(solvedQuestionIds);
      nextSolved.add(currentQuestion.id);
      setSolvedQuestionIds(nextSolved);

      // Auto-close question dialog and return to wheel
      setTimeout(() => {
        setShowQuestionDialog(false);
        setSelectedChoiceId(null);
        setIsAnswered(false);
        setIsCorrectAnswer(false);
        setCurrentQuestion(null);

        // Check if all questions in this wheel are now solved
        if (nextSolved.size >= wheelQuestions.length) {
          audioManager.playSuccess();
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
          setGameOver(true);
          void saveWheelAttempt(score + points, nextSolved.size);
        }
      }, 1300);
    } else {
      audioManager.playWrong();
      setIsCorrectAnswer(false);
      setWrongAttempts((prev) => prev + 1);
      setWrongCount((prev) => prev + 1);

      toast.error("❌ إجابة خاطئة! حاول مرة أخرى");
      setTimeout(() => {
        setSelectedChoiceId(null);
      }, 700);
    }
  };

  const saveWheelAttempt = async (finalScore: number, solvedTotal: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && selectionContext) {
        const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);
        await supabase.from("game_attempts").insert({
          user_id: user.id,
          game_type: "wheel_science",
          score: finalScore,
          correct_count: solvedTotal,
          total_questions: wheelQuestions.length,
          duration_seconds: durationSeconds,
          ...getScopedPayload(selectionContext),
          metadata: {
            student_name: studentName || "طالب",
            selection_context: getSelectionDisplayText(selectionContext),
            stage: stage,
            game_name: "عجلة العلوم الدوارة",
          },
        });
      }
    } catch (err) {
      console.error("Error saving wheel attempt:", err);
    }
  };

  const startNextStage = () => {
    const nextStage = stage + 1;
    setStage(nextStage);
    setGameOver(false);
    setSolvedQuestionIds(new Set());
    startTime.current = Date.now();
    loadStageQuestions(allQuestionsPool, nextStage);
    audioManager.playPowerUp();
    toast.success(`انطلقت المرحلة ${nextStage} بنجاح! 🚀`);
  };

  const restartGame = () => {
    setScore(0);
    setStage(1);
    setCorrectCount(0);
    setWrongCount(0);
    setGameOver(false);
    setSolvedQuestionIds(new Set());
    startTime.current = Date.now();
    loadStageQuestions(allQuestionsPool, 1);
  };

  // Wheel Rendering Calculations
  const N = wheelQuestions.length || 8;
  const sliceAngle = 360 / N;
  const allSolved = wheelQuestions.length > 0 && solvedQuestionIds.size >= wheelQuestions.length;

  if (gameOver) {
    const totalQ = wheelQuestions.length;
    const percentage = totalQ > 0 ? Math.round((solvedQuestionIds.size / totalQ) * 100) : 100;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-lg p-6 sm:p-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-slate-100 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
              أحسنت يا {studentName || "بطل"}! 🎉
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-500">
              أكملت جميع أسئلة المرحلة {stage} من عجلة العلوم بنجاح
            </p>
          </div>

          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-6 rounded-2xl border border-amber-200 shadow-xs">
            <div className="text-xs sm:text-sm text-amber-800 font-bold mb-1">النقاط الإجمالية</div>
            <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
              {score}
            </div>
            <div className="text-xs text-amber-700 font-bold mt-1">نقطة تميز</div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-xl sm:text-2xl font-black text-emerald-600">{solvedQuestionIds.size}</div>
              <div className="text-xs text-slate-600 font-bold">مكتملة ✓</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="text-xl sm:text-2xl font-black text-rose-600">{wrongCount}</div>
              <div className="text-xs text-slate-600 font-bold">أخطاء ❌</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="text-xl sm:text-2xl font-black text-amber-600">{percentage}%</div>
              <div className="text-xs text-slate-600 font-bold">النسبة 🌟</div>
            </div>
          </div>

          <Button
            onClick={() => setShowCertificateModal(true)}
            className="w-full min-h-[3.5rem] h-auto py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 shadow-xl shadow-amber-500/25 font-black text-base sm:text-lg flex items-center justify-center gap-2 border-2 border-amber-300 text-center leading-snug whitespace-normal transform hover:scale-[1.01] active:scale-95 transition-all"
          >
            <Award className="w-6 h-6 ml-2 shrink-0 text-slate-950" />
            <span>عرض وتحميل شهادة الشكر والتقدير</span>
          </Button>

          <div className="flex flex-col gap-3">
            <Button
              onClick={startNextStage}
              className="w-full h-14 text-lg sm:text-xl font-black rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/25 text-white flex items-center justify-center gap-2.5"
            >
              <Sparkles className="w-6 h-6 ml-2" />
              <span>الانتقال للمرحلة {stage + 1} 🚀</span>
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={restartGame}
                variant="outline"
                className="h-12 text-sm sm:text-base rounded-xl font-bold border-2"
              >
                <RotateCw className="w-4 h-4 ml-1.5" />
                <span>إعادة اللعبة</span>
              </Button>
              <Button
                asChild
                className="h-12 text-sm sm:text-base rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors"
              >
                <Link to="/student/dashboard" className="flex items-center justify-center font-bold">
                  <span>القائمة الرئيسية</span>
                </Link>
              </Button>
            </div>
          </div>

          <CertificateModal
            isOpen={showCertificateModal}
            onClose={() => setShowCertificateModal(false)}
            studentName={studentName || "طالب متميز"}
            score={solvedQuestionIds.size}
            totalQuestions={totalQ || 8}
            percentage={percentage}
            examTitle={`عجلة العلوم (المرحلة ${stage}) - منصة براين ساينس`}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-3 px-4 sm:px-6 shadow-xs sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(
                    selectionContext?.trackType === "central"
                      ? "/central-exam/games"
                      : "/student/games"
                  );
                }
              }}
              className="rounded-full px-2 sm:px-4 cursor-pointer text-slate-700 hover:bg-slate-100"
            >
              <ArrowRight className="w-5 h-5 ml-1" />
              <span>العودة</span>
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-black text-sm sm:text-lg text-slate-900 line-clamp-1">
                  عجلة العلوم - المرحلة {stage}
                </h1>
                <p className="text-[11px] font-bold text-slate-400">
                  {selectionContext?.domainName || "المجال العلمي المختار"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-3 py-1.5 rounded-full shadow-xs">
              <span className="text-[11px] font-black text-amber-800">النقاط:</span>
              <span className="font-black text-sm sm:text-base text-amber-700">{score}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3 pt-1 text-xs">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1 font-bold text-slate-600 text-[11px]">
                <span>الأسئلة المحلولة في هذه العجلة:</span>
                <span className="text-rose-600 font-black">
                  {solvedQuestionIds.size} من أصل {wheelQuestions.length}
                </span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      wheelQuestions.length > 0
                        ? (solvedQuestionIds.size / wheelQuestions.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Wheel Arena */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl space-y-6 sm:space-y-8 flex flex-col items-center">
          {/* Wheel Frame */}
          <div className="relative flex justify-center items-center select-none">
            {/* Pointer / Needle at Top (12 o'clock) pointing directly into the slice */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-30 pointer-events-none drop-shadow-2xl">
              <div className="relative flex flex-col items-center">
                {/* Needle triangle */}
                <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[44px] border-t-amber-400 drop-shadow-xl" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-md -mt-10" />
              </div>
            </div>

            {/* Glowing Auras */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400/20 via-purple-500/20 to-amber-400/20 blur-3xl pointer-events-none" />

            {/* Outer Rim Ring */}
            <div className="relative p-3.5 sm:p-5 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-2xl border-4 border-amber-300/80">
              <div className="rounded-full bg-slate-900 p-1 sm:p-1.5 shadow-inner">
                {/* SVG Rotating Wheel */}
                <div
                  ref={wheelRef}
                  onClick={() => !isSpinning && !allSolved && spinWheel()}
                  className={`relative w-[82vw] h-[82vw] max-w-[340px] max-h-[340px] sm:max-w-[420px] sm:max-h-[420px] ${
                    !isSpinning && !allSolved ? "cursor-pointer" : ""
                  }`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    willChange: "transform",
                  }}
                >
                  <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                    <defs>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" />
                      </filter>
                    </defs>

                    {/* Slices of questions */}
                    {wheelQuestions.map((q, i) => {
                      const startAngle = (i * 360) / N - 90;
                      const endAngle = ((i + 1) * 360) / N - 90;
                      const midAngle = ((i + 0.5) * 360) / N - 90;
                      const isSolved = solvedQuestionIds.has(q.id);
                      const color = SLICE_COLORS[i % SLICE_COLORS.length];

                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const x1 = 200 + 190 * Math.cos(startRad);
                      const y1 = 200 + 190 * Math.sin(startRad);
                      const x2 = 200 + 190 * Math.cos(endRad);
                      const y2 = 200 + 190 * Math.sin(endRad);

                      const snippet = getQuestionSnippet(q.text);

                      return (
                        <g key={q.id || i}>
                          {/* Segment Wedge */}
                          <path
                            d={`M 200 200 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`}
                            fill={color}
                            fillOpacity={isSolved ? 0.45 : 1}
                            stroke="#ffffff"
                            strokeWidth="3.5"
                            className="transition-all"
                          />

                          {/* Text and Badge Group rotated radially along the midAngle */}
                          <g transform={`rotate(${midAngle + 90}, 200, 200)`}>
                            {/* Question Title */}
                            <text
                              x="200"
                              y="72"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#ffffff"
                              fontSize="14"
                              fontWeight="900"
                              className="select-none"
                              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
                            >
                              سؤال {i + 1}
                            </text>

                            {/* Question Snippet text around the needle */}
                            <text
                              x="200"
                              y="96"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#fef08a"
                              fontSize="11.5"
                              fontWeight="800"
                              className="select-none"
                              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                            >
                              {snippet}
                            </text>

                            {/* Solved checkmark or Star icon */}
                            {isSolved ? (
                              <g transform="translate(200, 126)">
                                <circle r="12" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                                <text
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#ffffff"
                                  fontSize="12"
                                  fontWeight="900"
                                >
                                  ✓
                                </text>
                              </g>
                            ) : (
                              <text
                                x="200"
                                y="125"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="14"
                                className="select-none"
                              >
                                🎯
                              </text>
                            )}
                          </g>
                        </g>
                      );
                    })}

                    {/* Center Outer Bezel */}
                    <circle cx="200" cy="200" r="48" fill="#0f172a" stroke="#ffffff" strokeWidth="4" />
                  </svg>
                </div>

                {/* Center Spin Button (لفّ) */}
                <button
                  type="button"
                  onClick={spinWheel}
                  disabled={isSpinning || allSolved}
                  className={`absolute inset-0 m-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 text-white shadow-2xl border-4 border-white flex flex-col items-center justify-center transition-all duration-300 z-20 cursor-pointer ${
                    isSpinning || allSolved
                      ? "opacity-85 scale-95"
                      : "hover:scale-110 active:scale-95 hover:shadow-rose-500/60"
                  }`}
                >
                  <Target className={`w-7 h-7 sm:w-8 sm:h-8 ${isSpinning ? "animate-spin" : ""}`} />
                  <span className="text-xs sm:text-sm font-black mt-0.5">
                    {isSpinning ? "..." : allSolved ? "اكتمل" : "لفّ"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Button & Instructions */}
          <div className="w-full max-w-sm text-center space-y-3 pt-2">
            <Button
              onClick={spinWheel}
              disabled={isSpinning || allSolved}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-black text-lg shadow-xl shadow-rose-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Target className="w-6 h-6 ml-2" />
              <span>{isSpinning ? "جاري دوران العجلة... 🎯" : "دور العجلة الآن 🎡"}</span>
            </Button>

            <p className="text-xs sm:text-sm font-bold text-slate-500 leading-relaxed">
              لف العجلة لتتوقف عند أحد الأسئلة الموضحة على الأقسام وأجب عنها لحصد النقاط! 🌟
            </p>
          </div>
        </div>
      </main>

      {/* Question Modal Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={(open) => !open && setShowQuestionDialog(false)}>
        <DialogContent
          className="max-w-xl w-[95vw] p-5 sm:p-7 rounded-3xl bg-white border-2 border-slate-100 shadow-2xl"
          dir="rtl"
        >
          <DialogHeader className="text-right space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                سؤال رقم {currentQuestionIndex + 1} من {wheelQuestions.length} 🎯
              </span>
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                +{currentQuestion?.points || 10} نقطة
              </span>
            </div>

            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 leading-relaxed pt-2">
              {currentQuestion?.text}
            </DialogTitle>
          </DialogHeader>

          {/* Question Image if exists */}
          {currentQuestion?.image_url && (
            <div className="my-3 flex justify-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <img
                src={currentQuestion.image_url}
                alt="توضيح السؤال"
                className="max-h-48 sm:max-h-56 object-contain rounded-xl"
              />
            </div>
          )}

          {/* Choices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            {currentQuestion?.choices.map((choice, idx) => {
              const isSelected = selectedChoiceId === choice.id;
              const isCorrect = choice.is_correct;

              let btnStyle =
                "border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800";

              if (isAnswered) {
                if (isCorrect) {
                  btnStyle = "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-black";
                } else if (isSelected && !isCorrect) {
                  btnStyle = "border-2 border-rose-500 bg-rose-50 text-rose-800 font-bold";
                } else {
                  btnStyle = "border-2 border-slate-200 bg-slate-50 opacity-40 text-slate-400";
                }
              }

              return (
                <button
                  key={choice.id || idx}
                  onClick={() => handleAnswer(choice.id)}
                  disabled={isAnswered}
                  className={`p-4 rounded-2xl font-bold text-sm sm:text-base text-right transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer ${btnStyle}`}
                >
                  <span>{choice.text}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Video Lesson Button */}
          {currentQuestion?.wrong_reason && (
            <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed font-bold">
              💡 {currentQuestion.wrong_reason}
            </div>
          )}

          {currentQuestion?.explanation_url && (
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExplanationModal(true)}
                className="gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200"
              >
                <Video className="w-4 h-4" />
                <span>شاهد درس أو فيديو الشرح</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Explanation Modal */}
      <ExplanationModal
        isOpen={showExplanationModal}
        onClose={() => setShowExplanationModal(false)}
        questionText={currentQuestion?.text || ""}
        wrongReason={currentQuestion?.wrong_reason}
        explanationUrl={currentQuestion?.explanation_url}
      />
    </div>
  );
}
