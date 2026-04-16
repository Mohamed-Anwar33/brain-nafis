import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, RefreshCw, Trophy, CheckCircle2, XCircle, ListOrdered, Lightbulb, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
} from "@/lib/selection-context";
import { applySelectionFilters, getScopedPayload } from "@/lib/selection-scope";

interface StageItem {
  id: string;
  text: string;
  order: number;
  imageUrl?: string;
}

interface StageQuestion {
  id: string;
  title: string;
  description: string;
  items: StageItem[];
  hint?: string;
}

export default function StagesGame() {
  const navigate = useNavigate();
  const selectionContext = useMemo(() => getStoredSelectionContext(), []);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<StageQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [shuffledItems, setShuffledItems] = useState<StageItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);  // Track wrong attempts
  const [questionsWithErrors, setQuestionsWithErrors] = useState<Set<string>>(new Set());  // Track which questions had errors
  const [gameOver, setGameOver] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const startTime = useState(() => Date.now())[0];

  useEffect(() => {
    if (!selectionContext || selectionContext.trackType !== "central") {
      navigate("/student/dashboard", { replace: true });
      return;
    }

    audioManager.preload();
    fetchQuestions();
  }, [navigate, selectionContext]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      if (!selectionContext || selectionContext.trackType !== "central") {
        navigate("/student/dashboard");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("يجب تسجيل الدخول أولاً");
        navigate("/");
        return;
      }

      // Try to fetch from database first
      const { data: dbQuestions, error } = await applySelectionFilters(
        supabase
          .from("stages_game_questions")
          .select("*")
          .eq("is_active", true)
          .limit(10),
        selectionContext,
      );

      if (!error && dbQuestions && dbQuestions.length > 0) {
        const formatted: StageQuestion[] = dbQuestions.map(q => ({
          id: q.id,
          title: q.title,
          description: q.description || "",
          hint: q.hint,
          items: Array.isArray(q.items) ? q.items.map((item: any, idx: number) => ({
            id: item.id || `item-${idx}`,
            text: item.text,
            order: item.order || idx,
            imageUrl: item.imageUrl
          })) : []
        }));
        setQuestions(formatted);
      } else {
        toast.error("لا توجد أسئلة مفعلة لهذه اللعبة داخل المجال المحدد");
        navigate("/central-exam/games");
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("فشل تحميل لعبة المراحل");
      navigate("/central-exam/games");
    } finally {
      setLoading(false);
    }
  };

  const generateSampleQuestions = (): StageQuestion[] => [
    {
      id: "1",
      title: "دورة حياة الفراشة",
      description: "رتب مراحل نمو الفراشة بالترتيب الصحيح",
      hint: "تبدأ من البيضة...",
      items: [
        { id: "i1", text: "البيضة", order: 1 },
        { id: "i2", text: "اليرقة", order: 2 },
        { id: "i3", text: "الشرنقة", order: 3 },
        { id: "i4", text: "الفراشة", order: 4 }
      ]
    },
    {
      id: "2",
      title: "مراحل نمو النبات",
      description: "رتب مراحل نمو النبات بالترتيب الصحيح",
      hint: "تبدأ من البذرة...",
      items: [
        { id: "i1", text: "البذرة", order: 1 },
        { id: "i2", text: "الإنبات", order: 2 },
        { id: "i3", text: "الشتلة", order: 3 },
        { id: "i4", text: "النبات الكامل", order: 4 }
      ]
    },
    {
      id: "3",
      title: "دورة الماء",
      description: "رتب مراحل دورة الماء بالترتيب",
      hint: "تبدأ بالتبخر...",
      items: [
        { id: "i1", text: "التبخر", order: 1 },
        { id: "i2", text: "التكثف", order: 2 },
        { id: "i3", text: "الهطول", order: 3 },
        { id: "i4", text: "التجمع", order: 4 }
      ]
    },
    {
      id: "4",
      title: "ترتيب الكواكب",
      description: "رتب الكواكب حسب البعد عن الشمس",
      hint: "أقرب كوكب هو عطارد...",
      items: [
        { id: "i1", text: "عطارد", order: 1 },
        { id: "i2", text: "الزهرة", order: 2 },
        { id: "i3", text: "الأرض", order: 3 },
        { id: "i4", text: "المريخ", order: 4 }
      ]
    },
    {
      id: "5",
      title: "مراحل الطعام في الجسم",
      description: "رتب مراحل هضم الطعام بالترتيب",
      hint: "تبدأ بالفم...",
      items: [
        { id: "i1", text: "الفم", order: 1 },
        { id: "i2", text: "المريء", order: 2 },
        { id: "i3", text: "المعدة", order: 3 },
        { id: "i4", text: "الأمعاء", order: 4 }
      ]
    }
  ];

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      loadQuestion(questions[currentIndex]);
    }
  }, [questions, currentIndex]);

  const loadQuestion = (question: StageQuestion) => {
    // Shuffle items
    const shuffled = [...question.items].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
    setSelectedOrder([]);
    setIsChecked(false);
    setIsCorrect(false);
    setShowHint(false);
  };

  const handleItemClick = (item: StageItem) => {
    if (isChecked) return;
    
    const itemIndex = shuffledItems.findIndex(i => i.id === item.id);
    
    // If already selected, remove it
    if (selectedOrder.includes(itemIndex)) {
      setSelectedOrder(prev => prev.filter(idx => idx !== itemIndex));
    } else {
      // Add to order
      setSelectedOrder(prev => [...prev, itemIndex]);
    }
  };

  const checkAnswer = () => {
    if (selectedOrder.length !== shuffledItems.length) {
      toast.warning("يرجى ترتيب جميع العناصر أولاً");
      return;
    }

    setIsChecked(true);

    // Check if order is correct
    const currentQuestion = questions[currentIndex];
    let correct = true;
    
    for (let i = 0; i < selectedOrder.length; i++) {
      const selectedItemIndex = selectedOrder[i];
      const selectedItem = shuffledItems[selectedItemIndex];
      
      // Find what the correct item should be at this position
      const correctItem = currentQuestion.items.find(item => item.order === i + 1);
      
      if (selectedItem.id !== correctItem?.id) {
        correct = false;
        break;
      }
    }

    setIsCorrect(correct);

    if (correct) {
      audioManager.playCorrect();
      toast.success("ترتيب صحيح! أحسنت");
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
      // Check if previously answered wrong
      const wasPreviouslyWrong = questionsWithErrors.has(currentQuestion.id);
      
      // Only count as correct if FIRST TIME correct (not after wrong)
      const pointsToAdd = wasPreviouslyWrong ? 0 : 10;
      setScore(prev => prev + pointsToAdd);
      setCorrectCount(prev => wasPreviouslyWrong ? prev : prev + 1);
    } else {
      audioManager.playWrong();
      toast.error("ترتيب خاطئ، حاول مرة أخرى");
      setScore(prev => Math.max(0, prev - 5));
      
      // Track wrong attempt (only once per question)
      if (!questionsWithErrors.has(currentQuestion.id)) {
        setQuestionsWithErrors(prev => new Set(prev).add(currentQuestion.id));
        setWrongCount(prev => prev + 1);
      }
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setGameOver(true);
      saveAttempt();
    }
  };

  const resetCurrent = () => {
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedOrder([]);
    setShowHint(false);
  };

  const saveAttempt = async () => {
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
          game_type: "stages",
          score: score,
          correct_count: correctCount,
          total_questions: questions.length,
          duration_seconds: durationSeconds,
          ...getScopedPayload(selectionContext),
          metadata: {
            student_name: resolvedStudentName,
            selection_context: getSelectionDisplayText(selectionContext),
            game_name: "لعبة ترتيب المراحل"
          }
        }).select().single();

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
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setQuestionsWithErrors(new Set());
    setGameOver(false);
    setSelectedOrder([]);
    setIsChecked(false);
    fetchQuestions();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <Card className="p-10 text-center space-y-8 max-w-md w-full animate-in zoom-in duration-500 shadow-2xl">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 blur-xl opacity-30 rounded-full"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">ممتاز!</h2>
            <p className="text-slate-500">أكملت لعبة ترتيب المراحل</p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
            <div className="text-sm text-blue-600 mb-2">النتيجة النهائية</div>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
              {score}
            </div>
            <div className="text-sm text-slate-400 mt-2">نقطة</div>
          </div>
          
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-slate-500">صحيحة</div>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div>
              <div className="text-2xl font-bold text-slate-700">{questions.length}</div>
              <div className="text-xs text-slate-500">مجموع</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button onClick={restartGame} variant="outline" className="w-full h-12 text-lg rounded-xl">
              <RefreshCw className="w-5 h-5 ml-2" />
              لعب مرة أخرى
            </Button>
            <Button asChild className="w-full h-12 text-lg rounded-xl">
              <Link to="/student/dashboard">العودة للقائمة</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b py-4 px-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link to="/central-exam/games">
              <ArrowRight className="w-5 h-5 ml-1" />
              العودة
            </Link>
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <ListOrdered className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">ترتيب المراحل</h1>
              <p className="text-xs text-slate-500">رتب بالترتيب الصحيح</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full">
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground uppercase font-bold">النقاط</span>
              <span className="font-bold text-lg leading-none text-blue-600">{score}</span>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground uppercase font-bold">السؤال</span>
              <span className="font-bold text-lg leading-none text-slate-700">{currentIndex + 1}/{questions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto p-4 md:p-8">
        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4">
          {/* Question Card */}
          <Card className="p-6 md:p-8 shadow-lg border-slate-100">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                {currentQuestion?.title}
              </h2>
              <p className="text-slate-500 text-lg">{currentQuestion?.description}</p>
              
              {/* Hint Button */}
              {currentQuestion?.hint && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Lightbulb className="w-4 h-4 ml-1" />
                  {showHint ? "إخفاء التلميح" : "عرض التلميح"}
                </Button>
              )}
              
              {showHint && currentQuestion?.hint && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 animate-in fade-in">
                  <Lightbulb className="w-5 h-5 inline-block ml-2" />
                  {currentQuestion.hint}
                </div>
              )}
            </div>
          </Card>

          {/* Current Order Display */}
          {selectedOrder.length > 0 && (
            <Card className="p-6 bg-blue-50/50 border-blue-100">
              <div className="text-center mb-4">
                <span className="text-sm font-bold text-blue-600 flex items-center justify-center gap-2">
                  <ArrowUp className="w-4 h-4" />
                  الترتيب المختار ({selectedOrder.length}/{shuffledItems.length})
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {selectedOrder.map((itemIndex, orderIdx) => {
                  const item = shuffledItems[itemIndex];
                  return (
                    <div 
                      key={item.id}
                      className={`
                        px-4 py-2 rounded-xl font-bold text-sm
                        ${isChecked 
                          ? (orderIdx + 1 === item.order 
                            ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                            : 'bg-red-100 text-red-700 border-2 border-red-300')
                          : 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        }
                        flex items-center gap-2
                      `}
                    >
                      <span className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-xs">
                        {orderIdx + 1}
                      </span>
                      {item.text}
                      {!isChecked && (
                        <button 
                          onClick={() => handleItemClick(item)}
                          className="w-5 h-5 rounded-full bg-white/50 hover:bg-red-200 flex items-center justify-center text-xs ml-1"
                        >
                          ×
                        </button>
                      )}
                      {isChecked && orderIdx + 1 === item.order && (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isChecked && orderIdx + 1 !== item.order && (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shuffledItems.map((item, idx) => {
              const isSelected = selectedOrder.includes(idx);
              const selectionIndex = selectedOrder.indexOf(idx);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  disabled={isChecked}
                  className={`
                    relative p-6 rounded-2xl font-bold text-sm md:text-base
                    transition-all duration-200 min-h-[100px] flex items-center justify-center
                    ${isSelected 
                      ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 text-slate-700'
                    }
                    ${isChecked && !isSelected ? 'opacity-50' : ''}
                  `}
                >
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.text}
                      className="w-12 h-12 object-contain mb-2"
                    />
                  )}
                  <span>{item.text}</span>
                  
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      {selectionIndex + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-6">
            {!isChecked ? (
              <Button 
                size="lg" 
                onClick={checkAnswer}
                disabled={selectedOrder.length !== shuffledItems.length}
                className="h-14 px-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                تحقق من الترتيب
              </Button>
            ) : (
              <>
                {isCorrect ? (
                  <Button 
                    size="lg" 
                    onClick={nextQuestion}
                    className="h-14 px-8 text-lg font-bold rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg"
                  >
                    السؤال التالي
                    <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={resetCurrent}
                    className="h-14 px-8 text-lg font-bold rounded-2xl border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <RefreshCw className="w-5 h-5 ml-2" />
                    حاول مرة أخرى
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
