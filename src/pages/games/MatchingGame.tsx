import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, RefreshCw, Trophy, Target, Gamepad2, Award } from "lucide-react";
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isChecked, setIsChecked] = useState(false);
    const [startTime] = useState(() => Date.now());
    const [isFinished, setIsFinished] = useState(false);
    const [studentName, setStudentName] = useState<string>("");
    const [showCertificateModal, setShowCertificateModal] = useState(false);

    useEffect(() => {
        if (!selectionContext) {
            navigate("/student/dashboard", { replace: true });
            return;
        }

        const fetchStudentName = async () => {
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
        };
        void fetchStudentName();

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

            const scopedQuestions = allQuestions as RawQuestion[];

            const flattenedQuestions: Question[] = [];
            for (const raw of scopedQuestions) {
                if (raw.items && Array.isArray(raw.items) && raw.items.length > 0) {
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

            const selectedQuestions = [...flattenedQuestions];

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
        setCurrentIndex(0);
        setGameState(prev => ({ ...prev, correctAnswers: 0, score: 0 }));
        setAttempts(0);
        setIsChecked(false);
        loadQuestion(0, qs);
    };

    const loadQuestion = (index: number, qs: Question[]) => {
        const currentQ = qs[index];
        if (!currentQ) return;

        setLeftItems([{ id: currentQ.id, text: currentQ.left_text, imageUrl: currentQ.left_image_url, matched: false }]);

        const correctRight = { id: currentQ.id, text: currentQ.right_text, imageUrl: currentQ.right_image_url };
        
        const otherRightItems = qs
            .filter((_, idx) => idx !== index)
            .map(q => ({ id: q.id, text: q.right_text, imageUrl: q.right_image_url }));
        
        const shuffledDistractors = shuffleArray([...otherRightItems]).slice(0, 3);
        const options = shuffleArray([correctRight, ...shuffledDistractors]);
        
        setRightItems(options.map(opt => ({ ...opt, matched: false })));
        setSelectedLeft(null);
        setSelectedRight(null);
        setIsChecked(false);
    };

    const shuffleArray = (array: any[]) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const handleSelectLeft = (id: string) => {
        if (isChecked) return;
        setSelectedLeft(id);
        if (selectedRight) checkMatch(id, selectedRight);
    };

    const handleSelectRight = (id: string) => {
        if (isChecked) return;
        setSelectedRight(id);
        if (selectedLeft) checkMatch(selectedLeft, id);
    };

    const checkMatch = (leftId: string | null, rightId: string | null) => {
        if (leftId && rightId && !isChecked) {
            setAttempts(prev => prev + 1);

            if (leftId === rightId) {
                audioManager.playCorrect();
                toast.success("إجابة صحيحة! أحسنت");
                
                setLeftItems(prev => prev.map(item => item.id === leftId ? { ...item, matched: true } : item));
                setRightItems(prev => prev.map(item => item.id === rightId ? { ...item, matched: true } : item));

                setGameState(prev => ({
                    ...prev,
                    score: prev.score + 10,
                    correctAnswers: prev.correctAnswers + 1
                }));

                setIsChecked(true);
            } else {
                audioManager.playWrong();
                toast.error("محاولة خاطئة، حاول مرة أخرى");
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

    const nextQuestion = () => {
        if (currentIndex + 1 < questions.length) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            loadQuestion(nextIdx, questions);
        } else {
            handleWin(gameState.score, gameState.correctAnswers);
        }
    };

    const handleWin = (finalScore: number, finalCorrect: number) => {
        setIsFinished(true);
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
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

                if (attemptData && !insertError) {
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
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
                <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

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
                ) : isFinished ? (
                    <Card className="p-10 text-center space-y-6 max-w-md w-full bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-purple-500/20">
                        <div className="relative inline-block">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
                            <div className="absolute -bottom-1 -left-2 text-xl animate-bounce delay-100">⭐</div>
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">أحسنت يا {studentName || "بطل"}!</h2>
                            <p className="text-slate-500">أكملت لعبة المطابقة بنجاح.</p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-2xl border border-violet-100">
                            <div className="text-sm text-slate-500 mb-2 font-bold">النسبة والدرجة</div>
                            <div className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                                {questions.length > 0 ? Math.round((gameState.correctAnswers / questions.length) * 100) : 100}%
                            </div>
                            <div className="text-sm text-slate-500 font-bold mt-2">
                                {gameState.correctAnswers} من {questions.length} إجابة صحيحة ({gameState.score} نقطة)
                            </div>
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
                            score={gameState.correctAnswers}
                            totalQuestions={questions.length}
                            percentage={questions.length > 0 ? Math.round((gameState.correctAnswers / questions.length) * 100) : 100}
                            examTitle="لعبة المطابقة العلمية - منصة SCIRISE"
                        />
                    </Card>
                ) : (
                    <div className="flex flex-col items-center w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
                        <div className="w-full text-center space-y-2">
                            <div className="inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                                السؤال {currentIndex + 1} من {questions.length}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800">طابق العنصر الصحيح</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-center">
                            <div className="flex justify-center">
                                {leftItems.map((item) => (
                                    <Card
                                        key={item.id}
                                        onClick={() => !isChecked && handleSelectLeft(item.id)}
                                        className={`
                                            w-full max-w-[280px] aspect-square flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-300 border-0 shadow-2xl
                                            ${selectedLeft === item.id 
                                                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-105 shadow-purple-500/40" 
                                                : "bg-white/90 backdrop-blur hover:scale-105 hover:bg-white"}
                                            ${item.matched ? "ring-4 ring-emerald-400" : ""}
                                        `}
                                    >
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt="question"
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                        ) : (
                                            <span className="text-2xl font-black text-center">{item.text}</span>
                                        )}
                                        <div className="mt-4 px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                            العنصر المطلوب
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {rightItems.map((item) => (
                                    <Card
                                        key={item.id}
                                        onClick={() => !isChecked && handleSelectRight(item.id)}
                                        className={`
                                            aspect-square flex items-center justify-center p-4 cursor-pointer transition-all duration-300 border-0 shadow-lg
                                            ${selectedRight === item.id 
                                                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-105 shadow-purple-500/30" 
                                                : "bg-white/90 backdrop-blur hover:bg-white hover:scale-105"}
                                            ${item.matched ? "bg-emerald-500 text-white shadow-emerald-500/40 scale-105" : ""}
                                            ${isChecked && !item.matched ? "opacity-50 grayscale-[0.5]" : ""}
                                        `}
                                    >
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt="answer"
                                                className={`w-full h-full object-contain ${item.matched ? "" : "mix-blend-multiply"}`}
                                            />
                                        ) : (
                                            <span className="font-bold text-center">{item.text}</span>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="h-20 flex items-center justify-center w-full">
                            {isChecked && (
                                <Button 
                                    onClick={nextQuestion} 
                                    className="bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black px-12 py-7 text-xl rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 hover:opacity-90 transition-all"
                                >
                                    {currentIndex + 1 === questions.length ? "عرض النتيجة" : "السؤال التالي"}
                                    <ArrowRight className="w-6 h-6 mr-3 rotate-180" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
