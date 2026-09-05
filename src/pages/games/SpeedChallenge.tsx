import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Clock, Trophy, RefreshCw, Zap, Sparkles, Target, Award } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { CertificateModal } from "@/components/exam/CertificateModal";
import {
    getSelectionDisplayText,
    getStoredSelectionContext,
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
    correct_choice_index: number;
}

interface GameState {
    score: number;
    correctCount: number;
    answeringCount: number;
    level: number;
    stage: number;
}

export default function SpeedChallenge() {
    const navigate = useNavigate();
    const selectionContext = useMemo(() => getStoredSelectionContext(), []);
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
        level: 1,
        stage: 1
    });

    const [initialTime, setInitialTime] = useState(60);
    const [questionsWithErrors, setQuestionsWithErrors] = useState<Set<string>>(new Set());
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string>("");
    const [showCertificateModal, setShowCertificateModal] = useState(false);

    // Refs to always have latest values for async saves
    const scoreRef = useRef(0);
    const correctCountRef = useRef(0);
    const answeringCountRef = useRef(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchConfigAndQuestions = async () => {
            if (!selectionContext) {
                navigate("/student/dashboard", { replace: true });
                return;
            }

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
        if (isPlaying && timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && isPlaying) {
            endGame();
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, [timeLeft, isPlaying]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            if (!selectionContext) {
                navigate("/student/dashboard");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("يجب تسجيل الدخول أولاً");
                setLoading(false);
                return;
            }

            // 1. Fetch all active questions (IDs only for performance)
            const { data: allQuestions, error } = await applySelectionFilters(
                supabase
                    .from("speed_challenge_questions")
                    .select("id")
                    .eq("is_active", true),
                selectionContext,
            );

            if (error || !allQuestions || allQuestions.length === 0) {
                toast.error("لا توجد أسئلة متاحة");
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

            // 4. Reset if needed (need at least 20 questions)
            const requiredCount = 5;
            if (availableQuestions.length < requiredCount) {
                await resetScopedHistory(session.user.id, "speed", selectionContext);

                availableQuestions = allQuestions;
                // Silent reset - no notification to student
            }

            // 5. Fetch full data for available questions
            const availableIds = availableQuestions.map(q => q.id);
            const { data: fullQuestions, error: fullError } = await applySelectionFilters(
                supabase
                    .from("speed_challenge_questions")
                    .select("*")
                    .in("id", availableIds),
                selectionContext,
            );

            if (fullError || !fullQuestions) {
                toast.error("فشل تحميل بيانات الأسئلة");
                setLoading(false);
                return;
            }

            // 6. Shuffle with Fisher-Yates
            const shuffled = [...fullQuestions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // 7. Select first 20
            const selectedQuestions = shuffled.slice(0, requiredCount);

            // 8. Record seen questions
            await recordScopedHistory(
                session.user.id,
                "speed",
                selectedQuestions.map((question) => question.id),
                selectionContext,
            );

            console.log(`Pool: ${fullQuestions.length}, Selected: ${selectedQuestions.length}`);

            setQuestions(selectedQuestions);
            setLoading(false);
            setIsPlaying(true);
            setCurrentIndex(0);
            setIsGameOver(false);
            setTimeLeft(initialTime);
            setFeedbackMessage(null);
        } catch (error) {
            console.error(error);
            toast.error("فشل تحميل الأسئلة");
            setLoading(false);
        }
    };

    const startGame = () => {
        setIsPlaying(true);
        setTimeLeft(initialTime);
        setGameState({ score: 0, correctCount: 0, answeringCount: 0, level: 1, stage: 1 });
        setCurrentIndex(0);
        setIsGameOver(false);
        setFeedbackMessage(null);
    };

    const startNextStage = () => {
        setGameState(prev => ({
            ...prev,
            stage: prev.stage + 1
        }));
        setQuestionsWithErrors(new Set());
        setFeedbackMessage(null);
        fetchQuestions();
    };

    const stopTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const endGame = () => {
        setIsPlaying(false);
        setIsGameOver(true);
        stopTimer();
        toast("انتهى الوقت!");
        saveResult();
    };

    const handleAnswer = (choiceIndex: number) => {
        if (isGameOver || !isPlaying) return;

        const currentQ = questions[currentIndex];
        const isCorrect = choiceIndex === currentQ.correct_choice_index;

        if (isCorrect) {
            setFeedbackMessage(null);
            audioManager.playCorrect();
            toast.success("صح!", { duration: 500, position: 'top-center' });
            
            // Check if previously answered wrong
            const wasPreviouslyWrong = questionsWithErrors.has(currentQ.id);
            
            // Only count as correct if FIRST TIME correct (not after wrong)
            const newScore = wasPreviouslyWrong ? gameState.score : gameState.score + 1;
            const newCorrect = wasPreviouslyWrong ? gameState.correctCount : gameState.correctCount + 1;
            const newAnswering = gameState.answeringCount + 1;
            scoreRef.current = newScore;
            correctCountRef.current = newCorrect;
            answeringCountRef.current = newAnswering;
            setGameState(prev => ({
                ...prev,
                score: newScore,
                correctCount: newCorrect,
                answeringCount: newAnswering
            }));

            // Only move to next question if correct
            if (currentIndex + 1 < questions.length) {
                setCurrentIndex(prev => prev + 1);
            } else {
                endGame();
            }
        } else {
            audioManager.playWrong();
            const correctChoice = currentQ[`choice${currentQ.correct_choice_index}` as keyof Question] as string;
            const explanation = currentQ.answer_explanation?.trim();
            const message = explanation
                ? explanation
                : correctChoice
                  ? `الإجابة الصحيحة هي: ${correctChoice}`
                  : "خطأ! حاول مرة أخرى";
            setFeedbackMessage(message);
            toast.error(message, { duration: 2500, position: 'top-center' });

            // Only deduct score if this question hasn't been answered wrong before
            if (!questionsWithErrors.has(currentQ.id)) {
                const newScore = Math.max(0, gameState.score - 1);
                const newAnswering = gameState.answeringCount + 1;
                scoreRef.current = newScore;
                answeringCountRef.current = newAnswering;
                setGameState(prev => ({
                    ...prev,
                    score: newScore,
                    answeringCount: newAnswering
                }));

                // Mark this question as having at least one error
                setQuestionsWithErrors(prev => new Set(prev).add(currentQ.id));
            } else {
                // Still count the attempt even if no penalty
                const newAnswering = gameState.answeringCount + 1;
                answeringCountRef.current = newAnswering;
                setGameState(prev => ({
                    ...prev,
                    answeringCount: newAnswering
                }));
            }
            // Do NOT move to next question
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
                const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
                    user_id: user.id,
                    game_type: "speed",
                    score: scoreRef.current,
                    correct_count: correctCountRef.current,
                    total_questions: answeringCountRef.current,
                    duration_seconds: initialTime - timeLeft,
                    ...getScopedPayload(selectionContext),
                    metadata: {
                        student_name: resolvedStudentName,
                        selection_context: getSelectionDisplayText(selectionContext),
                        game_name: "تحدي السرعة"
                    }
                }).select().single() as any;

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
                        <h1 className="text-xl font-black text-slate-800 hidden md:block">تحدي السرعة - المرحلة {gameState.stage}</h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gradient-to-r from-red-100 to-orange-100 px-4 py-2 rounded-full border border-red-200">
                            <Clock className="w-5 h-5 text-red-500 animate-pulse" />
                            <span className="font-black text-xl text-red-600">{timeLeft}</span>
                            <span className="text-xs text-red-500 font-bold">ث</span>
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
                    <Card className="p-10 text-center space-y-6 max-w-md w-full bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-orange-500/20">
                        <div>
                            <h2 className="text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">أحسنت يا {studentName || "بطل"}!</h2>
                            <p className="text-slate-500">أكملت المرحلة {gameState.stage} من تحدي السرعة بنجاح.</p>
                        </div>

                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-200">
                            <div className="text-sm text-orange-700 mb-2 font-bold">النسبة والدرجة</div>
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-600">
                                {gameState.answeringCount > 0 ? Math.round((gameState.correctCount / gameState.answeringCount) * 100) : 100}%
                            </div>
                            <div className="text-sm text-slate-500 font-bold mt-2">
                                {gameState.correctCount} من {gameState.answeringCount} أسئلة صحيحة ({gameState.score} نقطة)
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                                <div className="text-2xl font-black text-emerald-600">{gameState.correctCount}</div>
                                <div className="text-xs text-slate-500 font-bold">صحيحة</div>
                            </Card>
                            <Card className="p-4 bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
                                <div className="text-2xl font-black text-rose-600">{gameState.answeringCount - gameState.correctCount}</div>
                                <div className="text-xs text-slate-500 font-bold">خاطئة</div>
                            </Card>
                        </div>

                        {/* Certificate Button */}
                        <Button
                            onClick={() => setShowCertificateModal(true)}
                            className="w-full h-14 text-lg sm:text-xl font-black rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/20 text-slate-950"
                        >
                            <Award className="w-6 h-6 ml-3" />
                            🎓 عرض وتحميل شهادة الشكر والتقدير
                        </Button>
                        
                        <div className="flex flex-col gap-3">
                            <Button onClick={startNextStage} className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
                                <Sparkles className="w-6 h-6 ml-3" />
                                الانتقال للمرحلة {gameState.stage + 1}
                            </Button>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Button onClick={() => window.location.reload()} variant="outline" className="h-12 text-lg rounded-xl font-bold border-2">
                                    <RefreshCw className="w-5 h-5 ml-2" />
                                    إعادة اللعبة
                                </Button>
                                <Button asChild className="h-12 text-lg rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                                    <Link to="/student/dashboard" className="flex items-center justify-center font-bold">القائمة</Link>
                                </Button>
                            </div>
                        </div>

                        <CertificateModal
                            isOpen={showCertificateModal}
                            onClose={() => setShowCertificateModal(false)}
                            studentName={studentName || "طالب متميز"}
                            score={gameState.correctCount}
                            totalQuestions={gameState.answeringCount || 1}
                            percentage={gameState.answeringCount > 0 ? Math.round((gameState.correctCount / gameState.answeringCount) * 100) : 100}
                            examTitle={`تحدي السرعة العلمي (المرحلة ${gameState.stage}) - منصة SCIRISE`}
                        />
                    </Card>
                ) : questions.length > 0 ? (
                    <div className="w-full space-y-8 animate-fade-in">
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

                        {feedbackMessage && (
                            <Card className="border-0 bg-red-50 p-4 text-center shadow-lg shadow-red-500/10">
                                <p className="font-bold text-red-700">{feedbackMessage}</p>
                            </Card>
                        )}

                        {/* Choices Grid */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            {[1, 2, 3, 4].map((idx) => {
                                const choiceKey = `choice${idx}` as keyof Question;
                                const choiceImageKey = `choice${idx}_image_url` as keyof Question;

                                const text = questions[currentIndex][choiceKey];
                                const imageUrl = questions[currentIndex][choiceImageKey];

                                return (
                                    <Card
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        className="cursor-pointer p-3 md:p-6 bg-white/90 backdrop-blur border-0 shadow-lg hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-2 items-center justify-center min-h-[100px] md:min-h-[120px]"
                                    >
                                        {imageUrl && (
                                            <img src={(imageUrl as string)} alt={`Choice ${idx}`} className="h-16 md:h-24 w-auto object-contain bg-white rounded-lg" />
                                        )}
                                        {text && <span className="text-sm md:text-xl font-bold text-slate-700 text-center line-clamp-2">{text}</span>}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <Card className="p-8 text-center bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                        <p className="text-slate-600 text-lg">لا توجد أسئلة.</p>
                    </Card>
                )}
            </main>
        </div>
    );
}
