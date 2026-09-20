import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowRight,
    Clock,
    Trophy,
    RefreshCw,
    Zap,
    Sparkles,
    Target,
    Award,
    CheckCircle2,
    XCircle,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Video,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { CertificateModal } from "@/components/exam/CertificateModal";
import { ExplanationModal } from "@/components/exam/ExplanationModal";
import {
    getSelectionDisplayText,
    getStoredSelectionContext,
    ensureStoredSelectionContext,
} from "@/lib/selection-context";
import {
    applySelectionFilters,
    getScopedHistoryIds,
    getScopedPayload,
    recordScopedHistory,
    resetScopedHistory,
} from "@/lib/selection-scope";

interface Question {
    id: string;
    question_text: string;
    question_image_url?: string;
    choice1: string;
    choice1_image_url?: string;
    choice2: string;
    choice2_image_url?: string;
    choice3: string;
    choice3_image_url?: string;
    choice4: string;
    choice4_image_url?: string;
    answer_explanation?: string;
    explanation_url?: string;
    correct_choice_index: number;
}

interface GameState {
    score: number;
    correctCount: number;
    answeringCount: number;
}

interface AnsweredQuestionRecord {
    question: Question;
    selectedChoiceIndex: number;
    isCorrect: boolean;
}

export default function SpeedChallenge() {
    const navigate = useNavigate();
    const selectionContext = useMemo(
        () => getStoredSelectionContext() || ensureStoredSelectionContext("nafis"),
        []
    );
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [timeLeft, setTimeLeft] = useState(60);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        correctCount: 0,
        answeringCount: 0,
    });

    const [initialTime, setInitialTime] = useState(60);
    const [isTimerPaused, setIsTimerPaused] = useState(false);
    const [studentName, setStudentName] = useState<string>("");
    const [showCertificateModal, setShowCertificateModal] = useState(false);

    // Answer & Feedback State during gameplay
    const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
    const [isAnsweringLocked, setIsAnsweringLocked] = useState(false);
    const [explanationCard, setExplanationCard] = useState<{
        correctChoiceText: string;
        explanation?: string;
        isCorrect: boolean;
    } | null>(null);

    // Post-game history & Review State
    const [answeredHistory, setAnsweredHistory] = useState<AnsweredQuestionRecord[]>([]);
    const [showReview, setShowReview] = useState(false);

    // Explanation Modal State
    const [explanationModalData, setExplanationModalData] = useState<{
        isOpen: boolean;
        questionText: string;
        wrongReason?: string | null;
        explanationUrl?: string | null;
    }>({
        isOpen: false,
        questionText: "",
        wrongReason: null,
        explanationUrl: null,
    });

    // Refs to always have latest values for async saves
    const scoreRef = useRef(0);
    const correctCountRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchConfigAndQuestions = async () => {
            // Preload audio
            await audioManager.preload();

            // Fetch student profile
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from("student_profiles")
                        .select("full_name")
                        .eq("id", user.id)
                        .maybeSingle();
                    if (profile?.full_name) {
                        setStudentName(profile.full_name);
                    }
                }
            } catch (e) {
                console.error("Error fetching student profile:", e);
            }

            // Fetch Config
            const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "speed_challenge_duration").maybeSingle();
            if (setting) {
                const duration = parseInt(setting.value) || 60;
                setInitialTime(duration);
                setTimeLeft(duration);
            }

            fetchQuestions();
        };

        fetchConfigAndQuestions();
        return () => stopTimer();
    }, [navigate, selectionContext]);

    useEffect(() => {
        if (isPlaying && !isTimerPaused && timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && isPlaying) {
            endGame();
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timeLeft, isPlaying, isTimerPaused]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("يجب تسجيل الدخول أولاً");
                setLoading(false);
                return;
            }

            // 1. Fetch all active questions (IDs only for performance)
            let { data: allQuestions, error } = await applySelectionFilters(
                supabase
                    .from("speed_challenge_questions")
                    .select("id")
                    .eq("is_active", true),
                selectionContext,
            );

            // Fallback 1: Query by grade_subject_id regardless of track_type
            if (!allQuestions || allQuestions.length === 0) {
                const retry = await supabase
                    .from("speed_challenge_questions")
                    .select("id")
                    .eq("is_active", true)
                    .eq("grade_subject_id", selectionContext.gradeSubjectId);
                if (retry.data && retry.data.length > 0) {
                    allQuestions = retry.data;
                }
            }

            // Fallback 2: Any active speed challenge questions
            if (!allQuestions || allQuestions.length === 0) {
                const anyRes = await supabase
                    .from("speed_challenge_questions")
                    .select("id")
                    .eq("is_active", true)
                    .limit(20);
                if (anyRes.data && anyRes.data.length > 0) {
                    allQuestions = anyRes.data;
                }
            }

            if (!allQuestions || allQuestions.length === 0) {
                toast.error("لا توجد أسئلة لتحدي السرعة حالياً");
                setLoading(false);
                return;
            }

            // 2. Fetch seen question IDs for this user
            const seenIds = await getScopedHistoryIds(
                session.user.id,
                "speed",
                selectionContext,
            );

            // 3. Filter unseen questions
            let availableQuestions = allQuestions.filter(q => !seenIds.has(q.id));

            // 4. Reset if needed (need at least 10 questions per stage)
            const requiredCount = 10;
            if (availableQuestions.length < requiredCount) {
                await resetScopedHistory(session.user.id, "speed", selectionContext);

                availableQuestions = allQuestions;
                // Silent reset - no notification to student
            }

            // 5. Fetch full data for available questions
            const availableIds = availableQuestions.map(q => q.id);
            const { data: fullQuestions, error: fullError } = await supabase
                .from("speed_challenge_questions")
                .select("*")
                .in("id", availableIds);

            if (fullError || !fullQuestions) {
                toast.error("فشل تحميل بيانات الأسئلة");
                setLoading(false);
                return;
            }

            const typedQuestions = (fullQuestions || []) as Question[];

            // 6. Shuffle with Fisher-Yates
            const shuffled = [...typedQuestions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // 7. Select 10 questions for this stage
            const selectedQuestions = shuffled.slice(0, requiredCount);

            // 8. Record seen questions
            await recordScopedHistory(
                session.user.id,
                "speed",
                selectedQuestions.map((question) => question.id),
                selectionContext,
            );

            console.log(`Pool: ${typedQuestions.length}, Selected: ${selectedQuestions.length}`);

            setQuestions(selectedQuestions);
            setLoading(false);
            setIsPlaying(true);
            setIsTimerPaused(false);
            setCurrentIndex(0);
            setIsGameOver(false);
            setTimeLeft(initialTime);
            setSelectedChoiceIdx(null);
            setIsAnsweringLocked(false);
            setExplanationCard(null);
            setAnsweredHistory([]);
            setShowReview(false);
        } catch (error) {
            console.error(error);
            toast.error("فشل تحميل الأسئلة");
            setLoading(false);
        }
    };

    const startGame = () => {
        setIsPlaying(true);
        setIsTimerPaused(false);
        setTimeLeft(initialTime);
        setGameState({
            score: 0,
            correctCount: 0,
            answeringCount: 0,
        });
        scoreRef.current = 0;
        correctCountRef.current = 0;
        setCurrentIndex(0);
        setIsGameOver(false);
        setSelectedChoiceIdx(null);
        setIsAnsweringLocked(false);
        setExplanationCard(null);
        setAnsweredHistory([]);
        setShowReview(false);
        fetchQuestions();
    };

    const stopTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const endGame = () => {
        setIsPlaying(false);
        setIsTimerPaused(false);
        setIsGameOver(true);
        stopTimer();
        toast("انتهى وقت تحدي السرعة!");
        saveResult();
    };

    const handleAnswer = (choiceIndex: number) => {
        if (isGameOver || !isPlaying || isAnsweringLocked) return;

        const currentQ = questions[currentIndex];
        const isCorrect = choiceIndex === currentQ.correct_choice_index;
        const correctChoiceKey = `choice${currentQ.correct_choice_index}` as keyof Question;
        const correctChoiceText = (currentQ[correctChoiceKey] as string) || "";
        const explanation = currentQ.answer_explanation?.trim();

        setIsAnsweringLocked(true);
        setSelectedChoiceIdx(choiceIndex);

        // Record question for post-game review
        setAnsweredHistory(prev => [
            ...prev,
            {
                question: currentQ,
                selectedChoiceIndex: choiceIndex,
                isCorrect,
            }
        ]);

        if (isCorrect) {
            audioManager.playCorrect();
            const newScore = gameState.score + 1;
            const newCorrect = gameState.correctCount + 1;
            const newAnswering = gameState.answeringCount + 1;

            scoreRef.current = newScore;
            correctCountRef.current = newCorrect;
            setGameState({
                score: newScore,
                correctCount: newCorrect,
                answeringCount: newAnswering,
            });

            setExplanationCard({
                correctChoiceText,
                explanation,
                isCorrect: true,
            });

            // Smooth transition to next question on correct answer
            setTimeout(() => {
                goToNextQuestion();
            }, 750);
        } else {
            audioManager.playWrong();
            // Pause timer so the student has time to read the solution explanation!
            setIsTimerPaused(true);

            const newScore = Math.max(0, gameState.score - 1);
            const newAnswering = gameState.answeringCount + 1;

            scoreRef.current = newScore;
            setGameState(prev => ({
                ...prev,
                score: newScore,
                answeringCount: newAnswering,
            }));

            // Show explanation feedback card with solution details
            setExplanationCard({
                correctChoiceText,
                explanation,
                isCorrect: false,
            });
        }
    };

    const goToNextQuestion = () => {
        setExplanationCard(null);
        setSelectedChoiceIdx(null);
        setIsAnsweringLocked(false);
        setIsTimerPaused(false);

        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(prev => prev + 1);
        } else {
            endGame();
        }
    };

    const saveResult = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && selectionContext) {
                const { data: profile } = await supabase
                    .from("student_profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .maybeSingle();
                const resolvedStudentName = profile?.full_name || "طالب";
                const challengeTotal = questions.length || 10;
                const { data: attemptData, error: insertError } = await (supabase.from("game_attempts").insert({
                    user_id: user.id,
                    game_type: "speed",
                    score: scoreRef.current,
                    correct_count: correctCountRef.current,
                    total_questions: challengeTotal,
                    duration_seconds: initialTime - timeLeft,
                    ...getScopedPayload(selectionContext),
                    metadata: {
                        student_name: resolvedStudentName,
                        selection_context: getSelectionDisplayText(selectionContext),
                        game_name: "تحدي السرعة",
                    }
                }) as any).select().single();

                // Send email notification
                if (attemptData && !insertError) {
                    console.log("[Speed Challenge] Sending email for attempt:", attemptData.id);
                    await supabase.functions.invoke('exam-finish', {
                        body: { attempt_id: attemptData.id, is_game: true }
                    });
                }

                if (scoreRef.current > 0) {
                    confetti({ particleCount: 150, spread: 80 });
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 flex flex-col" dir="rtl">
            {/* Floating Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-orange-300/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
                <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${15 + Math.random() * 25}px`,
                            height: `${15 + Math.random() * 25}px`,
                            background: ['#fbbf24', '#f97316', '#eab308', '#f472b6', '#60a5fa'][Math.floor(Math.random() * 5)],
                            animationDelay: `${Math.random() * 3}s`,
                            opacity: 0.15,
                            filter: 'blur(1px)'
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-white/50 py-4 px-6 sticky top-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-white/80">
                        <Link to="/student/dashboard">
                            <ArrowRight className="w-5 h-5 ml-1" />
                            <span className="font-bold">العودة</span>
                        </Link>
                    </Button>
                    
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-black text-slate-800 hidden md:block">تحدي السرعة العلمي</h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                            isTimerPaused 
                                ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400/40" 
                                : "bg-gradient-to-r from-red-100 to-orange-100 border-red-200"
                        }`}>
                            <Clock className={`w-5 h-5 ${isTimerPaused ? "text-amber-600" : "text-red-500 animate-pulse"}`} />
                            <span className={`font-black text-xl ${isTimerPaused ? "text-amber-700" : "text-red-600"}`}>
                                {timeLeft}
                            </span>
                            <span className={`text-xs font-bold ${isTimerPaused ? "text-amber-600" : "text-red-500"}`}>
                                {isTimerPaused ? "مؤقت" : "ث"}
                            </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 px-4 py-2 rounded-full border border-emerald-200">
                            <span className="font-black text-xl text-emerald-600">{gameState.score}</span>
                            <span className="text-xs text-emerald-500 font-bold">نقطة</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 container max-w-3xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center relative z-10">
                {loading ? (
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-orange-600 font-bold">جاري التحميل...</p>
                    </div>
                ) : isGameOver ? (
                    (() => {
                        const totalCount = questions.length || 10;
                        const percentage = totalCount > 0
                            ? Math.round((gameState.correctCount / totalCount) * 100)
                            : 0;

                        return (
                            <Card className="p-6 sm:p-8 text-center space-y-6 max-w-2xl w-full bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-orange-500/20">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">
                                        أحسنت يا {studentName || "بطل"}!
                                    </h2>
                                    <p className="text-slate-600 font-medium text-sm sm:text-base">
                                        أكملت تحدي السرعة بنجاح واستطعت الإجابة تحت ضغط الوقت!
                                    </p>
                                </div>

                                <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-5 sm:p-6 rounded-2xl border border-orange-200 shadow-xs">
                                    <div className="text-xs sm:text-sm text-orange-700 mb-1.5 font-bold">النتيجة والنسبة النهائية</div>
                                    <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-600">
                                        {percentage}%
                                    </div>
                                    <div className="text-sm sm:text-base text-slate-700 font-bold mt-2">
                                        {gameState.correctCount} من أصل {totalCount} أسئلة صحيحة ({gameState.score} نقطة)
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-xs text-center">
                                        <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                                            {gameState.correctCount}
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-700 font-bold mt-1">إجابات صحيحة ✓</div>
                                    </Card>
                                    <Card className="p-4 bg-gradient-to-br from-rose-50 to-red-50 border-rose-200 shadow-xs text-center">
                                        <div className="text-3xl sm:text-4xl font-black text-rose-600">
                                            {Math.max(0, totalCount - gameState.correctCount)}
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-700 font-bold mt-1">خاطئة / لم تُحل ❌</div>
                                    </Card>
                                </div>

                                {/* Certificate Button - Direct Access */}
                                <Button
                                    onClick={() => setShowCertificateModal(true)}
                                    className="w-full min-h-[3.5rem] h-auto py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-base sm:text-lg shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 border-2 border-amber-300 text-center leading-snug whitespace-normal transition-all transform hover:scale-[1.01] active:scale-95"
                                >
                                    <Award className="w-6 h-6 shrink-0 text-slate-950" />
                                    <span>عرض وتحميل شهادة الشكر والتقدير</span>
                                </Button>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Button
                                        onClick={startGame}
                                        className="h-13 text-base sm:text-lg font-black rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 text-white flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-5 h-5 shrink-0" />
                                        <span>بدء تحدي جديد</span>
                                    </Button>

                                    <Button
                                        asChild
                                        variant="outline"
                                        className="h-13 text-base sm:text-lg font-bold rounded-xl border-2 hover:bg-slate-50 text-slate-800"
                                    >
                                        <Link to="/student/dashboard" className="flex items-center justify-center gap-2">
                                            <Target className="w-5 h-5" />
                                            <span>لوحة التحكم</span>
                                        </Link>
                                    </Button>
                                </div>

                                {/* Review Questions & Solutions Button */}
                                {answeredHistory.length > 0 && (
                                    <div className="pt-2 text-right border-t border-slate-200">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowReview(!showReview)}
                                            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-black text-sm sm:text-base border border-slate-200"
                                        >
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-indigo-600" />
                                                <span>مراجعة الأسئلة وتفسير الحلول والتغذية الراجعة ({answeredHistory.length} سؤال)</span>
                                            </div>
                                            {showReview ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                                        </Button>

                                        {showReview && (
                                            <div className="space-y-3 mt-4 text-right animate-in fade-in slide-in-from-top-2 duration-300">
                                                {answeredHistory.map((item, idx) => {
                                                    const correctChoiceKey = `choice${item.question.correct_choice_index}` as keyof Question;
                                                    const userChoiceKey = `choice${item.selectedChoiceIndex}` as keyof Question;
                                                    const correctText = (item.question[correctChoiceKey] as string) || "";
                                                    const userText = (item.question[userChoiceKey] as string) || "";

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                                                                item.isCorrect
                                                                    ? "bg-emerald-50/60 border-emerald-200"
                                                                    : "bg-rose-50/60 border-rose-200"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-start gap-2 flex-1">
                                                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                                                        {idx + 1}
                                                                    </span>
                                                                    <span className="font-bold text-slate-900 text-sm sm:text-base leading-relaxed">
                                                                        {item.question.question_text}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                                                                    item.isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                                                                }`}>
                                                                    {item.isCorrect ? "صحيحة ✓" : "خاطئة ❌"}
                                                                </span>
                                                            </div>

                                                            {/* User answer vs Correct answer */}
                                                            <div className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm font-bold pt-1">
                                                                <div className={`p-2 rounded-xl border ${item.isCorrect ? "bg-emerald-100/70 border-emerald-300 text-emerald-900" : "bg-rose-100/70 border-rose-300 text-rose-900"}`}>
                                                                    إجابتك: {userText} {item.isCorrect ? "✓" : "❌"}
                                                                </div>
                                                                {!item.isCorrect && (
                                                                    <div className="p-2 rounded-xl border bg-emerald-100/70 border-emerald-300 text-emerald-900">
                                                                        الإجابة الصحيحة: {correctText} ✓
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Solution Explanation Box */}
                                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                                                                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                                                                    <HelpCircle className="w-4 h-4 text-amber-600" />
                                                                    <span>تفسير الحل والتغذية الراجعة:</span>
                                                                </div>
                                                                <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                                                                    {item.question.answer_explanation?.trim() || `الإجابة الصحيحة المعتمدة هي: ${correctText}`}
                                                                </p>
                                                                {(item.question.explanation_url || (item.question.answer_explanation && item.question.answer_explanation.includes("http"))) && (
                                                                    <div className="pt-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setExplanationModalData({
                                                                                    isOpen: true,
                                                                                    questionText: item.question.question_text,
                                                                                    wrongReason: item.question.answer_explanation || null,
                                                                                    explanationUrl: item.question.explanation_url || null,
                                                                                });
                                                                            }}
                                                                            className="gap-1.5 text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border-amber-300 h-8 px-3"
                                                                        >
                                                                            <Video className="w-3.5 h-3.5 text-rose-500" />
                                                                            <span>🎥 مشاهدة فيديو الشرح والتوضيح</span>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <CertificateModal
                                    isOpen={showCertificateModal}
                                    onClose={() => setShowCertificateModal(false)}
                                    studentName={studentName || "طالب متميز"}
                                    score={gameState.correctCount}
                                    totalQuestions={totalCount}
                                    percentage={percentage}
                                    examTitle="تحدي السرعة العلمي - منصة براين ساينس"
                                />
                            </Card>
                        );
                    })()
                ) : questions.length > 0 ? (
                    <div className="w-full space-y-6 animate-fade-in">
                        {/* Question Card */}
                        <Card className="p-6 md:p-8 bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                            {questions[currentIndex].question_image_url && (
                                <div className="flex justify-center mb-6">
                                    <img
                                        src={questions[currentIndex].question_image_url}
                                        alt="Question Illustration"
                                        className="max-h-48 rounded-xl shadow-md object-contain bg-white"
                                    />
                                </div>
                            )}

                            <div className="text-center">
                                <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 font-bold text-sm mb-4">
                                    سؤال {currentIndex + 1} / {questions.length}
                                </span>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-relaxed">
                                    {questions[currentIndex].question_text}
                                </h2>
                            </div>
                        </Card>

                        {/* Choices Grid */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            {[1, 2, 3, 4].map((idx) => {
                                const choiceKey = `choice${idx}` as keyof Question;
                                const choiceImageKey = `choice${idx}_image_url` as keyof Question;

                                const text = questions[currentIndex][choiceKey];
                                const imageUrl = questions[currentIndex][choiceImageKey];

                                if (!text && !imageUrl) return null;

                                const isSelected = selectedChoiceIdx === idx;
                                const isThisChoiceCorrect = idx === questions[currentIndex].correct_choice_index;

                                let borderAndBg = "bg-white/90 hover:shadow-2xl hover:scale-[1.02] border-transparent";
                                if (explanationCard) {
                                    if (isThisChoiceCorrect) {
                                        borderAndBg = "bg-emerald-50 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/40 text-emerald-950 scale-[1.02]";
                                    } else if (isSelected && !explanationCard.isCorrect) {
                                        borderAndBg = "bg-rose-50 border-2 border-rose-500 shadow-md ring-2 ring-rose-400/40 text-rose-950 opacity-90";
                                    } else {
                                        borderAndBg = "bg-white/60 border-slate-200 opacity-60";
                                    }
                                }

                                return (
                                    <Card
                                        key={idx}
                                        onClick={() => !explanationCard && handleAnswer(idx)}
                                        className={`cursor-pointer p-3 md:p-6 backdrop-blur shadow-lg transition-all duration-300 flex flex-col gap-2 items-center justify-center min-h-[100px] md:min-h-[120px] ${borderAndBg}`}
                                    >
                                        {imageUrl && (
                                            <img
                                                src={imageUrl as string}
                                                alt={`Choice ${idx}`}
                                                className="h-16 md:h-24 w-auto object-contain bg-white rounded-lg"
                                            />
                                        )}
                                        {text && (
                                            <span className="text-sm md:text-xl font-bold text-slate-800 text-center line-clamp-2">
                                                {text}
                                            </span>
                                        )}
                                        {explanationCard && isThisChoiceCorrect && (
                                            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full mt-1">
                                                الإجابة الصحيحة ✓
                                            </span>
                                        )}
                                        {explanationCard && isSelected && !explanationCard.isCorrect && (
                                            <span className="text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full mt-1">
                                                إجابتك ❌
                                            </span>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Real-time Explanation Card when answered */}
                        {explanationCard && (
                            <Card className={`p-4 md:p-5 rounded-2xl shadow-xl border-2 transition-all animate-in fade-in slide-in-from-bottom-2 ${
                                explanationCard.isCorrect
                                    ? "bg-emerald-50/95 border-emerald-300 text-emerald-950"
                                    : "bg-amber-50/95 border-amber-300 text-amber-950"
                            }`}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1 text-right">
                                        <div className="flex items-center gap-2">
                                            {explanationCard.isCorrect ? (
                                                <span className="flex items-center gap-1.5 text-sm sm:text-base font-black text-emerald-800">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                    إجابة صحيحة! أحسنت ⚡
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-sm sm:text-base font-black text-amber-900">
                                                    <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                                    تفسير الحل والتغذية الراجعة (تم إيقاف الوقت مؤقتاً لتتمكن من القراءة):
                                                </span>
                                            )}
                                        </div>

                                        {!explanationCard.isCorrect && (
                                            <p className="text-xs sm:text-sm font-bold text-slate-700">
                                                الإجابة الصحيحة:{" "}
                                                <span className="text-emerald-700 font-black">
                                                    {explanationCard.correctChoiceText}
                                                </span>
                                            </p>
                                        )}

                                        {explanationCard.explanation && (
                                            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-200/70">
                                                <span className="font-black text-amber-900 ml-1">💡 تفسير الحل:</span>
                                                {explanationCard.explanation}
                                            </p>
                                        )}
                                    </div>

                                    {!explanationCard.isCorrect && (
                                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                                            {(questions[currentIndex]?.explanation_url || (explanationCard.explanation && explanationCard.explanation.includes("http"))) && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsTimerPaused(true);
                                                        setExplanationModalData({
                                                            isOpen: true,
                                                            questionText: questions[currentIndex].question_text,
                                                            wrongReason: explanationCard.explanation || null,
                                                            explanationUrl: questions[currentIndex].explanation_url || null,
                                                        });
                                                    }}
                                                    className="gap-1.5 text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border-amber-300 shadow-xs h-11 px-4 rounded-xl"
                                                >
                                                    <Video className="w-4 h-4 text-rose-500" />
                                                    <span>🎥 شاهد فيديو الشرح</span>
                                                </Button>
                                            )}
                                            <Button
                                                onClick={goToNextQuestion}
                                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black h-11 px-5 rounded-xl shrink-0 shadow-md gap-1.5 text-sm w-full sm:w-auto mr-auto"
                                            >
                                                <span>متابعة للسؤال التالي</span>
                                                <ArrowRight className="w-4 h-4 rotate-180" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                ) : (
                    <Card className="p-8 text-center bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                        <p className="text-slate-600 text-lg">لا توجد أسئلة.</p>
                    </Card>
                )}
            </main>

            <ExplanationModal
                isOpen={explanationModalData.isOpen}
                onClose={() => setExplanationModalData(prev => ({ ...prev, isOpen: false }))}
                questionText={explanationModalData.questionText}
                wrongReason={explanationModalData.wrongReason}
                explanationUrl={explanationModalData.explanationUrl}
            />
        </div>
    );
}
