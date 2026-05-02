import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, RefreshCw, Trophy, Zap, Target, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
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

interface MatchingItem {
    left_text: string;
    right_text: string;
    left_image_url?: string;
    right_image_url?: string;
}

interface RawQuestion {
    id: string;
    items?: MatchingItem[];
    left_text?: string;
    right_text?: string;
    left_image_url?: string;
    right_image_url?: string;
}

interface Question {
    id: string;
    source_id: string;
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
    const selectionContext = useMemo(() => getStoredSelectionContext(), []);
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
        if (!selectionContext) {
            navigate("/student/dashboard", { replace: true });
            return;
        }

        audioManager.preload();
        fetchQuestions();
    }, [navigate, selectionContext]);

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

            // Get Config
            const limit = 10;

            // 1. Fetch all active scoped questions. In central exam, one row can
            // contain multiple matching pairs in items, so selection happens after flattening.
            const { data: allQuestions, error } = await applySelectionFilters(
                supabase
                    .from("matching_game_questions")
                    .select("*")
                    .eq("is_active", true),
                selectionContext,
            );

            if (error || !allQuestions || allQuestions.length === 0) {
                toast.error("لا توجد أسئلة متاحة");
                setLoading(false);
                return;
            }

            // 2. Fetch seen source row IDs.
            const seenIds = await getScopedHistoryIds(
                session.user.id,
                "matching",
                selectionContext,
            );

            const scopedQuestions = allQuestions as RawQuestion[];
            const unseenQuestions = scopedQuestions.filter((q) => !seenIds.has(q.id));

            // Reset only when every source row in this scope has already been used.
            if (unseenQuestions.length === 0 && scopedQuestions.length > 0) {
                await resetScopedHistory(session.user.id, "matching", selectionContext);
                seenIds.clear();
            }

            // 6. Flatten items JSONB into individual pairs
            const flattenedQuestions: Question[] = [];
            for (const raw of scopedQuestions) {
                if (raw.items && Array.isArray(raw.items) && raw.items.length > 0) {
                    // New format: items JSONB array
                    for (const item of raw.items) {
                        if ((item.left_text?.trim() || item.left_image_url) && (item.right_text?.trim() || item.right_image_url)) {
                            flattenedQuestions.push({
                                id: `${raw.id}_${flattenedQuestions.length}`,
                                source_id: raw.id,
                                left_text: item.left_text || '',
                                right_text: item.right_text || '',
                                left_image_url: item.left_image_url,
                                right_image_url: item.right_image_url,
                            });
                        }
                    }
                } else if ((raw.left_text?.trim() || raw.left_image_url) && (raw.right_text?.trim() || raw.right_image_url)) {
                    // Old format: direct columns
                    flattenedQuestions.push({
                        id: raw.id,
                        source_id: raw.id,
                        left_text: raw.left_text || '',
                        right_text: raw.right_text || '',
                        left_image_url: raw.left_image_url,
                        right_image_url: raw.right_image_url,
                    });
                }
            }

            if (flattenedQuestions.length === 0) {
                toast.error("لا توجد أسئلة صالحة");
                setLoading(false);
                return;
            }

            // 4. Prefer pairs from unseen source rows, then fill from seen rows if needed.
            const unseenPairs = flattenedQuestions.filter((q) => !seenIds.has(q.source_id));
            const seenPairs = flattenedQuestions.filter((q) => seenIds.has(q.source_id));
            const selectedQuestions = [
                ...shuffleArray(unseenPairs),
                ...shuffleArray(seenPairs),
            ].slice(0, limit);

            // 5. Record seen (use original question IDs, not pair IDs)
            const originalIds = [...new Set(selectedQuestions.map((q) => q.source_id))];
            await recordScopedHistory(
                session.user.id,
                "matching",
                originalIds,
                selectionContext,
            );

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
            if (user && selectionContext) {
                const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
                const { data: profile } = await supabase
                    .from("student_profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .maybeSingle();
                const resolvedStudentName = profile?.full_name || "طالب";
                const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
                    user_id: user.id,
                    game_type: "matching",
                    level: gameState.level,
                    score: finalScore,
                    correct_count: finalCorrect,
                    total_questions: questions.length,
                    duration_seconds: durationSeconds,
                    ...getScopedPayload(selectionContext),
                    metadata: {
                        student_name: resolvedStudentName,
                        selection_context: getSelectionDisplayText(selectionContext),
                        game_name: "لعبة المطابقة"
                    }
                }).select().single() as any;

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
        <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100 flex flex-col" dir="rtl">
            {/* Floating Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
                <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${15 + Math.random() * 25}px`,
                            height: `${15 + Math.random() * 25}px`,
                            background: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'][Math.floor(Math.random() * 5)],
                            animationDelay: `${Math.random() * 3}s`,
                            opacity: 0.15,
                            filter: 'blur(1px)'
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-white/50 py-4 px-6 sticky top-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-white/80">
                            <Link to="/student/dashboard">
                                <ArrowRight className="w-5 h-5 ml-1" />
                                <span className="font-bold">العودة</span>
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <Gamepad2 className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-black text-slate-800 hidden md:block">لعبة المطابقة</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-white/50">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 font-bold">النقاط</span>
                            <span className="font-black text-lg leading-none text-emerald-600">{gameState.score}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 font-bold">متبقي</span>
                            <span className="font-black text-lg leading-none text-blue-600">{questions.length - gameState.correctAnswers}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Area */}
            <main className="flex-1 container max-w-5xl mx-auto p-3 md:p-8 flex items-center justify-center relative z-10">
                {loading ? (
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-violet-600 font-bold">جاري التحميل...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <Card className="p-8 text-center bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                        <p className="text-slate-600 text-lg mb-4">لا توجد أسئلة متاحة حالياً.</p>
                        <Button onClick={fetchQuestions} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold px-8">تحديث</Button>
                    </Card>
                ) : gameState.correctAnswers === questions.length ? (
                    <Card className="p-10 text-center space-y-6 max-w-md w-full bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-purple-500/20">
                        <div className="relative inline-block">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
                            <div className="absolute -bottom-1 -left-2 text-xl animate-bounce delay-100">⭐</div>
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">أحسنت يا بطل!</h2>
                            <p className="text-slate-500">أكملت لعبة المطابقة بنجاح.</p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-2xl border border-violet-100">
                            <div className="text-sm text-slate-500 mb-2 font-bold">النقاط النهائية</div>
                            <div className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                                {gameState.correctAnswers * 10 - (attempts > questions.length ? (attempts - questions.length) : 0)}
                            </div>
                            <div className="text-sm text-slate-400 mt-2">نقطة</div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
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
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-2 md:gap-8 w-full max-w-5xl transition-all">
                        {/* Left Column */}
                        <div className="grid grid-cols-1 gap-2 md:gap-4">
                            {leftItems.map((item) => (
                                <Card
                                    key={item.id}
                                    onClick={() => handleSelectLeft(item.id)}
                                    className={`
                                        p-2 md:p-4 text-center cursor-pointer transition-all duration-300 border-0 shadow-lg
                                        ${item.matched ? "opacity-0 pointer-events-none" : "hover:scale-105 hover:shadow-xl hover:-translate-y-1"}
                                        ${selectedLeft === item.id 
                                            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-purple-500/30 scale-105" 
                                            : "bg-white/90 backdrop-blur hover:bg-white"}
                                        min-h-[76px] md:min-h-[112px] text-xs sm:text-sm md:text-lg md:p-5
                                    `}
                                >
                                    {item.imageUrl ? (
                                        <div className="w-full h-full flex items-center justify-center min-h-[60px] md:min-h-[92px]">
                                            <img
                                                src={item.imageUrl}
                                                alt="question"
                                                className="w-full h-full object-contain max-h-16 sm:max-h-20 md:max-h-28 mix-blend-multiply transition-transform hover:scale-110 duration-300"
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-bold">{item.text}</span>
                                    )}
                                </Card>
                            ))}
                        </div>

                        {/* Right Column */}
                        <div className="grid grid-cols-1 gap-2 md:gap-4">
                            {rightItems.map((item) => (
                                <Card
                                    key={item.id}
                                    onClick={() => handleSelectRight(item.id)}
                                    className={`
                                        p-2 md:p-4 text-center cursor-pointer transition-all duration-300 border-0 shadow-lg
                                        ${item.matched ? "opacity-0 pointer-events-none" : "hover:scale-105 hover:shadow-xl hover:-translate-y-1"}
                                        ${selectedRight === item.id 
                                            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-purple-500/30 scale-105" 
                                            : "bg-white/90 backdrop-blur hover:bg-white"}
                                        min-h-[76px] md:min-h-[112px] text-xs sm:text-sm md:text-lg md:p-5
                                    `}
                                >
                                    {item.imageUrl ? (
                                        <div className="w-full h-full flex items-center justify-center min-h-[60px] md:min-h-[92px]">
                                            <img
                                                src={item.imageUrl}
                                                alt="answer"
                                                className="w-full h-full object-contain max-h-16 sm:max-h-20 md:max-h-28 mix-blend-multiply transition-transform hover:scale-110 duration-300"
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-bold">{item.text}</span>
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
