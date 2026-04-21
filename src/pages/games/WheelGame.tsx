import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, RotateCw, Trophy, Sparkles, Target, HelpCircle, CheckCircle, XCircle, TrendingUp, Clock, Award } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
} from "@/lib/selection-context";
import { applySelectionFilters, getScopedPayload } from "@/lib/selection-scope";

interface WheelSection {
  id: string;
  name: string;
  color: string;
  icon: string;
  image_url: string | null;
  is_active: boolean;
  order_index: number;
}

interface WheelQuestion {
  id: string;
  text: string;
  image_url: string | null;
  choices: {
    id: string;
    text: string;
    is_correct: boolean;
  }[];
  points: number;
  section_id: string;
}

export default function WheelGame() {
  const navigate = useNavigate();
  const selectionContext = useMemo(() => getStoredSelectionContext(), []);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<WheelSection[]>([]);
  const [questions, setQuestions] = useState<WheelQuestion[]>([]);
  
  // Smart Wheel System
  const [usedSections, setUsedSections] = useState<string[]>([]); // Track used section IDs
  const [currentSection, setCurrentSection] = useState<WheelSection | null>(null);
  const [sectionQuestions, setSectionQuestions] = useState<WheelQuestion[]>([]); // Questions for current section
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Index within section
  const [currentQuestion, setCurrentQuestion] = useState<WheelQuestion | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Score tracking
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1); // Track current stage
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sectionProgress, setSectionProgress] = useState({ current: 0, total: 0 });
  
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [waitingForNextSpin, setWaitingForNextSpin] = useState(false); // Waiting to spin again
  
  // Strict answer system - track wrong attempts per question
  const [wrongAttempts, setWrongAttempts] = useState(0); // Wrong attempts for current question
  const [questionsWithErrors, setQuestionsWithErrors] = useState<Set<string>>(new Set()); // Track questions that had errors
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  
  // Section Results - track per section
  const [sectionResults, setSectionResults] = useState<Map<string, { correct: number; wrong: number; total: number }>>(new Map());
  const [showSectionResults, setShowSectionResults] = useState(false);
  const [currentSectionStats, setCurrentSectionStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [currentSectionScore, setCurrentSectionScore] = useState(0);
  
  // Question Types
  type QuestionType = 'multiple_choice' | 'true_false';
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>('multiple_choice');
  
  const [gameOver, setGameOver] = useState(false);
  const [studentName, setStudentName] = useState<string>("");
  const wheelRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!selectionContext || selectionContext.trackType !== "central") {
      navigate("/student/dashboard", { replace: true });
      return;
    }

    audioManager.preload();
    fetchData();
  }, [navigate, selectionContext]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("[WheelGame] selectionContext:", JSON.stringify(selectionContext, null, 2));
      if (!selectionContext || selectionContext.trackType !== "central") {
        console.log("[WheelGame] No selectionContext or not central, redirecting");
        navigate("/student/dashboard");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("يجب تسجيل الدخول أولاً");
        navigate("/");
        return;
      }

      // Get student profile
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.full_name) {
        setStudentName(profile.full_name);
      }

      // Fetch sections - no domain filter, show ALL for grade+subject
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("wheel_sections")
        .select("*")
        .eq("is_active", true)
        .eq("track_type", selectionContext.trackType)
        .eq("grade_subject_id", selectionContext.gradeSubjectId)
        .order("order_index", { ascending: true });

      if (sectionsError) throw sectionsError;

      if (!sectionsData || sectionsData.length === 0) {
        toast.error("لا توجد أقسام مفعلة حاليًا");
        navigate("/central-exam/games");
        return;
      }

      setSections(sectionsData as unknown as WheelSection[]);

      // Fetch questions for all active sections
      const sectionIds = (sectionsData as any[]).map((s) => s.id);
      const { data: questionsData, error: questionsError } = await supabase
        .from("wheel_section_questions")
        .select("*")
        .eq("is_active", true)
        .eq("track_type", selectionContext.trackType)
        .eq("grade_subject_id", selectionContext.gradeSubjectId)
        .in("section_id", sectionIds);

      if (questionsError) throw questionsError;

      const allQuestions = (questionsData || []) as unknown as WheelQuestion[];
      if (!allQuestions.length) {
        toast.error("لا توجد أسئلة مفعلة حاليًا");
        navigate("/central-exam/games");
        return;
      }

      setQuestions(allQuestions as unknown as WheelQuestion[]);
      setTotalQuestions(allQuestions.length);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("فشل تحميل بيانات لعبة العجلة");
      navigate("/central-exam/games");
    } finally {
      setLoading(false);
    }
  };

  const generateSampleSections = (): WheelSection[] => [
    { id: "1", name: "الأحياء", color: "#10b981", icon: "🧬", image_url: null, is_active: true, order_index: 1 },
    { id: "2", name: "الكيمياء", color: "#f59e0b", icon: "⚗️", image_url: null, is_active: true, order_index: 2 },
    { id: "3", name: "الفيزياء", color: "#3b82f6", icon: "⚡", image_url: null, is_active: true, order_index: 3 },
    { id: "4", name: "العلوم العامة", color: "#8b5cf6", icon: "🔬", image_url: null, is_active: true, order_index: 4 },
  ];

  const generateSampleQuestions = (): WheelQuestion[] => [
    { id: "q1", section_id: "1", text: "ما هي وحدة بناء الكائنات الحية؟", image_url: null, choices: [{ id: "c1", text: "الخلية", is_correct: true }, { id: "c2", text: "الأنسجة", is_correct: false }, { id: "c3", text: "الأعضاء", is_correct: false }, { id: "c4", text: "الجهاز", is_correct: false }], points: 10 },
    { id: "q2", section_id: "1", text: "كم عدد الكروموسومات في الخلية البشرية؟", image_url: null, choices: [{ id: "c1", text: "46", is_correct: true }, { id: "c2", text: "23", is_correct: false }, { id: "c3", text: "48", is_correct: false }, { id: "c4", text: "22", is_correct: false }], points: 15 },
    { id: "q3", section_id: "2", text: "ما هو رمز الذهب في الجدول الدوري؟", image_url: null, choices: [{ id: "c1", text: "Au", is_correct: true }, { id: "c2", text: "Ag", is_correct: false }, { id: "c3", text: "Fe", is_correct: false }, { id: "c4", text: "Cu", is_correct: false }], points: 10 },
    { id: "q4", section_id: "2", text: "ما هو العدد الذري للأكسجين؟", image_url: null, choices: [{ id: "c1", text: "8", is_correct: true }, { id: "c2", text: "6", is_correct: false }, { id: "c3", text: "16", is_correct: false }, { id: "c4", text: "2", is_correct: false }], points: 10 },
    { id: "q5", section_id: "3", text: "ما هي سرعة الضوء؟", image_url: null, choices: [{ id: "c1", text: "300,000 كم/ث", is_correct: true }, { id: "c2", text: "150,000 كم/ث", is_correct: false }, { id: "c3", text: "500,000 كم/ث", is_correct: false }, { id: "c4", text: "1,000,000 كم/ث", is_correct: false }], points: 20 },
    { id: "q6", section_id: "3", text: "ما هي وحدة قياس القوة؟", image_url: null, choices: [{ id: "c1", text: "نيوتن", is_correct: true }, { id: "c2", text: " joule", is_correct: false }, { id: "c3", text: "واط", is_correct: false }, { id: "c4", text: "باسكال", is_correct: false }], points: 10 },
  ];

  // Professional wheel spin with physics
  const spinWheel = () => {
    const availableSections = sections.filter(s => !usedSections.includes(s.id));
    
    if (isSpinning || availableSections.length === 0) {
      if (availableSections.length === 0 && sections.length > 0) {
        setTimeout(() => {
          setGameOver(true);
        }, 500);
      }
      return;
    }
    
    setIsSpinning(true);
    setShowQuestion(false);
    setSelectedChoice(null);
    setIsAnswered(false);
    setWaitingForNextSpin(false);
    setShowSectionResults(false);
    
    // Calculate target segment
    const segmentCount = availableSections.length;
    const segmentAngle = 360 / segmentCount;
    const randomSegment = Math.floor(Math.random() * segmentCount);
    const selectedSection = availableSections[randomSegment];
    
    // Professional physics parameters
    const pullBackAngle = 25; // Pull back 25 degrees
    const minSpins = 4; // Minimum 4 full rotations
    const maxSpins = 6; // Maximum 6 full rotations
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const finalAngle = (randomSegment * segmentAngle) + (Math.random() * segmentAngle * 0.7) + (segmentAngle * 0.15);
    
    // Calculate total rotation
    const pullBackRotation = rotation - pullBackAngle;
    const targetRotation = rotation + (spins * 360) + finalAngle;
    
    const wheel = wheelRef.current;
    if (!wheel) {
      // Fallback if ref not available
      setRotation(targetRotation);
      setTimeout(() => finishSpin(selectedSection), 4800);
      return;
    }
    
    // Phase 1: Pull back (300ms) - build tension
    wheel.animate([
      { transform: `rotate(${rotation}deg)` },
      { transform: `rotate(${pullBackRotation}deg)` }
    ], {
      duration: 300,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      fill: 'forwards'
    });
    
    // Phase 2: Spin forward with realistic physics (4.5 seconds)
    // Uses cubic-bezier(0.1, 0.7, 0.1, 1) for fast start, slow end, slight bounce
    setTimeout(() => {
      const spinAnimation = wheel.animate([
        { transform: `rotate(${pullBackRotation}deg)` },
        { transform: `rotate(${targetRotation}deg)` }
      ], {
        duration: 4500,
        easing: 'cubic-bezier(0.1, 0.7, 0.1, 1)', // Professional wheel easing
        fill: 'forwards'
      });
      
      // Simulate tick sounds during spin
      let lastTick = 0;
      const tickInterval = setInterval(() => {
        const currentRotation = parseFloat(wheel.style.transform.replace('rotate(', '').replace('deg)', '')) || rotation;
        const normalizedRotation = ((currentRotation % 360) + 360) % 360;
        const tick = Math.floor(normalizedRotation / segmentAngle);
        
        if (tick !== lastTick) {
          // Play subtle tick sound (using small beep or visual flash)
          lastTick = tick;
        }
      }, 50);
      
      spinAnimation.onfinish = () => {
        clearInterval(tickInterval);
        setRotation(targetRotation);
        finishSpin(selectedSection);
      };
    }, 300);
  };
  
  // Finish spin and show questions
  const finishSpin = (selectedSection: WheelSection) => {
    const sectionIndex = sections.findIndex(s => s.id === selectedSection.id);
    
    setSelectedIndex(sectionIndex);
    setCurrentSection(selectedSection);
    setUsedSections(prev => [...prev, selectedSection.id]);
    
    // Reset section stats
    setCurrentSectionStats({ correct: 0, wrong: 0, total: 0 });
    setCurrentSectionScore(0);
    
    const sectionQs = questions.filter(q => q.section_id === selectedSection.id);
    setSectionQuestions(sectionQs);
    setSectionProgress({ current: 1, total: sectionQs.length });
    
    // Randomize question order for variety
    const shuffledQs = [...sectionQs].sort(() => Math.random() - 0.5);
    setSectionQuestions(shuffledQs);
    
    if (shuffledQs.length > 0) {
      setCurrentQuestionIndex(0);
      setCurrentQuestion(shuffledQs[0]);
      setCurrentQuestionType(shuffledQs[0].choices.length === 2 ? 'true_false' : 'multiple_choice');
    }
    
    setShowQuestion(true);
    setIsSpinning(false);
    
    // Success sound with slight delay
    setTimeout(() => audioManager.playCorrect(), 100);
    
    toast.success(`🎯 ${selectedSection.name}`, { 
      description: `${shuffledQs.length} أسئلة في انتظارك!`,
      duration: 3000 
    });
  };

  const handleAnswer = (choiceId: string) => {
    if (!currentQuestion || isAnswered) return;
    
    setSelectedChoice(choiceId);
    
    const choice = currentQuestion.choices.find(c => c.id === choiceId);
    const isCorrect = choice?.is_correct || false;
    
    if (isCorrect) {
      // ✅ Correct Answer - proceed to next question
      const points = currentQuestion.points;
      
      // Check if this question was previously answered wrong
      const wasPreviouslyWrong = questionsWithErrors.has(currentQuestion.id);
      
      // If first time correct (not after wrong), count it as correct
      // If correct after wrong, don't increment correct count (only advances to next question)
      const nextSectionStats = {
        correct: wasPreviouslyWrong ? currentSectionStats.correct : currentSectionStats.correct + 1,
        wrong: currentSectionStats.wrong,  // Keep wrong count as-is
        total: currentSectionStats.total + 1
      };
      
      // Only add points if first-time correct, not if correct after wrong
      const pointsToAdd = wasPreviouslyWrong ? 0 : points;
      const nextSectionScore = currentSectionScore + pointsToAdd;

      audioManager.playCorrect();
      setIsCorrectAnswer(true);
      setIsAnswered(true);
      
      setScore(prev => prev + pointsToAdd);
      setCorrectCount(prev => wasPreviouslyWrong ? prev : prev + 1);
      setCurrentSectionScore(nextSectionScore);
      setShowCorrectFeedback(true);
      
      // Update section stats
      setCurrentSectionStats(nextSectionStats);
      
      toast.success(`إجابة صحيحة! +${points} نقطة`, { duration: 2000 });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      
      setAnsweredCount(prev => prev + 1);
      
      // Check if there are more questions in this section
      const nextIndex = currentQuestionIndex + 1;
      setTimeout(() => {
          if (nextIndex < sectionQuestions.length && answeredCount + 1 < 5) {
          // More questions in this section and total limit not reached
          setCurrentQuestionIndex(nextIndex);
          setCurrentQuestion(sectionQuestions[nextIndex]);
          setSectionProgress({ current: nextIndex + 1, total: sectionQuestions.length });
          setSelectedChoice(null);
          setIsAnswered(false);
          setIsCorrectAnswer(false);
          setShowCorrectFeedback(false);
          setWrongAttempts(0);
          // Update question type
          setCurrentQuestionType(sectionQuestions[nextIndex].choices.length === 2 ? 'true_false' : 'multiple_choice');
        } else {
          // Section complete or 5 questions reached - show results
          const isTotalLimitReached = answeredCount + 1 >= 5;
          const isRemainingSectionsEmpty = sections.filter(s => !usedSections.includes(s.id)).length === 1; // current is already in usedSections

          // Save section results
          if (currentSection) {
            setSectionResults(prev => new Map(prev).set(currentSection.id, nextSectionStats));
          }
          
          setCurrentSectionStats(nextSectionStats);
          setShowSectionResults(true); // Show results popup
          
          // Save attempt after each section
          void saveSectionAttempt(nextSectionStats, nextSectionScore);

          // If total limit reached, set stage over after a delay
          if (isTotalLimitReached) {
            setTimeout(() => {
                setShowSectionResults(false);
                setGameOver(true); // Treat as stage over
            }, 3000);
          }
        }
      }, 1500);
      
    } else {
      // ❌ Wrong Answer - don't proceed, allow retry
      audioManager.playWrong();
      setIsCorrectAnswer(false);
      
      // Count wrong attempt (only once per question)
      const isFirstWrongForThisQuestion = !questionsWithErrors.has(currentQuestion.id);
      
      if (isFirstWrongForThisQuestion) {
        setQuestionsWithErrors(prev => new Set(prev).add(currentQuestion.id));
        setWrongAttempts(prev => prev + 1);
        setCurrentSectionStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
        
        // Deduct points for wrong answer (penalty)
        const penalty = Math.min(currentQuestion.points * 0.5, 5);
        const penaltyPoints = Math.round(penalty);
        setScore(prev => Math.max(0, prev - penaltyPoints));
        setCurrentSectionScore(prev => Math.max(0, prev - penaltyPoints));
        
        toast.error(`إجابة خاطئة! خصم ${penaltyPoints} نقطة. حاول مرة أخرى`, { duration: 3000 });
      } else {
        toast.error("إجابة خاطئة! حاول مرة أخرى", { duration: 2000 });
      }
      
      // Allow retry
      setTimeout(() => {
        setSelectedChoice(null);
      }, 800);
    }
  };

  // Save section attempt to database
  const saveSectionAttempt = async (
    stats: { correct: number; wrong: number; total: number },
    sectionScore: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentSection && selectionContext) {
        const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);
        const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        const resolvedStudentName = studentName || "طالب";
        
        const { data: attemptData, error: insertError } = await supabase.from("game_attempts").insert({
          user_id: user.id,
          game_type: "wheel_science",
          score: sectionScore,
          correct_count: stats.correct,
          total_questions: stats.total,
          duration_seconds: durationSeconds,
          ...getScopedPayload(selectionContext),
          metadata: {
            student_name: resolvedStudentName,
            selection_context: getSelectionDisplayText(selectionContext),
            section_name: currentSection.name,
            section_id: currentSection.id,
            section_score: sectionScore,
            section_correct: stats.correct,
            section_wrong: stats.wrong,
            section_total: stats.total,
            percentage: percentage,
            game_name: "عجلة العلوم الدوارة",
            is_section_result: true
          }
        }).select().single() as any;
        
        if (insertError) {
          console.error("Error saving wheel section attempt", insertError);
          return;
        }

        if (attemptData) {
          const { error: emailError } = await supabase.functions.invoke('exam-finish', {
            body: {
              attempt_id: attemptData.id,
              is_game: true
            }
          });

          if (emailError) {
            console.error("Error sending wheel section notification", emailError);
          }
        }
      }
    } catch (err) {
      console.error("Error saving section attempt", err);
    }
  };

  // Continue to next section after viewing results
  const continueToNextSection = () => {
    setShowSectionResults(false);
    const remainingSections = sections.filter(s => !usedSections.includes(s.id));
    
    if (remainingSections.length === 0) {
      setGameOver(true);
    } else {
      setWaitingForNextSpin(true);
      setShowQuestion(false);
    }
  };

  const startNextStage = () => {
    setStage(prev => prev + 1);
    setAnsweredCount(0);
    setCorrectCount(0);
    setUsedSections([]);
    setCurrentSection(null);
    setSectionQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentQuestion(null);
    setSectionProgress({ current: 0, total: 0 });
    setGameOver(false);
    setShowQuestion(false);
    setSelectedChoice(null);
    setIsAnswered(false);
    setIsCorrectAnswer(false);
    setWaitingForNextSpin(false);
    setWrongAttempts(0);
    setQuestionsWithErrors(new Set());
    setShowCorrectFeedback(false);
    setSectionResults(new Map());
    setShowSectionResults(false);
    setCurrentSectionStats({ correct: 0, wrong: 0, total: 0 });
    setCurrentSectionScore(0);
    setRotation(0);
    setSelectedIndex(null);
    startTime.current = Date.now();
    fetchData();
  };

  const restartGame = () => {
    setScore(0);
    setStage(1);
    setTotalQuestions(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setUsedSections([]);
    setCurrentSection(null);
    setSectionQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentQuestion(null);
    setSectionProgress({ current: 0, total: 0 });
    setGameOver(false);
    setShowQuestion(false);
    setSelectedChoice(null);
    setIsAnswered(false);
    setIsCorrectAnswer(false);
    setWaitingForNextSpin(false);
    setWrongAttempts(0);
    setQuestionsWithErrors(new Set());
    setShowCorrectFeedback(false);
    setSectionResults(new Map());
    setShowSectionResults(false);
    setCurrentSectionStats({ correct: 0, wrong: 0, total: 0 });
    setCurrentSectionScore(0);
    setRotation(0);
    setSelectedIndex(null);
    startTime.current = Date.now();
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (gameOver) {
    const percentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <Card className="p-10 text-center space-y-6 max-w-md w-full animate-in zoom-in duration-500 shadow-2xl">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 blur-xl opacity-30 rounded-full"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-black text-slate-800 mb-1">أحسنت يا {studentName || "بطل"}! 🎉</h2>
            <p className="text-slate-500">أكملت المرحلة {stage} من عجلة العلوم</p>
          </div>
          
          {/* Score */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200">
            <div className="text-sm text-slate-500 mb-2">نقاط المرحلة</div>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              {currentSectionScore}
            </div>
            <div className="text-sm text-slate-400 mt-2">نقطة</div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="text-xl font-bold text-green-600">{currentSectionStats.correct}</div>
              <div className="text-xs text-slate-500">صحيحة</div>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="text-xl font-bold text-red-600">{currentSectionStats.wrong}</div>
              <div className="text-xs text-slate-500">أخطاء</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-xl font-bold text-blue-600">{currentSectionStats.total}</div>
              <div className="text-xs text-slate-500">مجموع</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-xl font-bold text-amber-600">{Math.round((currentSectionStats.correct / currentSectionStats.total) * 100)}%</div>
              <div className="text-xs text-slate-500">النسبة</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button onClick={startNextStage} className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
              <Sparkles className="w-6 h-6 ml-3" />
              الانتقال للمرحلة {stage + 1}
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={restartGame} variant="outline" className="h-12 text-lg rounded-xl font-bold border-2">
                <RotateCw className="w-5 h-5 ml-2" />
                إعادة اللعبة
              </Button>
              <Button asChild className="h-12 text-lg rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                <Link to="/student/dashboard" className="flex items-center justify-center font-bold">القائمة الرئيسية</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Calculate available sections for wheel display
  const availableSections = sections.filter(s => !usedSections.includes(s.id));
  const segmentCount = Math.min(availableSections.length || 1, 8);
  const segmentAngle = 360 / (segmentCount > 0 ? segmentCount : 1);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b py-3 px-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" asChild className="rounded-full">
              <Link to="/central-exam/games">
                <ArrowRight className="w-5 h-5 ml-1" />
                العودة
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-800">عجلة العلوم - المرحلة {stage}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className="text-center">
                <span className="text-xs text-muted-foreground uppercase font-bold">النقاط</span>
                <span className="font-bold text-base leading-none text-rose-600 mr-1">{score}</span>
              </div>
            </div>
          </div>
          
          {/* Progress Row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600">الأقسام المكتملة</span>
                <span className="font-bold text-primary">{Math.min(usedSections.length, sections.length)} / {sections.length}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                  style={{ width: `${sections.length > 0 ? (Math.min(usedSections.length, sections.length) / sections.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            {currentSection && showQuestion && (
              <div className="px-3 py-1 bg-slate-100 rounded-lg">
                <span className="text-xs text-slate-500">{currentSection.icon} التقدم</span>
                <span className="font-bold text-primary mr-1">
                  {answeredCount + 1}/5
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container max-w-5xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        {!showQuestion ? (
          <div className="w-full max-w-2xl space-y-8">
            {/* Wheel Container */}
            <div className="relative flex justify-center">
              {/* Pointer with flash effect */}
              <div 
                id="wheel-pointer"
                className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10 transition-all duration-75 ${isSpinning ? 'scale-110' : ''}`}
              >
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[35px] border-t-slate-800 drop-shadow-2xl"></div>
                {/* Pointer glow */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-400 rounded-full blur-md transition-opacity duration-150 ${isSpinning ? 'opacity-100' : 'opacity-0'}`}></div>
              </div>
              
              {/* Modern SVG Wheel */}
              <div className="relative">
                {/* Outer glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 via-purple-500 to-blue-500 blur-2xl opacity-30 animate-pulse"></div>
                
                {/* Outer rim - professional casino style */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 p-3 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 p-1">
                    <div className="w-full h-full rounded-full bg-slate-800"></div>
                  </div>
                </div>
                
                <div 
                  ref={wheelRef}
                  onClick={() => !isSpinning && availableSections.length > 0 && !waitingForNextSpin && spinWheel()}
                  className={`relative w-80 h-80 md:w-[28rem] md:h-[28rem] p-4 ${!isSpinning && availableSections.length > 0 && !waitingForNextSpin ? 'cursor-pointer' : ''}`}
                  style={{ 
                    transform: `rotate(${rotation}deg)`,
                    willChange: 'transform'
                  }}
                >
                  <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                    {/* Wheel segments */}
                    {availableSections.length > 0 && Array.from({ length: segmentCount }, (_, i) => {
                      const startAngle = (i * 360 / segmentCount) - 90;
                      const endAngle = ((i + 1) * 360 / segmentCount) - 90;
                      const section = availableSections[i % availableSections.length];
                      const color = section?.color || '#3b82f6';
                      
                      // Calculate path for segment
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const x1 = 200 + 180 * Math.cos(startRad);
                      const y1 = 200 + 180 * Math.sin(startRad);
                      const x2 = 200 + 180 * Math.cos(endRad);
                      const y2 = 200 + 180 * Math.sin(endRad);
                      
                      return (
                        <g key={i}>
                          {/* Segment slice */}
                          <path
                            d={`M 200 200 L ${x1} ${y1} A 180 180 0 0 1 ${x2} ${y2} Z`}
                            fill={color}
                            stroke="white"
                            strokeWidth="3"
                            className="hover:opacity-90 transition-opacity"
                          />
                          {/* Segment icon */}
                          <text
                            x={200 + 120 * Math.cos((startRad + endRad) / 2)}
                            y={200 + 120 * Math.sin((startRad + endRad) / 2)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="32"
                            className="select-none"
                          >
                            {section?.icon}
                          </text>
                          {/* Segment label */}
                          <text
                            x={200 + 80 * Math.cos((startRad + endRad) / 2)}
                            y={200 + 80 * Math.sin((startRad + endRad) / 2) + 20}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="12"
                            fontWeight="bold"
                            className="select-none"
                            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                          >
                            {section?.name?.slice(0, 8)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Center circle with gradient */}
                    <defs>
                      <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff" />
                        <stop offset="100%" stopColor="#f1f5f9" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="200" cy="200" r="50" fill="url(#centerGrad)" stroke="#e2e8f0" strokeWidth="4" filter="url(#glow)" />
                    {/* Center icon */}
                    <text x="200" y="200" textAnchor="middle" dominantBaseline="middle" fontSize="28">
                      {availableSections.length > 0 ? '🎯' : '🏆'}
                    </text>
                  </svg>
                </div>
                
                {/* Clickable Center Button */}
                {!isSpinning && availableSections.length > 0 && !waitingForNextSpin && (
                  <button
                    onClick={spinWheel}
                    className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-2xl shadow-rose-500/50 hover:shadow-rose-500/70 hover:scale-110 transition-all duration-300 flex items-center justify-center group cursor-pointer z-20 border-4 border-white"
                    disabled={isSpinning}
                  >
                    <div className="text-center">
                      <Target className="w-8 h-8 text-white mx-auto mb-1 group-hover:animate-bounce" />
                      <span className="text-white text-xs font-bold">لفّ</span>
                    </div>
                  </button>
                )}
                
                {/* Professional center indicator */}
                {isSpinning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      {/* Outer ring */}
                      <div className="w-20 h-20 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin"></div>
                      {/* Inner glow */}
                      <div className="absolute inset-0 m-auto w-12 h-12 bg-amber-400/30 rounded-full blur-xl animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Spin Button / Waiting Message */}
            <div className="text-center">
              {availableSections.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-amber-600 font-bold text-xl">🎉 اكتملت جميع الأقسام!</div>
                  <p className="text-slate-500">أكملت {usedSections.length} قسم بنجاح</p>
                  <Button
                    onClick={() => { setGameOver(true); }}
                    className="h-14 px-8 text-lg font-bold rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl"
                  >
                    <Trophy className="w-5 h-5 ml-2" />
                    عرض النتيجة النهائية
                  </Button>
                </div>
              ) : waitingForNextSpin ? (
                <div className="space-y-4">
                  <div className="text-primary font-bold text-lg">
                    ✓ اكتمل قسم {currentSection?.name}
                  </div>
                  <Button
                    onClick={spinWheel}
                    className="h-16 px-12 text-xl font-bold rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 transition-all hover:-translate-y-1"
                  >
                    <Target className="w-6 h-6 ml-2" />
                    لف العجلة للقسم التالي
                    <span className="mr-2 text-sm opacity-80">({availableSections.length} متبقي)</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="h-16 px-12 text-xl font-bold rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSpinning ? (
                      <>
                        <RotateCw className="w-6 h-6 ml-2 animate-spin" />
                        يدور...
                      </>
                    ) : (
                      <>
                        <Target className="w-6 h-6 ml-2" />
                        دور العجلة
                      </>
                    )}
                  </Button>
                  <p className="text-slate-500 text-sm">
                    اضغط على الزر لبدء دوران العجلة واختيار قسم جديد
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Question Card */
          <div className="w-full max-w-2xl animate-in zoom-in duration-300">
            <Card className="p-8 shadow-xl border-2 border-slate-100">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {currentSection?.image_url && (
                    <img
                      src={currentSection.image_url}
                      alt={currentSection.name}
                      className="w-8 h-8 object-cover rounded-full border-2 border-white"
                    />
                  )}
                  <div 
                    className="px-4 py-2 rounded-full text-white text-sm font-bold"
                    style={{ backgroundColor: currentSection?.color || '#3b82f6' }}
                  >
                    {currentSection?.icon} {currentSection?.name}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Wrong Attempts Indicator */}
                  {wrongAttempts > 0 && (
                    <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-bold">
                      ❌ {wrongAttempts} {wrongAttempts === 1 ? 'خطأ' : 'أخطاء'}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-amber-600 font-bold">
                    <Sparkles className="w-5 h-5" />
                    {currentQuestion?.points} نقطة
                  </div>
                </div>
              </div>
              
              {/* Answer Feedback */}
              {isAnswered && isCorrectAnswer && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center animate-in zoom-in">
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-green-700 font-bold text-lg">إجابة صحيحة! أحسنت</div>
                  <div className="text-green-600 text-sm">+{currentQuestion?.points} نقطة</div>
                </div>
              )}

              {/* Question Image */}
              {currentQuestion?.image_url && (
                <div className="mb-6 flex justify-center">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="max-w-full max-h-48 object-contain rounded-xl border-2 border-slate-200"
                  />
                </div>
              )}

              {/* Question Text */}
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 leading-relaxed text-center">
                <HelpCircle className="w-8 h-8 inline-block ml-2 text-primary" />
                {currentQuestion?.text}
              </h2>

              {/* Question Type Badge */}
              <div className="flex justify-center mb-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  currentQuestionType === 'true_false' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {currentQuestionType === 'true_false' ? '📋 صح أو خطأ' : '📝 اختيار من متعدد'}
                </span>
              </div>

              {/* Choices - Different layout for True/False vs Multiple Choice */}
              <div className={currentQuestionType === 'true_false' 
                ? "flex gap-4 justify-center" 
                : "grid grid-cols-1 md:grid-cols-2 gap-4"
              }>
                {/* Deduplicate choices */}
                {Array.from(new Map(currentQuestion?.choices.map(c => [c.id, c])).values()).map((choice, idx) => {
                  const isSelected = selectedChoice === choice.id;
                  const isCorrect = choice.is_correct;
                  const wasWrong = selectedChoice === choice.id && !isCorrectAnswer && isSelected;
                  
                  // True/False styling - larger buttons side by side
                  const isTrueFalse = currentQuestionType === 'true_false';
                  
                  let choiceClass = isTrueFalse
                    ? "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl"
                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50";
                    
                  let icon = null;
                  
                  if (isCorrectAnswer && isAnswered) {
                    if (isCorrect) {
                      choiceClass = isTrueFalse
                        ? "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl border-green-500 bg-green-50 text-green-700"
                        : "border-green-500 bg-green-50 text-green-700";
                      icon = "✓";
                    } else {
                      choiceClass = isTrueFalse
                        ? "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl border-slate-200 opacity-50"
                        : "border-slate-200 opacity-50";
                    }
                  } else if (wasWrong) {
                    choiceClass = isTrueFalse
                      ? "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl border-red-500 bg-red-50 text-red-700 animate-pulse"
                      : "border-red-500 bg-red-50 text-red-700 animate-pulse";
                    icon = "✗";
                  } else if (isSelected) {
                    choiceClass = isTrueFalse
                      ? "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl border-primary bg-primary/5 text-primary"
                      : "border-primary bg-primary/5 text-primary";
                  }
                  
                  // True/False specific styling
                  if (isTrueFalse && !isAnswered && !isSelected) {
                    if (choice.text === 'صح' || choice.text.toLowerCase().includes('true') || choice.text === 'صحيح') {
                      choiceClass = "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl bg-green-100 border-green-300 text-green-700 hover:bg-green-200";
                    } else if (choice.text === 'خطأ' || choice.text.toLowerCase().includes('false') || choice.text === 'غلط') {
                      choiceClass = "flex-1 h-24 text-2xl font-bold border-3 rounded-2xl bg-red-100 border-red-300 text-red-700 hover:bg-red-200";
                    }
                  }

                  return (
                    <button
                      key={choice.id || idx}
                      onClick={() => handleAnswer(choice.id || `${idx}`)}
                      disabled={isCorrectAnswer && isAnswered} // Only disable after correct answer
                      className={`p-5 rounded-xl border-2 text-lg font-semibold transition-all duration-200 text-right flex items-center justify-between ${choiceClass}`}
                    >
                      <span>{choice.text}</span>
                      {icon && <span className="text-2xl">{icon}</span>}
                    </button>
                  );
                })}
              </div>
              
              {/* Retry Hint - show when wrong */}
              {!isCorrectAnswer && selectedChoice && !isAnswered && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <div className="text-amber-700 text-sm">
                    ❌ إجابة خاطئة! حاول مرة أخرى
                  </div>
                </div>
              )}

              {/* Next Button */}
              {isAnswered && (
                <div className="mt-8 text-center">
                  <Button
                    onClick={() => setShowQuestion(false)}
                    className="h-14 px-8 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-blue-600"
                  >
                    السؤال التالي
                    <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Section Results Dialog */}
      <Dialog open={showSectionResults} onOpenChange={setShowSectionResults}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              🎉 نتيجة القسم: {currentSection?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Score Circle */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="url(#gradient)" 
                    strokeWidth="8"
                    strokeDasharray={`${(currentSectionStats.correct / currentSectionStats.total) * 283} 283`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-slate-800">
                    {Math.round((currentSectionStats.correct / currentSectionStats.total) * 100)}%
                  </span>
                  <span className="text-xs text-slate-500">النسبة</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-600">{currentSectionStats.correct}</div>
                <div className="text-xs text-slate-500">صحيح</div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl text-center border border-red-200">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-600">{currentSectionStats.wrong}</div>
                <div className="text-xs text-slate-500">خاطئ</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-200">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-600">{currentSectionStats.total}</div>
                <div className="text-xs text-slate-500">المجموع</div>
              </div>
            </div>

            {/* Section Grade */}
            {(() => {
              const percentage = (currentSectionStats.correct / currentSectionStats.total) * 100;
              let grade = { text: '', color: '', icon: '' };
              if (percentage >= 90) grade = { text: 'ممتاز! 🌟', color: 'text-purple-600', icon: '🏆' };
              else if (percentage >= 75) grade = { text: 'جيد جداً! ⭐', color: 'text-green-600', icon: '🥇' };
              else if (percentage >= 60) grade = { text: 'جيد! 👍', color: 'text-blue-600', icon: '🥈' };
              else grade = { text: 'حاول مرة أخرى 💪', color: 'text-amber-600', icon: '📚' };
              
              return (
                <div className={`text-center p-4 rounded-xl bg-slate-50 border ${grade.color}`}>
                  <div className="text-2xl mb-1">{grade.icon}</div>
                  <div className="text-xl font-bold">{grade.text}</div>
                </div>
              );
            })()}

            {/* Action Button */}
            <Button 
              onClick={continueToNextSection}
              className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700"
            >
              {usedSections.length < sections.length ? (
                <>
                  <Target className="w-5 h-5 ml-2" />
                  الانتقال للقسم التالي
                </>
              ) : (
                <>
                  <Trophy className="w-5 h-5 ml-2" />
                  عرض النتيجة النهائية
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
