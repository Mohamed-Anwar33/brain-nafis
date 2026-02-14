
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";

interface Question {
    id: string;
    left_text: string;
    right_text: string;
    left_image_url?: string;
    right_image_url?: string;
}

interface GameState {
    score: number;
    correctAnswers: number;
    level: number;
}

export default function MatchingGame() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [leftItems, setLeftItems] = useState<{ id: string; text: string; imageUrl?: string; matched: boolean }[]>([]);
    const [rightItems, setRightItems] = useState<{ id: string; text: string; imageUrl?: string; matched: boolean }[]>([]);

    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [selectedRight, setSelectedRight] = useState<string | null>(null);

    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        correctAnswers: 0,
        level: 1
    });

    const [attempts, setAttempts] = useState(0);
    const [startTime] = useState(() => Date.now());

    useEffect(() => {
        audioManager.preload();
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("يجب تسجيل الدخول أولاً");
                setLoading(false);
                return;
            }

            // Get Config
            const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "matching_pairs_count").maybeSingle();
            const limit = setting ? parseInt(setting.value) : 6;

            // 1. Fetch all active questions (IDs only)
            const { data: allQuestions, error } = await supabase
                .from("matching_game_questions")
                .select("id")
                .eq("is_active", true)
                .eq("level", gameState.level);

            if (error || !allQuestions || allQuestions.length === 0) {
                toast.error("لا توجد أسئلة متاحة");
                setLoading(false);
                return;
            }

            // 2. Fetch seen question IDs
            const { data: seenHistory } = await supabase
                .from("student_question_history")
                .select("question_id")
                .eq("user_id", session.user.id)
                .eq("game_type", "matching");

            const seenIds = new Set(seenHistory?.map(h => h.question_id) || []);

            // 3. Filter unseen
            let availableQuestions = allQuestions.filter(q => !seenIds.has(q.id));

            // 4. Reset if needed
            if (availableQuestions.length < limit) {
                await supabase
                    .from("student_question_history")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("game_type", "matching");

                availableQuestions = allQuestions;
                // Silent reset - no notification to student
            }

            // 5. Fetch full data
            const availableIds = availableQuestions.map(q => q.id);
            const { data: fullQuestions, error: fullError } = await supabase
                .from("matching_game_questions")
                .select("*")
                .in("id", availableIds);

            if (fullError || !fullQuestions) {
                toast.error("فشل تحميل بيانات الأسئلة");
                setLoading(false);
                return;
            }

            // 6. Shuffle
            const shuffledQuestions = [...fullQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            const selectedQuestions = shuffledQuestions.slice(0, limit);

            // 7. Record seen
            const historyRecords = selectedQuestions.map(q => ({
                user_id: session.user.id,
                question_id: q.id,
                game_type: "matching"
            }));

            await supabase
                .from("student_question_history")
                .upsert(historyRecords, { onConflict: "user_id,question_id,game_type", ignoreDuplicates: true });

            setQuestions(selectedQuestions);
            initializeGame(selectedQuestions);
        } catch (error) {
            console.error("Error fetching questions:", error);
            toast.error("فشل تحميل الأسئلة");
        } finally {
            setLoading(false);
        }
    };

    const initializeGame = (qs: Question[]) => {
        // Prepare items and shuffle
        const left = qs.map(q => ({ id: q.id, text: q.left_text, imageUrl: q.left_image_url, matched: false }));
        const right = qs.map(q => ({ id: q.id, text: q.right_text, imageUrl: q.right_image_url, matched: false }));

        // Shuffle arrays
        setLeftItems(shuffleArray([...left]));
        setRightItems(shuffleArray([...right]));

        setGameState(prev => ({ ...prev, correctAnswers: 0 }));
        setAttempts(0); // Reset attempts? Or strictly count user moves
        setSelectedLeft(null);
        setSelectedRight(null);
    };

    const shuffleArray = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const handleSelectLeft = (id: string) => {
        if (leftItems.find(i => i.id === id)?.matched) return;
        setSelectedLeft(id);
        checkMatch(id, selectedRight);
    };

    const handleSelectRight = (id: string) => {
        if (rightItems.find(i => i.id === id)?.matched) return;
        setSelectedRight(id);
        checkMatch(selectedLeft, id);
    };

    const checkMatch = (leftId: string | null, rightId: string | null) => {
        if (leftId && rightId) {
            // Check if match
            setAttempts(prev => prev + 1);

            if (leftId === rightId) {
                // Match!
                audioManager.playCorrect();
                toast.success("إجابة صحيحة! +10 نقاط");
                setLeftItems(prev => prev.map(item => item.id === leftId ? { ...item, matched: true } : item));
                setRightItems(prev => prev.map(item => item.id === rightId ? { ...item, matched: true } : item));

                const newScore = gameState.score + 1;
                const newCorrect = gameState.correctAnswers + 1;

                setGameState(prev => ({
                    ...prev,
                    score: newScore,
                    correctAnswers: newCorrect
                }));

                // Reset selection
                setSelectedLeft(null);
                setSelectedRight(null);

                // Check win condition
                if (newCorrect === questions.length) {
                    handleWin(newScore, newCorrect);
                }

            } else {
                // No match
                audioManager.playWrong();
                toast.error("محاولة خاطئة (-1 نقطة)");
                setGameState(prev => ({
                    ...prev,
                    score: Math.max(0, prev.score - 1)
                }));
                setTimeout(() => {
                    setSelectedLeft(null);
                    setSelectedRight(null);
                }, 500);
            }
        }
    };

    const handleWin = (finalScore: number, finalCorrect: number) => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        // Save attempt with the actual final values
        saveAttempt(finalScore, finalCorrect);
    };

    const saveAttempt = async (finalScore: number, finalCorrect: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
                const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
                    user_id: user.id,
                    game_type: "matching",
                    level: gameState.level,
                    score: finalScore,
                    correct_count: finalCorrect,
                    total_questions: questions.length,
                    duration_seconds: durationSeconds,
                }).select().single();

                // Send email notification
                if (attemptData && !insertError) {
                    console.log("[Matching Game] Sending email for attempt:", attemptData.id);
                    await supabase.functions.invoke('exam-finish', {
                        body: { attempt_id: attemptData.id, is_game: true }
                    });
                }
            }
        } catch (err) {
            console.error("Error saving score", err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            {/* Header */}
            <div className="bg-white border-b py-4 px-6 shadow-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild className="rounded-full">
                            <Link to="/student/dashboard">
                                <ArrowRight className="w-5 h-5 ml-1" />
                                الخروج
                            </Link>
                        </Button>
                        <h1 className="text-xl font-bold text-primary hidden md:block">لعبة المطابقة</h1>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8 bg-slate-100 px-4 py-2 rounded-full">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground uppercase font-bold">المستوى</span>
                            <span className="font-bold text-lg leading-none text-primary">{gameState.level}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-300"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground uppercase font-bold">النقاط</span>
                            <span className="font-bold text-lg leading-none text-green-600">{gameState.score}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-300"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground uppercase font-bold">متبقي</span>
                            <span className="font-bold text-lg leading-none text-blue-600">{questions.length - gameState.correctAnswers}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Area */}
            <main className="flex-1 container max-w-5xl mx-auto p-4 md:p-8 flex items-center justify-center">
                {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                ) : questions.length === 0 ? (
                    <div className="text-center">
                        <p>لا توجد أسئلة متاحة حالياً.</p>
                        <Button onClick={fetchQuestions} className="mt-4">تحديث</Button>
                    </div>
                ) : gameState.correctAnswers === questions.length ? (
                    <Card className="p-8 text-center space-y-6 max-w-md w-full animate-bounce-in">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                            <Trophy className="w-10 h-10 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-2">أحسنت!</h2>
                            <p className="text-muted-foreground">أكملت المستوى بنجاح.</p>
                        </div>
                        <div className="text-4xl font-bold text-primary">
                            {gameState.score} <span className="text-lg text-muted-foreground">نقطة</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                                <RefreshCw className="w-4 h-4 ml-2" />
                                إعادة اللعب
                            </Button>
                            <Button asChild className="w-full">
                                <Link to="/student/dashboard">العودة للقائمة</Link>
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className={`grid gap-4 md:gap-12 w-full transition-all ${questions.length > 8 ? 'grid-cols-2 max-w-6xl' : 'grid-cols-2'}`}>
                        {/* Left Column */}
                        <div className={`grid gap-3 md:gap-4 ${questions.length > 8 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {leftItems.map((item) => (
                                <Card
                                    key={item.id}
                                    onClick={() => handleSelectLeft(item.id)}
                                    className={`
                                        p-4 text-center cursor-pointer transition-all duration-200
                                        ${item.matched ? "opacity-0 pointer-events-none" : "hover:scale-105 hover:shadow-md"}
                                        ${selectedLeft === item.id ? "bg-primary text-white border-primary ring-2 ring-primary ring-offset-2" : "bg-white hover:bg-slate-50"}
                                        ${questions.length > 8 ? 'text-base p-2' : 'text-lg md:text-xl md:p-6'} 
                                    `}
                                >
                                    {item.imageUrl ? (
                                        <div className="w-full h-full flex items-center justify-center min-h-[120px] md:min-h-[160px]">
                                            <img
                                                src={item.imageUrl}
                                                alt="question"
                                                className="w-full h-full object-contain max-h-40 md:max-h-64 mix-blend-multiply transition-transform hover:scale-110 duration-300"
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-semibold">{item.text}</span>
                                    )}
                                </Card>
                            ))}
                        </div>

                        {/* Right Column */}
                        <div className={`grid gap-3 md:gap-4 ${questions.length > 8 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {rightItems.map((item) => (
                                <Card
                                    key={item.id}
                                    onClick={() => handleSelectRight(item.id)}
                                    className={`
                                        p-4 text-center cursor-pointer transition-all duration-200
                                        ${item.matched ? "opacity-0 pointer-events-none" : "hover:scale-105 hover:shadow-md"}
                                        ${selectedRight === item.id ? "bg-primary text-white border-primary ring-2 ring-primary ring-offset-2" : "bg-white hover:bg-slate-50"}
                                        ${questions.length > 8 ? 'text-base p-2' : 'text-lg md:text-xl md:p-6'} 
                                    `}
                                >
                                    {item.imageUrl ? (
                                        <div className="w-full h-full flex items-center justify-center min-h-[120px] md:min-h-[160px]">
                                            <img
                                                src={item.imageUrl}
                                                alt="answer"
                                                className="w-full h-full object-contain max-h-40 md:max-h-64 mix-blend-multiply transition-transform hover:scale-110 duration-300"
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-semibold">{item.text}</span>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
