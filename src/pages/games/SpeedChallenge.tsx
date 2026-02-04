
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Clock, Trophy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";

interface Question {
    id: string;
    question_text: string;
    choice1: string;
    choice2: string;
    choice3: string;
    choice4: string;
    correct_choice_index: number;
}

interface GameState {
    score: number;
    correctCount: number;
    answeringCount: number;
    level: number;
}

export default function SpeedChallenge() {
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
        level: 1
    });

    const [initialTime, setInitialTime] = useState(60);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchConfigAndQuestions = async () => {
            // Preload audio
            await audioManager.preload();

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
    }, []);

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
            const { data, error } = await supabase
                .from("speed_challenge_questions")
                .select("*")
                .eq("is_active", true);

            let loadedQuestions = data || [];

            if (loadedQuestions.length === 0) {
                loadedQuestions = [
                    { id: 's1', question_text: 'ما هو العنصر الذي رمزه Au؟', choice1: 'فضة', choice2: 'ذهب', choice3: 'نحاس', choice4: 'ألومنيوم', correct_choice_index: 2 },
                    { id: 's2', question_text: 'ما هو العدد الذري للهيدروجين؟', choice1: '1', choice2: '2', choice3: '3', choice4: '4', correct_choice_index: 1 },
                    { id: 's3', question_text: 'أي الغازات التالية خامل؟', choice1: 'أكسجين', choice2: 'نيتروجين', choice3: 'هيليوم', choice4: 'هيدروجين', correct_choice_index: 3 },
                    { id: 's4', question_text: 'كم عدد ألوان الطيف؟', choice1: '5', choice2: '6', choice3: '7', choice4: '8', correct_choice_index: 3 },
                    { id: 's5', question_text: 'ما هو أقرب كوكب للشمس؟', choice1: 'الأرض', choice2: 'المريخ', choice3: 'عطارد', choice4: 'الزهرة', correct_choice_index: 3 },
                ] as any;
            }

            // Robust Fisher-Yates Shuffle
            const shuffled = [...loadedQuestions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Select up to 20 questions
            const selectedQuestions = shuffled.slice(0, 20);

            console.log(`Loaded ${loadedQuestions.length} questions, selected ${selectedQuestions.length}`);

            setQuestions(selectedQuestions);
            setLoading(false);
            // Don't auto start, wait for logic or keep current behavior?
            // Original code called startGame() here, which reset time to 60.
            // We should use initialTime. Because simple useEffect order, initialTime might be set later? 
            // We called fetchConfigAndQuestions, so initialTime updates correctly.
            // But startGame() resets it. Let's update startGame.
            setIsPlaying(true);
            setGameState({ score: 0, correctCount: 0, answeringCount: 0, level: 1 });
            setCurrentIndex(0);
            setIsGameOver(false);
        } catch (error) {
            console.error(error);
            toast.error("فشل تحميل الأسئلة");
            setLoading(false);
        }
    };

    const startGame = () => {
        setIsPlaying(true);
        setTimeLeft(initialTime); // Use dynamic initial time
        setGameState({ score: 0, correctCount: 0, answeringCount: 0, level: 1 });
        setCurrentIndex(0);
        setIsGameOver(false);
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
            audioManager.playCorrect();
            toast.success("صح!", { duration: 500, position: 'top-center' });
            setGameState(prev => ({
                ...prev,
                score: prev.score + 1,
                correctCount: prev.correctCount + 1,
                answeringCount: prev.answeringCount + 1
            }));

            // Only move to next question if correct
            if (currentIndex + 1 < questions.length) {
                setCurrentIndex(prev => prev + 1);
            } else {
                endGame();
            }
        } else {
            audioManager.playWrong();
            toast.error("خطأ! حاول مرة أخرى", { duration: 500, position: 'top-center' });
            setGameState(prev => ({
                ...prev,
                score: Math.max(0, prev.score - 1), // Deduct 1 point, min 0
                answeringCount: prev.answeringCount + 1
            }));
            // Do NOT move to next question
        }
    };

    const saveResult = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
                    user_id: user.id,
                    game_type: "speed",
                    score: gameState.score,
                    correct_count: gameState.correctCount,
                    total_questions: gameState.answeringCount,
                    duration_seconds: initialTime - timeLeft
                }).select().single();

                // Send email notification
                if (attemptData && !insertError) {
                    console.log("[Speed Challenge] Sending email for attempt:", attemptData.id);
                    await supabase.functions.invoke('exam-finish', {
                        body: { attempt_id: attemptData.id, is_game: true }
                    });
                }

                if (gameState.score > 0) {
                    confetti({ particleCount: 150, spread: 80 });
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            <div className="bg-white border-b py-4 px-6 shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="rounded-full">
                        <Link to="/student/dashboard">
                            <ArrowRight className="w-5 h-5 ml-1" />
                            الخروج
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-bold text-red-500 flex items-center gap-2">
                            <Clock className="w-6 h-6 animate-pulse" />
                            {timeLeft} ثانية
                        </div>
                    </div>
                    <div className="font-bold text-lg text-green-600">{gameState.score} نقطة</div>
                </div>
            </div>

            <main className="flex-1 container max-w-3xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
                {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                ) : isGameOver ? (
                    <Card className="p-8 text-center space-y-6 max-w-md w-full animate-bounce-in">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                            <Trophy className="w-10 h-10 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-2">انتهى التحدي!</h2>
                            <p className="text-muted-foreground">أجبت على {gameState.answeringCount} أسئلة.</p>
                        </div>
                        <div className="text-4xl font-bold text-primary">
                            {gameState.score} <span className="text-lg text-muted-foreground">نقطة</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl flex justify-around">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{gameState.correctCount}</div>
                                <div className="text-xs text-muted-foreground">إجابة صحيحة</div>
                            </div>
                            <div className="w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{gameState.answeringCount - gameState.correctCount}</div>
                                <div className="text-xs text-muted-foreground">إجابة خاطئة</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button onClick={fetchQuestions} variant="outline" className="w-full">
                                <RefreshCw className="w-4 h-4 ml-2" />
                                إعادة اللعب
                            </Button>
                            <Button asChild className="w-full">
                                <Link to="/student/dashboard">العودة للقائمة</Link>
                            </Button>
                        </div>
                    </Card>
                ) : questions.length > 0 ? (
                    <div className="w-full space-y-8 animate-fade-in">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold leading-tight">{questions[currentIndex].question_text}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((idx) => {
                                const choiceKey = `choice${idx}` as keyof Question;
                                return (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        className="h-20 text-xl font-semibold hover:bg-primary hover:text-white transition-all transform hover:scale-105"
                                        onClick={() => handleAnswer(idx)}
                                    >
                                        {questions[currentIndex][choiceKey]}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p>لا توجد أسئلة.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
