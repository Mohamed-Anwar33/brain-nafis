
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";

interface Question {
    id: string;
    items: string[];
    drop_labels: string[] | null;
    correct_order: string[];
    title?: string;
}

interface GameState {
    score: number;
    level: number;
}

export default function OrderingGame() {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [availableItems, setAvailableItems] = useState<string[]>([]);
    const [placedItems, setPlacedItems] = useState<(string | null)[]>([]);

    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        level: 1
    });

    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

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
            const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "ordering_questions_limit").maybeSingle();
            const limit = setting ? parseInt(setting.value) : 10;

            // 1. Fetch all active questions (IDs only)
            const { data: allQuestions, error } = await supabase
                .from("ordering_game_questions")
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
                .eq("game_type", "ordering");

            const seenIds = new Set(seenHistory?.map(h => h.question_id) || []);

            // 3. Filter unseen
            let availableQuestions = allQuestions.filter(q => !seenIds.has(q.id));

            // 4. Reset if needed
            if (availableQuestions.length < limit) {
                await supabase
                    .from("student_question_history")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("game_type", "ordering");

                availableQuestions = allQuestions;
                // Silent reset - no notification to student
            }

            // 5. Fetch full data
            const availableIds = availableQuestions.map(q => q.id);
            const { data: fullQuestions, error: fullError } = await supabase
                .from("ordering_game_questions")
                .select("*")
                .in("id", availableIds);

            if (fullError || !fullQuestions) {
                toast.error("فشل تحميل بيانات الأسئلة");
                setLoading(false);
                return;
            }

            // Cast json arrays to string[]
            let loadedQuestions = fullQuestions.map((q: any) => ({
                ...q,
                items: Array.isArray(q.items) ? q.items : [],
                correct_order: Array.isArray(q.correct_order) ? q.correct_order : [],
                drop_labels: Array.isArray(q.drop_labels) ? q.drop_labels : []
            }));

            const typedQuestions = loadedQuestions as Question[];

            // 6. Shuffle
            const shuffledQuestions = [...typedQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            const selectedQuestions = shuffledQuestions.slice(0, limit);

            // 7. Record seen
            const historyRecords = selectedQuestions.map(q => ({
                user_id: session.user.id,
                question_id: q.id,
                game_type: "ordering"
            }));

            await supabase
                .from("student_question_history")
                .upsert(historyRecords, { onConflict: "user_id,question_id,game_type", ignoreDuplicates: true });

            setQuestions(selectedQuestions);
            if (selectedQuestions.length > 0) loadQuestion(selectedQuestions[0]);
        } catch (error) {
            console.error("Error fetching questions:", error);
            toast.error("فشل تحميل الأسئلة");
        } finally {
            setLoading(false);
        }
    };

    const loadQuestion = (q: Question) => {
        const shuffled = [...q.items].sort(() => Math.random() - 0.5);
        setAvailableItems(shuffled);
        const slotCount = q.drop_labels?.length || q.items.length;
        setPlacedItems(new Array(slotCount).fill(null));
        setIsChecked(false);
        setIsCorrect(false);
    };

    const handleDragStart = (e: React.DragEvent, item: string) => {
        setDraggedItem(item);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (!draggedItem || isChecked) return;

        const newAvailable = availableItems.filter(i => i !== draggedItem);
        const newPlaced = [...placedItems];

        // Check if item was already placed elsewhere, remove it
        const existingIndex = newPlaced.indexOf(draggedItem);
        if (existingIndex !== -1) {
            newPlaced[existingIndex] = null;
        }

        if (newPlaced[index]) {
            newAvailable.push(newPlaced[index]!);
        }
        newPlaced[index] = draggedItem;

        setAvailableItems(newAvailable);
        setPlacedItems(newPlaced);
        setDraggedItem(null);
    };

    const handleReturnToPool = (item: string) => {
        if (isChecked) return;
        const newPlaced = placedItems.map(i => i === item ? null : i);
        setPlacedItems(newPlaced);
        setAvailableItems([...availableItems, item]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const checkOrder = () => {
        const currentQ = questions[currentQuestionIndex];
        if (placedItems.some(i => i === null)) {
            toast.warning("يرجى ترتيب جميع العناصر أولاً");
            return;
        }

        setIsChecked(true);

        let correct = true;
        placedItems.forEach((item, index) => {
            if (item !== currentQ.correct_order[index]) {
                correct = false;
            }
        });

        if (correct) {
            audioManager.playCorrect();
            toast.success("ترتيب صحيح! أحسنت");
            setIsCorrect(true);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setGameState(prev => ({ ...prev, score: prev.score + 1 }));
            saveAttempt();
        } else {
            audioManager.playWrong();
            toast.error("ترتيب خاطئ (-1 نقطة)، حاول مرة أخرى");
            setGameState(prev => ({ ...prev, score: Math.max(0, prev.score - 1) }));
            setIsCorrect(false);
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(prev => prev + 1);
            loadQuestion(questions[currentQuestionIndex + 1]);
        } else {
            toast.success("أتممت جميع الأسئلة!");
        }
    };

    const resetCurrent = () => {
        loadQuestion(questions[currentQuestionIndex]);
    };

    const saveAttempt = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
                    user_id: user.id,
                    game_type: "ordering",
                    score: gameState.score, // usage of already updated state
                    correct_count: 1,
                    total_questions: questions.length,
                }).select().single();

                // Send email notification
                if (attemptData && !insertError) {
                    console.log("[Ordering Game] Sending email for attempt:", attemptData.id);
                    await supabase.functions.invoke('exam-finish', {
                        body: { attempt_id: attemptData.id, is_game: true }
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            <div className="bg-white border-b py-4 px-6 shadow-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="rounded-full">
                        <Link to="/student/dashboard">
                            <ArrowRight className="w-5 h-5 ml-1" />
                            الخروج
                        </Link>
                    </Button>
                    <div className="font-bold text-xl text-primary">لغز الترتيب</div>
                    <div className="font-bold text-lg text-green-600">{gameState.score} نقطة</div>
                </div>
            </div>

            <main className="flex-1 container max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center">
                {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                ) : questions.length === 0 ? (
                    <div className="text-center">لا توجد أسئلة.</div>
                ) : (
                    <div className="w-full space-y-8 animate-fade-in">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">{questions[currentQuestionIndex].title || "رتب العناصر التالية"}</h2>
                            <p className="text-muted-foreground">اسحب العناصر إلى الخانات الصحيحة</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border min-h-[100px] flex flex-wrap justify-center gap-4">
                            {availableItems.length === 0 && !isChecked && (
                                <p className="text-gray-400 text-sm py-2">جميع العناصر مرتبة</p>
                            )}
                            {availableItems.map((item) => (
                                <div
                                    key={item}
                                    draggable={!isChecked}
                                    onDragStart={(e) => handleDragStart(e, item)}
                                    className="px-6 py-3 bg-white border-2 border-primary/20 text-primary rounded-full font-bold shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-flow-col auto-cols-fr">
                            {placedItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col items-center gap-2"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                >
                                    <span className="text-sm font-medium text-gray-500">
                                        {questions[currentQuestionIndex].drop_labels?.[index] || `${index + 1}`}
                                    </span>
                                    <div
                                        className={`
                                        w-full h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors relative
                                        ${!item ? 'border-gray-300 bg-gray-50 hover:bg-gray-100' : 'border-primary bg-primary/5'}
                                        ${isChecked && item === questions[currentQuestionIndex].correct_order[index] ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : ''}
                                        ${isChecked && item !== questions[currentQuestionIndex].correct_order[index] ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : ''}
                                    `}
                                    >
                                        {item ? (
                                            <div
                                                onClick={() => handleReturnToPool(item)}
                                                className="px-4 py-2 bg-white shadow-sm rounded-xl font-bold cursor-pointer hover:text-red-500"
                                            >
                                                {item}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">أفلت هنا</span>
                                        )}

                                        {isChecked && item === questions[currentQuestionIndex].correct_order[index] && (
                                            <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1 rounded-full shadow-lg">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center gap-4 pt-8">
                            {!isChecked ? (
                                <Button size="lg" onClick={checkOrder} className="w-full md:w-auto px-8">
                                    تحقق من الترتيب
                                </Button>
                            ) : (
                                <>
                                    {isCorrect ? (
                                        <Button size="lg" onClick={nextQuestion} className="bg-green-600 hover:bg-green-700">
                                            السؤال التالي
                                            <ArrowRight className="w-4 h-4 mr-2" />
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="lg" onClick={resetCurrent} className="text-destructive border-destructive hover:bg-destructiv/10">
                                            <RotateCcw className="w-4 h-4 ml-2" />
                                            حاول مرة أخرى
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
