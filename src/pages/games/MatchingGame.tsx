import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  RefreshCw,
  Trophy,
  Target,
  Gamepad2,
  Award,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { CertificateModal } from "@/components/exam/CertificateModal";
import {
  getSelectionDisplayText,
  getStoredSelectionContext,
  ensureStoredSelectionContext,
} from "@/lib/selection-context";
import {
  applySelectionFilters,
  getScopedPayload,
} from "@/lib/selection-scope";

interface MatchingItem {
  left_text?: string;
  right_text?: string;
  left_image_url?: string | null;
  right_image_url?: string | null;
}

interface RawQuestion {
  id: string;
  items?: MatchingItem[];
  left_text?: string | null;
  right_text?: string | null;
  left_image_url?: string | null;
  right_image_url?: string | null;
  domain_id?: string | null;
  track_type?: string | null;
}

interface MatchingPair {
  id: string;
  termText: string;
  termImageUrl?: string | null;
  answerText?: string | null;
  answerImageUrl?: string | null;
}

interface MatchingBoard {
  id: string;
  title: string;
  pairs: MatchingPair[];
}

interface DisplayItem {
  id: string;
  text?: string | null;
  imageUrl?: string | null;
}

export default function MatchingGame() {
  const navigate = useNavigate();
  const selectionContext = useMemo(
    () => getStoredSelectionContext() || ensureStoredSelectionContext("nafis"),
    [],
  );

  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<MatchingBoard[]>([]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);

  // Active Board State
  const [terms, setTerms] = useState<DisplayItem[]>([]);
  const [answers, setAnswers] = useState<DisplayItem[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{
    termId: string;
    answerId: string;
  } | null>(null);
  const [isRoundCompleted, setIsRoundCompleted] = useState(false);

  // Global Game State
  const [score, setScore] = useState(0);
  const [totalPairsMatched, setTotalPairsMatched] = useState(0);
  const [totalPairsCount, setTotalPairsCount] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [isFinished, setIsFinished] = useState(false);
  const [studentName, setStudentName] = useState<string>("");
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  useEffect(() => {
    const fetchStudentName = async () => {
      try {
        const local =
          localStorage.getItem("student_name") ||
          sessionStorage.getItem("student_name");
        if (local) {
          setStudentName(local);
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
  }, [selectionContext]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let questionsList: RawQuestion[] = [];

      // 1. If a domain is selected, STRICTLY query questions for this domain!
      if (selectionContext?.domainId && selectionContext.domainId !== "all") {
        // First try: match track + domain
        const trackDomainRes = await supabase
          .from("matching_game_questions")
          .select("*")
          .eq("is_active", true)
          .eq("domain_id", selectionContext.domainId)
          .eq("track_type", selectionContext.trackType || "nafis");

        if (trackDomainRes.data && trackDomainRes.data.length > 0) {
          questionsList = trackDomainRes.data as RawQuestion[];
        } else {
          // Second try: match domain across all tracks
          const domainCrossRes = await supabase
            .from("matching_game_questions")
            .select("*")
            .eq("is_active", true)
            .eq("domain_id", selectionContext.domainId);

          if (domainCrossRes.data && domainCrossRes.data.length > 0) {
            questionsList = domainCrossRes.data as RawQuestion[];
          }
        }

        // If STILL no questions for this domain, DO NOT fall back to other domains!
        if (questionsList.length === 0) {
          const domainName = selectionContext.domainName || "هذا التخصص";
          toast.error(`لا توجد أسئلة مطابقة مفعلة لمجال "${domainName}" حالياً، يُرجى إضافة أسئلة من لوحة التحكم`);
          setLoading(false);
          return;
        }
      } else {
        // 2. No specific domain was selected: query by track / grade_subject
        let { data: allQuestions } = await applySelectionFilters(
          supabase
            .from("matching_game_questions")
            .select("*")
            .eq("is_active", true),
          selectionContext,
        );
        if (allQuestions && allQuestions.length > 0) {
          questionsList = allQuestions as RawQuestion[];
        } else {
          const anyRes = await supabase
            .from("matching_game_questions")
            .select("*")
            .eq("is_active", true)
            .limit(30);
          if (anyRes.data && anyRes.data.length > 0) {
            questionsList = anyRes.data as RawQuestion[];
          }
        }
      }

      if (!questionsList || questionsList.length === 0) {
        toast.error("لا توجد أسئلة مطابقة متاحة حالياً");
        setLoading(false);
        return;
      }

      const scopedQuestions = questionsList;
      const constructedBoards: MatchingBoard[] = [];
      const standalonePairs: MatchingPair[] = [];

      for (const raw of scopedQuestions) {
        if (raw.items && Array.isArray(raw.items) && raw.items.length > 1) {
          // Multi-item question -> forms its own multi-pair board!
          const boardPairs: MatchingPair[] = [];
          raw.items.forEach((item, idx) => {
            const term =
              item.left_text?.trim() || item.right_text?.trim() || "مصطلح علمي";
            const img = item.right_image_url || item.left_image_url || null;
            const ansText =
              !img && item.right_text?.trim() ? item.right_text.trim() : null;

            if (term || img || ansText) {
              boardPairs.push({
                id: `${raw.id}_${idx}`,
                termText: term,
                termImageUrl: item.left_image_url || null,
                answerText: ansText,
                answerImageUrl: img,
              });
            }
          });
          if (boardPairs.length > 0) {
            constructedBoards.push({
              id: raw.id,
              title: `تحدي ${constructedBoards.length + 1}`,
              pairs: boardPairs,
            });
          }
        } else {
          // Single item question
          const item =
            raw.items && raw.items.length > 0
              ? raw.items[0]
              : {
                  left_text: raw.left_text || "",
                  right_text: raw.right_text || "",
                  left_image_url: raw.left_image_url,
                  right_image_url: raw.right_image_url,
                };

          const term =
            item.left_text?.trim() || item.right_text?.trim() || "مصطلح علمي";
          const img = item.right_image_url || item.left_image_url || null;
          const ansText =
            !img && item.right_text?.trim() ? item.right_text.trim() : null;

          if (term || img || ansText) {
            standalonePairs.push({
              id: `${raw.id}_0`,
              termText: term,
              termImageUrl: item.left_image_url || null,
              answerText: ansText,
              answerImageUrl: img,
            });
          }
        }
      }

      // Group standalone single-item questions into boards of 3 to 4 pairs each
      const CHUNK_SIZE = 4;
      for (let i = 0; i < standalonePairs.length; i += CHUNK_SIZE) {
        const chunk = standalonePairs.slice(i, i + CHUNK_SIZE);
        constructedBoards.push({
          id: `group_${constructedBoards.length}`,
          title: `تحدي ${constructedBoards.length + 1}`,
          pairs: chunk,
        });
      }

      if (constructedBoards.length === 0) {
        toast.error("لا توجد بيانات مطابقة صالحة");
        setLoading(false);
        return;
      }

      // Calculate total pairs
      const totalPairs = constructedBoards.reduce(
        (sum, b) => sum + b.pairs.length,
        0,
      );
      setTotalPairsCount(totalPairs);
      setBoards(constructedBoards);
      setCurrentBoardIndex(0);
      initBoard(constructedBoards[0]);
    } catch (error) {
      console.error("Error fetching matching questions:", error);
      toast.error("فشل تحميل بيانات لعبة المطابقة");
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const initBoard = (board: MatchingBoard) => {
    // 1. Column of Terms (المصطلحات والمفاهيم العلمية)
    const termsList: DisplayItem[] = board.pairs.map((p) => ({
      id: p.id,
      text: p.termText,
      imageUrl: p.termImageUrl,
    }));

    // 2. Column of Images/Answers (الصور التوضيحية المقابلة) - Shuffled!
    const answersList: DisplayItem[] = shuffleArray(
      board.pairs.map((p) => ({
        id: p.id,
        text: p.answerText,
        imageUrl: p.answerImageUrl,
      })),
    );

    setTerms(termsList);
    setAnswers(answersList);
    setMatchedIds([]);
    setSelectedTermId(null);
    setSelectedAnswerId(null);
    setWrongPair(null);
    setIsRoundCompleted(false);
  };

  const handleSelectTerm = (id: string) => {
    if (matchedIds.includes(id) || wrongPair) return;
    audioManager.playClick();

    if (selectedTermId === id) {
      setSelectedTermId(null);
      return;
    }

    setSelectedTermId(id);
    if (selectedAnswerId) {
      checkMatch(id, selectedAnswerId);
    }
  };

  const handleSelectAnswer = (id: string) => {
    if (matchedIds.includes(id) || wrongPair) return;
    audioManager.playClick();

    if (selectedAnswerId === id) {
      setSelectedAnswerId(null);
      return;
    }

    setSelectedAnswerId(id);
    if (selectedTermId) {
      checkMatch(selectedTermId, id);
    }
  };

  const checkMatch = (termId: string, answerId: string) => {
    if (termId === answerId) {
      // Correct Match!
      audioManager.playCorrect();
      toast.success("مطابقة صحيحة! أحسنت 🌟", { duration: 1500 });
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
      });

      const updatedMatched = [...matchedIds, termId];
      setMatchedIds(updatedMatched);
      setScore((prev) => prev + 10);
      setTotalPairsMatched((prev) => prev + 1);
      setSelectedTermId(null);
      setSelectedAnswerId(null);

      // Check if all pairs in this board are matched
      const currentBoard = boards[currentBoardIndex];
      if (currentBoard && updatedMatched.length === currentBoard.pairs.length) {
        setIsRoundCompleted(true);
        audioManager.playPowerUp();
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.55 },
        });

        // Automatically advance or show next button
        setTimeout(() => {
          handleNextRound(updatedMatched.length);
        }, 1600);
      }
    } else {
      // Wrong Match!
      audioManager.playWrong();
      setWrongPair({ termId, answerId });
      setScore((prev) => Math.max(0, prev - 2));
      toast.error("المصطلح لا يطابق هذه الصورة، حاول مرة أخرى", {
        duration: 1500,
      });

      setTimeout(() => {
        setWrongPair(null);
        setSelectedTermId(null);
        setSelectedAnswerId(null);
      }, 700);
    }
  };

  const handleNextRound = (lastMatchedCount?: number) => {
    if (currentBoardIndex + 1 < boards.length) {
      const nextIdx = currentBoardIndex + 1;
      setCurrentBoardIndex(nextIdx);
      initBoard(boards[nextIdx]);
    } else {
      handleWin();
    }
  };

  const handleWin = () => {
    setIsFinished(true);
    audioManager.playVictory();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });
    saveAttempt();
  };

  const saveAttempt = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && selectionContext) {
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        const resolvedStudentName = studentName || "طالب متميز";

        const { data: attemptData, error: insertError } = (await supabase
          .from("game_attempts")
          .insert({
            user_id: user.id,
            game_type: "matching",
            level: 1,
            score: score,
            correct_count: totalPairsMatched,
            total_questions: totalPairsCount,
            duration_seconds: durationSeconds,
            ...getScopedPayload(selectionContext),
            metadata: {
              student_name: resolvedStudentName,
              selection_context: getSelectionDisplayText(selectionContext),
              game_name: "لعبة المطابقة العلمية",
            },
          })
          .select()
          .single()) as any;

        if (attemptData && !insertError) {
          await supabase.functions.invoke("exam-finish", {
            body: { attempt_id: attemptData.id, is_game: true },
          });
        }
      }
    } catch (err) {
      console.error("Error saving game score", err);
    }
  };

  const currentBoard = boards[currentBoardIndex];
  const remainingInBoard = currentBoard
    ? currentBoard.pairs.length - matchedIds.length
    : 0;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-pink-50/60 flex flex-col font-sans"
      dir="rtl"
    >
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Scoped Keyframes for Smooth Feedback */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes cardShake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-8px); }
              40%, 80% { transform: translateX(8px); }
            }
            .animate-card-shake {
              animation: cardShake 0.4s ease-in-out;
            }
          `,
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 bg-white/85 backdrop-blur-xl border-b border-indigo-100/80 py-3.5 px-4 sm:px-6 sticky top-0 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Right Section: Back + Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-2xl border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
            >
              <Link to="/student/dashboard">
                <ArrowRight className="w-4 h-4 ml-1.5" />
                <span>الرئيسية</span>
              </Link>
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-rose-500/25">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  لعبة المطابقة العلمية
                </h1>
                <span className="text-[11px] font-bold text-slate-500">
                  {selectionContext.trackType === "central"
                    ? "المسار المركزي 🎯"
                    : "مسار بنك نافس الوطني 🇸🇦"}
                </span>
              </div>
            </div>
          </div>

          {/* Left Section: Live Stats Counters */}
          <div className="flex items-center gap-2 sm:gap-4">
            {boards.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-indigo-50/90 border border-indigo-200/80 px-3.5 py-1.5 rounded-2xl">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black text-indigo-900">
                  المرحلة {currentBoardIndex + 1} من {boards.length}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2.5 bg-white/95 border border-slate-200/90 px-3.5 py-1.5 rounded-2xl shadow-xs">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold">النقاط</span>
                <span className="font-black text-sm sm:text-base leading-none text-emerald-600">
                  {score} ⭐
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold">المتبقي</span>
                <span className="font-black text-sm sm:text-base leading-none text-indigo-600">
                  {remainingInBoard}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container max-w-6xl mx-auto p-3 sm:p-6 md:p-8 flex flex-col items-center justify-center relative z-10">
        {loading ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-indigo-700 font-black text-lg">
              جاري تجهيز بطاقات المطابقة العلمية...
            </p>
          </div>
        ) : boards.length === 0 ? (
          <Card className="p-10 text-center bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl max-w-md w-full space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800">
              لا توجد أسئلة مطابقة متاحة
            </h3>
            <p className="text-sm font-bold text-slate-500">
              لم يتم العثور على أزواج مطابقة مسجلة لهذا المسار حالياً.
            </p>
            <Button
              onClick={fetchQuestions}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl w-full"
            >
              إعادة المحاولة
            </Button>
          </Card>
        ) : isFinished ? (
          /* Finished Screen */
          <Card className="p-8 sm:p-10 text-center space-y-6 max-w-lg w-full bg-white/95 backdrop-blur-xl border-2 border-indigo-100 shadow-2xl rounded-[2.5rem] animate-in zoom-in-95 duration-500">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30 text-white ring-4 ring-amber-100">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
                ✨
              </div>
              <div className="absolute -bottom-1 -left-2 text-xl animate-bounce delay-150">
                ⭐
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                مبارك يا {studentName || "بطل العلم"}! 🌟
              </h2>
              <p className="text-sm sm:text-base font-bold text-slate-600">
                لقد أتممت جميع مراحل لعبة المطابقة العلمية بكفاءة وتفوق.
              </p>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-3xl border border-indigo-100/90 space-y-2">
              <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider">
                مجموع النقاط المحققة
              </div>
              <div className="text-5xl font-black text-indigo-700">
                {score} ⭐
              </div>
              <div className="text-xs font-black text-slate-500 pt-1">
                تمت مطابقة {totalPairsMatched} من {totalPairsCount} مصطلح علمي
                بنجاح
              </div>
            </div>

            {/* Certificate Button */}
            <Button
              onClick={() => setShowCertificateModal(true)}
              className="w-full min-h-[3.5rem] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 shadow-xl shadow-amber-500/25 font-black text-base sm:text-lg flex items-center justify-center gap-2 border-2 border-amber-300 transform hover:scale-[1.01] active:scale-95 transition-all"
            >
              <Award className="w-6 h-6 shrink-0 text-slate-950" />
              <span>عرض وتحميل شهادة الشكر والتقدير</span>
            </Button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="h-12 rounded-2xl font-black text-sm border-2 border-slate-200 hover:bg-slate-100 text-slate-700 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة اللعبة</span>
              </Button>
              <Button
                asChild
                className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm"
              >
                <Link to="/student/dashboard">
                  <span>لوحة التحكم</span>
                </Link>
              </Button>
            </div>

            <CertificateModal
              isOpen={showCertificateModal}
              onClose={() => setShowCertificateModal(false)}
              studentName={studentName || "طالب متميز"}
              score={totalPairsMatched}
              totalQuestions={totalPairsCount}
              percentage={
                totalPairsCount > 0
                  ? Math.round((totalPairsMatched / totalPairsCount) * 100)
                  : 100
              }
              examTitle="لعبة المطابقة العلمية - منصة براين ساينس"
            />
          </Card>
        ) : (
          /* Active Two-Column Matching Arena */
          <div className="w-full max-w-5xl space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            {/* Round Mission Banner */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-black text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  المرحلة {currentBoardIndex + 1} من {boards.length} • طابق كل
                  مصطلح مع صورته المناسبة
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-slate-900">
                صل كل <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-600">مصطلح علمي</span> بـ <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-rose-600">صورته المقابلة</span>
              </h2>
            </div>

            {/* Two Parallel Columns: Terms on Right, Images on Left */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full items-start">
              {/* Column 1: المفاهيم والمصطلحات العلمية (Terms Column) */}
              <div className="space-y-3 bg-white/70 backdrop-blur-xl p-4 sm:p-5 rounded-[2rem] border-2 border-indigo-100 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-50">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                      📝
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        المفاهيم والمصطلحات
                      </h3>
                      <p className="text-[11px] font-bold text-slate-500">
                        اضغط لاختيار المصطلح
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-indigo-50/80 text-indigo-700 border-indigo-200 font-bold text-xs"
                  >
                    عمود المصطلحات
                  </Badge>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  {terms.map((item, idx) => {
                    const isMatched = matchedIds.includes(item.id);
                    const isSelected = selectedTermId === item.id;
                    const isWrong = wrongPair?.termId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handleSelectTerm(item.id)}
                        className={`group relative text-right p-4 sm:p-4.5 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 flex items-center justify-between gap-3 border-2 cursor-pointer select-none ${
                          isWrong
                            ? "bg-rose-50 border-rose-500 text-rose-800 ring-4 ring-rose-200 animate-card-shake"
                            : isMatched
                            ? "bg-emerald-50/90 border-emerald-400 text-emerald-800 opacity-90 cursor-default ring-2 ring-emerald-100 shadow-2xs"
                            : isSelected
                            ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-500 text-indigo-950 scale-[1.02] shadow-lg ring-4 ring-indigo-200/80"
                            : "bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-indigo-300 text-slate-800 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              isMatched
                                ? "bg-emerald-500 text-white"
                                : isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                            }`}
                          >
                            {isMatched ? "✓" : idx + 1}
                          </span>
                          <span className="truncate leading-relaxed">
                            {item.text || "مصطلح علمي"}
                          </span>
                        </div>

                        {isMatched ? (
                          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>متطابق</span>
                          </span>
                        ) : isSelected ? (
                          <span className="flex items-center gap-1 text-[11px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg shrink-0 animate-pulse">
                            <span>محدد 🎯</span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: الصور التوضيحية المقابلة (Images Column) */}
              <div className="space-y-3 bg-white/70 backdrop-blur-xl p-4 sm:p-5 rounded-[2rem] border-2 border-pink-100 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-pink-50">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-black text-sm">
                      🖼️
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        الصور التوضيحية المقابلة
                      </h3>
                      <p className="text-[11px] font-bold text-slate-500">
                        اضغط لمطابقة الصورة مع المصطلح
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-pink-50/80 text-pink-700 border-pink-200 font-bold text-xs"
                  >
                    عمود الصور
                  </Badge>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  {answers.map((item, idx) => {
                    const isMatched = matchedIds.includes(item.id);
                    const isSelected = selectedAnswerId === item.id;
                    const isWrong = wrongPair?.answerId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handleSelectAnswer(item.id)}
                        className={`group relative text-right p-3.5 sm:p-4 rounded-2xl font-black transition-all duration-300 flex items-center justify-between gap-3 border-2 cursor-pointer select-none min-h-[5.5rem] ${
                          isWrong
                            ? "bg-rose-50 border-rose-500 ring-4 ring-rose-200 animate-card-shake"
                            : isMatched
                            ? "bg-emerald-50/90 border-emerald-400 opacity-90 cursor-default ring-2 ring-emerald-100 shadow-2xs"
                            : isSelected
                            ? "bg-gradient-to-r from-pink-50 to-purple-50 border-pink-500 scale-[1.02] shadow-lg ring-4 ring-pink-200/80"
                            : "bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-pink-300 hover:shadow-md"
                        }`}
                      >
                        {/* Image Preview or Text Answer */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {item.imageUrl ? (
                            <div className="h-16 w-20 sm:h-20 sm:w-28 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                              <img
                                src={item.imageUrl}
                                alt="Matching item"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-xs font-black">
                              {idx + 1}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            {item.text ? (
                              <p className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed">
                                {item.text}
                              </p>
                            ) : (
                              <span className="text-xs font-bold text-slate-500">
                                صورة توضيحية للمصطلح
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Tag */}
                        {isMatched ? (
                          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>متطابق</span>
                          </span>
                        ) : isSelected ? (
                          <span className="flex items-center gap-1 text-[11px] font-black text-pink-700 bg-pink-100 px-2 py-0.5 rounded-lg shrink-0 animate-pulse">
                            <span>محدد 🎯</span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions / Round Progress Pill */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  تم إنجاز {matchedIds.length} من {currentBoard?.pairs.length || 0} في هذه المرحلة
                </span>
              </div>

              {isRoundCompleted && (
                <Button
                  onClick={() => handleNextRound()}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 gap-2 text-sm sm:text-base animate-bounce"
                >
                  <span>
                    {currentBoardIndex + 1 < boards.length
                      ? "المرحلة التالية 🚀"
                      : "عرض النتيجة النهائية 🏆"}
                  </span>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
