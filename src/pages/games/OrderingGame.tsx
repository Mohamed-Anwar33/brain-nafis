import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, RotateCcw, Check, Puzzle, Sparkles, Trophy, Target, Award } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { CertificateModal } from "@/components/exam/CertificateModal";
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    DragStartEvent,
    DragEndEvent,
    UniqueIdentifier,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
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

// --- Types ---
interface Question {
    id: string;
    items: string[];
    item_images?: string[];
    drop_labels: string[] | null;
    correct_order: string[];
    title?: string;
    image_url?: string;
}

interface GameState {
    score: number;
    level: number;
    stage: number;
}

interface GameItem {
    id: string; // Unique ID for DnD
    text: string;
    imageUrl?: string;
}

// --- Draggable Component ---
function DraggableItem({ id, item, disabled }: { id: string; item: GameItem; disabled: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { item },
        disabled: disabled,
    });

    const contentClass = cn(
        "px-4 py-3 bg-white border-2 border-primary/20 text-primary rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 min-w-[120px]",
        disabled ? 'cursor-default opacity-80' : 'cursor-grab active:cursor-grabbing hover:scale-105 hover:border-primary/50'
    );

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                className={cn(contentClass, "opacity-50 ring-2 ring-primary")}
            >
                {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.text} className="w-8 h-8 object-contain mix-blend-multiply" />
                )}
                <span>{item.text}</span>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={contentClass}
        >
            {item.imageUrl && (
                <img src={item.imageUrl} alt={item.text} className="w-10 h-10 object-contain mix-blend-multiply" />
            )}
            <span>{item.text}</span>
        </div>
    );
}

// --- Droppable Slot Component ---
function DroppableSlot({
    id,
    index,
    label,
    item,
    isChecked,
    isCorrect,
    onRemove
}: {
    id: string;
    index: number;
    label: string;
    item: GameItem | null;
    isChecked: boolean;
    isCorrect: boolean;
    onRemove: (item: GameItem) => void
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { index },
    });

    return (
        <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-sm font-medium text-gray-500">
                {label}
            </span>
            <div
                ref={setNodeRef}
                className={cn(
                    "w-full min-h-[100px] rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors relative min-w-[120px] p-2",
                    !item
                        ? (isOver ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100')
                        : 'border-primary bg-primary/5',
                    isChecked && isCorrect && 'border-green-500 bg-green-50 ring-2 ring-green-200',
                    isChecked && !isCorrect && 'border-red-500 bg-red-50 ring-2 ring-red-200'
                )}
            >
                {item ? (
                    <div
                        onClick={() => !isChecked && onRemove(item)}
                        className={cn(
                            "w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-white shadow-sm rounded-xl font-bold transition-all",
                            !isChecked && "cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-200 border border-transparent"
                        )}
                    >
                        {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.text} className="w-10 h-10 object-contain mix-blend-multiply" />
                        )}
                        <span>{item.text}</span>
                    </div>
                ) : (
                    <span className="text-gray-300 text-sm">أفلت هنا</span>
                )}

                {isChecked && isCorrect && (
                    <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1 rounded-full shadow-lg z-10 animate-in zoom-in">
                        <Check className="w-4 h-4" />
                    </div>
                )}
            </div>
        </div>
    );
}


export default function OrderingGame() {
    const navigate = useNavigate();
    const selectionContext = useMemo(() => getStoredSelectionContext(), []);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [availableItems, setAvailableItems] = useState<GameItem[]>([]);
    const [placedItems, setPlacedItems] = useState<(GameItem | null)[]>([]);

    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        level: 1,
        stage: 1
    });
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);  // Track wrong attempts
    const [questionsWithErrors, setQuestionsWithErrors] = useState<Set<string>>(new Set());  // Track which questions had errors
    const [gameOver, setGameOver] = useState(false);
    const [studentName, setStudentName] = useState<string>("");
    const [showCertificateModal, setShowCertificateModal] = useState(false);

    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeItem, setActiveItem] = useState<GameItem | null>(null);
    const [startTime] = useState(() => Date.now());

    // Sensors configuration
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

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
            const limit = 5;

            // 1. Fetch active
            const { data: fullQuestions, error: fullError } = await applySelectionFilters(
                supabase
                    .from("ordering_game_questions")
                    .select("*")
                    .eq("is_active", true),
                selectionContext,
            );

            if (fullError || !fullQuestions || fullQuestions.length === 0) {
                toast.error("لا توجد أسئلة متاحة");
                setLoading(false);
                return;
            }

            // Cast json arrays
            const loadedQuestions = fullQuestions.map((q: any) => ({
                ...q,
                item_images: Array.isArray(q.item_images) ? q.item_images : [],
                correct_order: Array.isArray(q.correct_order) ? q.correct_order : [],
                drop_labels: Array.isArray(q.drop_labels) ? q.drop_labels : [],
                image_url: q.image_url
            }));

            const typedQuestions = loadedQuestions as Question[];

            setQuestions(typedQuestions);
            if (typedQuestions.length > 0) loadQuestion(typedQuestions[0]);

        } catch (error) {
            console.error("Error fetching questions:", error);
            toast.error("فشل تحميل الأسئلة");
        } finally {
            setLoading(false);
        }
    };

    const loadQuestion = (q: Question) => {
        // Zip items with images
        const gameItems: GameItem[] = q.items.map((text, idx) => ({
            id: `item-${idx}-${Math.random()}`, // Unique ID for Drag and Drop
            text: text,
            imageUrl: q.item_images?.[idx] || undefined
        }));

        const shuffled = [...gameItems].sort(() => Math.random() - 0.5);
        setAvailableItems(shuffled);

        const slotCount = q.drop_labels?.length || q.items.length;
        setPlacedItems(new Array(slotCount).fill(null));
        setIsChecked(false);
        setIsCorrect(false);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id);
        setActiveItem(active.data.current?.item);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setActiveItem(null);

        if (!over) return;

        const draggedItem = active.data.current?.item as GameItem;
        const droppableIndex = over.data.current?.index;

        if (!draggedItem || droppableIndex === undefined) return;

        // If something is already in the slot, return it to pool first
        const currentItemInSlot = placedItems[droppableIndex];
        let newAvailable = [...availableItems];

        // Remove the dragged item from available
        newAvailable = newAvailable.filter(i => i.id !== draggedItem.id);

        // If there was an item in the slot, add it back to available
        if (currentItemInSlot) {
            newAvailable.push(currentItemInSlot);
        }

        const newPlaced = [...placedItems];
        newPlaced[droppableIndex] = draggedItem;

        setAvailableItems(newAvailable);
        setPlacedItems(newPlaced);
    };

    const handleReturnToPool = (item: GameItem) => {
        if (isChecked) return;
        const newPlaced = placedItems.map(i => (i && i.id === item.id) ? null : i);
        setPlacedItems(newPlaced);
        setAvailableItems([...availableItems, item]);
    };

    const checkOrder = () => {
        const currentQ = questions[currentQuestionIndex];
        if (placedItems.some(i => i === null)) {
            toast.warning("يرجى ترتيب جميع العناصر أولاً");
            return;
        }

        setIsChecked(true);

        const currentPlaced = placedItems as GameItem[];
        let isOrderCorrect = true;
        currentPlaced.forEach((item, index) => {
            if (item.text !== currentQ.correct_order[index]) {
                isOrderCorrect = false;
            }
        });

        if (isOrderCorrect) {
            audioManager.playCorrect();
            toast.success("ترتيب صحيح! أحسنت");
            setIsCorrect(true);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            
            // Check if previously answered wrong
            const wasPreviouslyWrong = questionsWithErrors.has(currentQ.id);
            
            // Only count as correct if FIRST TIME correct (not after wrong)
            const newScore = wasPreviouslyWrong ? gameState.score : gameState.score + 1;
            setGameState(prev => ({ ...prev, score: newScore }));
            setCorrectCount(prev => wasPreviouslyWrong ? prev : prev + 1);
        } else {
            audioManager.playWrong();
            toast.error("ترتيب خاطئ (-1 نقطة)، حاول مرة أخرى");
            setGameState(prev => ({ ...prev, score: Math.max(0, prev.score - 1) }));
            setIsCorrect(false);
            
            // Track wrong attempt (only once per question)
            if (!questionsWithErrors.has(currentQ.id)) {
                setQuestionsWithErrors(prev => new Set(prev).add(currentQ.id));
                setWrongCount(prev => prev + 1);
            }
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(prev => prev + 1);
            loadQuestion(questions[currentQuestionIndex + 1]);
        } else {
            toast.success("أتممت جميع الأسئلة!");
            setGameOver(true);
            void saveAttempt(gameState.score, correctCount);
        }
    };

    const resetCurrent = () => {
        setIsChecked(false);
        // Return all form slots to pool? Or just re-shuffle? 
        // User asked to "Try Again", usually means keeping state or resetting. 
        // Let's reset fully to initial shuffled state of this question
        loadQuestion(questions[currentQuestionIndex]);
    };

    const saveAttempt = async (finalScore: number, finalCorrectCount: number) => {
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
                    game_type: "ordering",
                    score: finalScore,
                    correct_count: finalCorrectCount,
                    total_questions: questions.length,
                    duration_seconds: durationSeconds,
                    ...getScopedPayload(selectionContext),
                    metadata: {
                        student_name: resolvedStudentName,
                        selection_context: getSelectionDisplayText(selectionContext),
                        game_name: "لغز الترتيب"
                    }
                }).select().single() as any;

                if (attemptData && !insertError) {
                    await supabase.functions.invoke('exam-finish', {
                        body: { attempt_id: attemptData.id, is_game: true }
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const restartGame = () => {
        setGameState(prev => ({
            ...prev,
            score: 0,
            stage: 1
        }));
        setCurrentQuestionIndex(0);
        setCorrectCount(0);
        setGameOver(false);
        setAvailableItems([]);
        setPlacedItems([]);
        setIsChecked(false);
        setIsCorrect(false);
        fetchQuestions();
    };

    const startNextStage = () => {
        setGameState(prev => ({
            ...prev,
            stage: prev.stage + 1
        }));
        setCurrentQuestionIndex(0);
        setCorrectCount(0);
        setGameOver(false);
        setAvailableItems([]);
        setPlacedItems([]);
        setIsChecked(false);
        setIsCorrect(false);
        fetchQuestions();
    };

    if (gameOver) {
        const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100;

        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 flex flex-col items-center justify-center p-4 relative" dir="rtl">
                {/* Floating Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
                </div>
                
                <Card className="p-10 text-center space-y-8 max-w-md w-full bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-teal-500/20 relative z-10">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30 mx-auto">
                            <Trophy className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
                        <div className="absolute -bottom-1 -left-2 text-xl animate-bounce delay-100">⭐</div>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">أحسنت يا {studentName || "بطل"}!</h2>
                        <p className="text-slate-500">أكملت المرحلة {gameState.stage} من ألغاز الترتيب</p>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-200">
                        <div className="text-sm text-emerald-700 mb-2 font-bold">النسبة والدرجة</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
                            {percentage}%
                        </div>
                        <div className="text-sm text-slate-500 font-bold mt-2">
                            {correctCount} من {questions.length} أسئلة صحيحة ({gameState.score} نقطة)
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
                        <Button onClick={startNextStage} className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
                            <Sparkles className="w-6 h-6 ml-3" />
                            الانتقال للمرحلة {gameState.stage + 1}
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <Button onClick={() => window.location.reload()} variant="outline" className="h-12 text-lg rounded-xl font-bold border-2">
                                <RotateCcw className="w-5 h-5 ml-2" />
                                إعادة اللعب
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
                        score={correctCount}
                        totalQuestions={questions.length}
                        percentage={percentage}
                        examTitle={`لغز الترتيب العلمي (المرحلة ${gameState.stage}) - منصة SCIRISE`}
                    />
                </Card>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 flex flex-col" dir="rtl">
                {/* Floating Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
                    <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                width: `${15 + Math.random() * 25}px`,
                                height: `${15 + Math.random() * 25}px`,
                                background: ['#10b981', '#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b'][Math.floor(Math.random() * 5)],
                                animationDelay: `${Math.random() * 3}s`,
                                opacity: 0.15,
                                filter: 'blur(1px)'
                            }}
                        />
                    ))}
                </div>
                
                <div className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-white/50 py-4 px-6 sticky top-0">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-white/80">
                            <Link to="/student/dashboard">
                                <ArrowRight className="w-5 h-5 ml-1" />
                                <span className="font-bold">العودة</span>
                            </Link>
                        </Button>
                        
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <Puzzle className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="font-black text-xl text-slate-800 hidden md:block">لغز الترتيب - المرحلة {gameState.stage}</h1>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 rounded-full border border-emerald-200">
                            <span className="font-black text-lg text-emerald-600">{gameState.score}</span>
                            <span className="text-xs text-emerald-500 font-bold">نقطة</span>
                        </div>
                    </div>
                </div>

                <main className="flex-1 container max-w-4xl mx-auto p-2 md:p-8 flex flex-col items-center relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-emerald-600 font-bold">جاري تحميل الأسئلة...</p>
                        </div>
                    ) : questions.length === 0 ? (
                        <Card className="p-8 text-center bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                            <p className="text-slate-600 text-lg mb-4">لا توجد أسئلة متاحة حالياً.</p>
                            <Button onClick={fetchQuestions} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-8">تحديث</Button>
                        </Card>
                    ) : (
                        <div className="w-full space-y-4 md:space-y-8 animate-fade-in">
                            <div className="text-center space-y-2 md:space-y-4">
                                <div className="inline-flex items-center justify-center">
                                    <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 font-bold text-xs md:text-sm">
                                        سؤال {currentQuestionIndex + 1} / {questions.length}
                                    </span>
                                </div>
                                
                                {questions[currentQuestionIndex].image_url && (
                                    <div className="flex justify-center">
                                        <img
                                            src={questions[currentQuestionIndex].image_url}
                                            alt="Question"
                                            className="max-h-32 md:max-h-48 rounded-xl shadow-lg object-contain bg-white"
                                        />
                                    </div>
                                )}
                                
                                <h2 className="text-xl md:text-3xl font-black text-slate-800">
                                    {questions[currentQuestionIndex].title || "رتب العناصر التالية"}
                                </h2>
                                <p className="text-slate-500 text-sm md:text-base">اسحب العناصر إلى الخانات الصحيحة</p>
                            </div>

                            <Card className="p-4 md:p-6 bg-white/90 backdrop-blur-xl border-0 shadow-xl min-h-[100px] md:min-h-[140px] flex flex-wrap justify-center gap-2 md:gap-4">
                                {availableItems.length === 0 && !isChecked && (
                                    <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 py-4">
                                        <Check className="w-12 h-12 mb-2 opacity-50" />
                                        <p className="font-bold">جميع العناصر مرتبة</p>
                                    </div>
                                )}
                                {availableItems.map((item) => (
                                    <DraggableItem
                                        key={item.id}
                                        id={item.id}
                                        item={item}
                                        disabled={isChecked}
                                    />
                                ))}
                            </Card>

                            <div className="grid gap-2 md:gap-4 grid-cols-2 md:flex md:justify-center md:gap-6">
                                {placedItems.map((item, index) => (
                                    <DroppableSlot
                                        key={`slot-${index}`}
                                        id={`slot-${index}`}
                                        index={index}
                                        label={questions[currentQuestionIndex].drop_labels?.[index] || `${index + 1}`}
                                        item={item}
                                        isChecked={isChecked}
                                        isCorrect={item !== null && item.text === questions[currentQuestionIndex].correct_order[index]}
                                        onRemove={handleReturnToPool}
                                    />
                                ))}
                            </div>

                            <div className="flex justify-center gap-4 pt-8">
                                {!isChecked ? (
                                    <Button size="lg" onClick={checkOrder} className="w-full md:w-auto px-12 py-6 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 font-black">
                                        <Target className="w-6 h-6 ml-2" />
                                        تحقق من الترتيب
                                    </Button>
                                ) : (
                                    <>
                                        {isCorrect ? (
                                            <Button size="lg" onClick={nextQuestion} className="bg-gradient-to-r from-emerald-500 to-green-500 hover:opacity-90 w-full md:w-auto px-8 py-6 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 font-black">
                                                السؤال التالي
                                                <ArrowRight className="w-5 h-5 mr-2" />
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="lg" onClick={resetCurrent} className="border-rose-300 text-rose-600 hover:bg-rose-50 w-full md:w-auto px-8 py-6 text-lg rounded-2xl font-black">
                                                <RotateCcw className="w-5 h-5 ml-2" />
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
            <DragOverlay>
                {activeItem ? (
                    <div className="px-4 py-3 bg-white border-2 border-primary text-primary rounded-xl font-bold shadow-xl opacity-90 cursor-grabbing flex items-center gap-2 scale-105">
                        {activeItem.imageUrl && (
                            <img src={activeItem.imageUrl} alt={activeItem.text} className="w-8 h-8 object-contain mix-blend-multiply" />
                        )}
                        <span>{activeItem.text}</span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
