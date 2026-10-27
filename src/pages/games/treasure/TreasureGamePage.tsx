import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import { FallbackDiorama } from "./components/FallbackDiorama";
import { Challenge1MCQ } from "./components/Challenge1MCQ";
import { Challenge2Ordering } from "./components/Challenge2Ordering";
import { Challenge3Hotspot } from "./components/Challenge3Hotspot";
import { LockUnlockOverlay } from "./components/LockUnlockOverlay";
import { TreasureChamber } from "./components/TreasureChamber";
import { CinematicBriefingScroll } from "./components/CinematicBriefingScroll";
import { TreasureAdventureMap } from "./components/TreasureAdventureMap";
import {
  TreasureStageTransition3D,
  StageTransitionData,
} from "./components/TreasureStageTransition3D";
import {
  DEFAULT_TREASURE_12_CHALLENGES,
  TREASURE_STAGES,
  TREASURE_SOLUTIONS,
} from "./data/defaultTreasureStages";
import { ExplanationModal } from "@/components/exam/ExplanationModal";
import { CertificateModal } from "@/components/exam/CertificateModal";
import { treasureService } from "@/services/treasureService";
import { supabase } from "@/integrations/supabase/client";
import {
  StartTreasureSessionResponse,
  SubmitStepResponse,
  FinalizeAttemptResponse,
  GameplayPhase,
} from "@/types/treasure";
import {
  Compass,
  Key,
  DoorClosed,
  Clock,
  ArrowRight,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
  AlertCircle,
  Trophy,
  Shield,
  Zap,
  Swords,
  Star,
  Scroll,
  MapPin,
  CheckCircle2,
  Search,
  Lock,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { treasureHalalAudio } from "@/lib/treasureAudio";
import {
  getStoredSelectionContext,
  ensureStoredSelectionContext,
} from "@/lib/selection-context";

// Lazy load 3D Three.js scene to keep initial app bundle small
const TreasureWorld3D = lazy(() =>
  import("./components/TreasureWorld3D").then((module) => ({
    default: module.TreasureWorld3D,
  }))
);

const getTreasureStageRanges = (questionCount: number) => {
  const baseCount = Math.floor(questionCount / 4);
  const extraQuestions = questionCount % 4;
  let nextStep = 1;
  return Array.from({ length: 4 }, (_, index) => {
    const count = baseCount + (index < extraQuestions ? 1 : 0);
    const range = { stageNumber: index + 1, startStep: nextStep, endStep: nextStep + count - 1, questionCount: count };
    nextStep += count;
    return range;
  });
};

export default function TreasureGamePage() {
  const { adventureId } = useParams<{ adventureId?: string }>();
  const navigate = useNavigate();
  const selectionContext = useMemo(
    () => getStoredSelectionContext() || ensureStoredSelectionContext("nafis"),
    []
  );

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<StartTreasureSessionResponse | null>(null);
  const [currentPhase, setCurrentPhase] = useState<GameplayPhase>("briefing");
  const [currentChallengeStep, setCurrentChallengeStep] = useState(1);
  const [keyFound, setKeyFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4 Stages Progression State
  const [accumulatedScore, setAccumulatedScore] = useState<number>(0);
  const [activeTransition, setActiveTransition] = useState<StageTransitionData | null>(null);
  const [treasurePointAwarded, setTreasurePointAwarded] = useState(false);
  const [treasurePointError, setTreasurePointError] = useState("");
  const [isRetryingTreasurePoint, setIsRetryingTreasurePoint] = useState(false);

  // Split the adventure's authored questions across four stages without adding or removing questions.
  const totalChallengeCount = sessionData?.challenges.length || DEFAULT_TREASURE_12_CHALLENGES.length;
  const stageRanges = getTreasureStageRanges(totalChallengeCount);
  const currentStageRange = stageRanges.find((range) => range.questionCount > 0
    && currentChallengeStep >= range.startStep && currentChallengeStep <= range.endStep) || stageRanges[0];
  const currentStage = currentStageRange.stageNumber;
  const questionInStage = Math.max(1, currentChallengeStep - currentStageRange.startStep + 1);
  const completedQuestionsInStage = Math.max(0, currentChallengeStep - currentStageRange.startStep);
  const currentStageMission = TREASURE_STAGES[currentStage - 1];

  // Cinematic Lock Unlocking Overlay state
  const [unlockedLockInfo, setUnlockedLockInfo] = useState<{
    step: number;
    points: number;
    nextStep: number;
    nextPhase: GameplayPhase;
    isFinal: boolean;
  } | null>(null);

  // Explanation Modal state
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [wrongReason, setWrongReason] = useState<string | null>(null);
  const [explanationUrl, setExplanationUrl] = useState<string | null>(null);

  // Final Results & Certificate
  const [finalResult, setFinalResult] = useState<FinalizeAttemptResponse | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [studentName, setStudentName] = useState<string>("");

  // Sound toggle
  const [isMuted, setIsMuted] = useState(false);
  const [showPedagogicalHint, setShowPedagogicalHint] = useState(false);

  // Fetch real student name from profile or local storage
  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.full_name?.trim()) {
            setStudentName(profile.full_name.trim());
            return;
          }
          if (session.user.user_metadata?.full_name?.trim()) {
            setStudentName(session.user.user_metadata.full_name.trim());
            return;
          }
        }
        const stored =
          localStorage.getItem("student_name") ||
          sessionStorage.getItem("student_name");
        if (stored?.trim()) {
          setStudentName(stored.trim());
        }
      } catch (e) {
        const stored =
          localStorage.getItem("student_name") ||
          sessionStorage.getItem("student_name");
        if (stored?.trim()) {
          setStudentName(stored.trim());
        }
      }
    };
    fetchStudentProfile();
  }, []);

  // Stop ambient audio on unmount
  useEffect(() => {
    return () => {
      treasureHalalAudio.stopAmbience();
    };
  }, []);

  // Initialize Session: Always ensure 4 stages × 3 questions (12 questions total)
  const initGameSession = async () => {
    try {
      setLoading(true);
      setFinalResult(null);
      setTreasurePointAwarded(false);
      setTreasurePointError("");
      setIsRetryingTreasurePoint(false);

      let targetAdventureId = adventureId;
      let activeAdv = null;

      if (!targetAdventureId || targetAdventureId === "active") {
        try {
          activeAdv = await treasureService.getActiveAdventure({
            trackType: selectionContext?.trackType,
            gradeSubjectId: selectionContext?.gradeSubjectId,
            domainId: selectionContext?.domainId,
          });
          if (!activeAdv) {
            activeAdv = await treasureService.getActiveAdventure();
          }
        } catch (e) {
          console.warn("Could not query active adventure:", e);
        }
        if (activeAdv) {
          targetAdventureId = activeAdv.id;
        }
      }

      let resSession: StartTreasureSessionResponse | null = null;
      if (targetAdventureId && targetAdventureId !== "active") {
        try {
          resSession = await treasureService.startSession(targetAdventureId);
        } catch (err) {
          console.warn("startSession failed, using interactive fallback session:", err);
        }
      }

      // Keep every question configured for the adventure; use defaults only when no content exists.
      const sessionChallenges = resSession?.challenges?.length
        ? resSession.challenges
        : DEFAULT_TREASURE_12_CHALLENGES;

      const fallbackSession: StartTreasureSessionResponse = {
        resumed: resSession?.resumed ?? false,
        session_id: resSession?.session_id || "session_adv_" + Date.now(),
        adventure_id: resSession?.adventure_id || targetAdventureId || "adv_treasure_island",
        adventure_title: resSession?.adventure_title || "جزيرة الكنز الأسطوري - أسرار العلوم",
        story_clue:
          resSession?.story_clue ||
          "ابحث عن المفتاح الأثري في أنحاء الجزيرة، ثم أجب عن الألغاز وافتح الطريق إلى صندوق الكنز عبر أربع مراحل.",
        environment_config: resSession?.environment_config || {
          theme: "ancient_ruins",
          key_node: "statue",
          time_limit_seconds: 600,
        },
        current_phase: resSession?.current_phase || "briefing",
        current_challenge_step: resSession?.current_challenge_step || 1,
        accumulated_score: resSession?.accumulated_score || 0,
        started_at: resSession?.started_at || new Date().toISOString(),
        challenges: sessionChallenges,
      };

      setSessionData(fallbackSession);
      setCurrentPhase(fallbackSession.current_phase);
      setCurrentChallengeStep(fallbackSession.current_challenge_step);
      setAccumulatedScore(fallbackSession.accumulated_score);
      setTreasurePointAwarded(false);
      setKeyFound(["key_found", "portal", "challenges", "treasure", "completed"].includes(fallbackSession.current_phase));
      setFinalResult(null);
    } catch (err: any) {
      console.error("Failed to start treasure session:", err);
      // Even on severe error, load default session gracefully
      const defaultSession: StartTreasureSessionResponse = {
        resumed: false,
        session_id: "session_local_" + Date.now(),
        adventure_id: "adv_default",
        adventure_title: "جزيرة الكنز الأسطوري - أسرار العلوم",
        story_clue: "ابحث عن المفتاح الأثري، ثم أجب عن الألغاز وافتح الطريق إلى صندوق الكنز عبر أربع مراحل.",
        environment_config: {
          theme: "ancient_ruins",
          key_node: "statue",
          time_limit_seconds: 600,
        },
        current_phase: "briefing",
        current_challenge_step: 1,
        accumulated_score: 0,
        started_at: new Date().toISOString(),
        challenges: DEFAULT_TREASURE_12_CHALLENGES,
      };
      setSessionData(defaultSession);
      setCurrentPhase("briefing");
      setCurrentChallengeStep(1);
      setAccumulatedScore(0);
      setTreasurePointAwarded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    audioManager.preload();
    initGameSession();
  }, [adventureId, selectionContext]);

  // ==========================================
  // Phase Transitions - 0ms OPTIMISTIC IMMEDIATE RESPONSE
  // ==========================================
  const handleStartExploration = () => {
    if (!sessionData) return;
    setCurrentPhase("exploration");
    treasureHalalAudio.playParchmentOpen();
    if (!isMuted) {
      treasureHalalAudio.startAmbience();
    }

    if (sessionData.session_id && !sessionData.session_id.startsWith("session_")) {
      treasureService.advancePhase(sessionData.session_id, "exploration").catch(() => {});
    }
  };

  const handleInspectKey = () => {
    if (!sessionData || keyFound) return;
    setKeyFound(true);
    setCurrentPhase("key_found");
    treasureHalalAudio.playKeyFound();

    if (sessionData.session_id && !sessionData.session_id.startsWith("session_")) {
      treasureService.advancePhase(sessionData.session_id, "key_found").catch(() => {});
    }
  };

  const handleApproachPortal = () => {
    if (!sessionData) return;
    setCurrentPhase("challenges");
    treasureHalalAudio.playStoneGateRumble();

    if (sessionData.session_id && !sessionData.session_id.startsWith("session_")) {
      treasureService.advancePhase(sessionData.session_id, "portal").catch(() => {});
      treasureService.advancePhase(sessionData.session_id, "challenges").catch(() => {});
    }
  };

  // Submit Challenge Answers with 4-Stage Architecture
  const handleSubmitChallenge = async (answerPayload: Record<string, any>): Promise<SubmitStepResponse | undefined> => {
    if (!sessionData || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setShowPedagogicalHint(false);

      const isRemoteSession = !sessionData.session_id.startsWith("session_");
      let serverResult: SubmitStepResponse | undefined;
      let isCorrect = false;
      if (isRemoteSession) {
        serverResult = await treasureService.submitStep(
          sessionData.session_id,
          crypto.randomUUID(),
          currentChallengeStep,
          answerPayload,
        );
        isCorrect = serverResult.is_correct;
      } else {
        // The local fallback keeps the same answer controls, using its built-in answer key.
        const currentSol = TREASURE_SOLUTIONS[currentChallengeStep];
        if (answerPayload.selected_choice_id) {
          isCorrect = currentSol ? answerPayload.selected_choice_id === currentSol.correct_choice_id : true;
        } else if (answerPayload.submitted_order) {
          isCorrect = currentSol?.correct_order
            ? JSON.stringify(answerPayload.submitted_order) === JSON.stringify(currentSol.correct_order)
            : true;
        } else {
          isCorrect = true;
        }
      }

      const questionWasCompleted = isCorrect || Boolean(isRemoteSession && serverResult?.exhausted_attempts);
      if (isCorrect) {
        if (!isMuted) audioManager.playCorrect();
      } else {
        if (!isMuted) audioManager.playWrong();
        const activeChallenge = sessionData.challenges.find((c) => c.step === currentChallengeStep);
        if (activeChallenge?.wrong_reason) {
          setWrongReason(activeChallenge.wrong_reason);
          setExplanationOpen(true);
        }
        if (!questionWasCompleted) {
          toast.error("إجابة غير صحيحة، راجعي التوجيه وحاولي مجددًا", { className: "!border-[#c56f65]/55 !bg-[#102630] !text-[#f8e9d8] !shadow-xl" });
          return serverResult || {
            is_correct: false,
            points_earned: 0,
            attempts_taken: 1,
            current_challenge_step: currentChallengeStep,
            current_phase: "challenges",
            explanation: { wrong_reason: activeChallenge?.wrong_reason || undefined },
          };
        }
      }

      // Keep the existing scoring and retry rules authoritative; stages only group completed questions.
      const acceptedResult = serverResult || {
        is_correct: true,
        points_earned: 0,
        attempts_taken: 1,
        current_challenge_step: currentChallengeStep + 1,
        current_phase: "challenges" as GameplayPhase,
      };
      const newTotalScore = accumulatedScore + (acceptedResult.points_earned || 0);
      setAccumulatedScore(newTotalScore);
      const nextStep = acceptedResult.current_challenge_step;
      const isStageMilestone = currentChallengeStep >= currentStageRange.endStep;
      const stageNum = currentStage;
      const pointsForTransition = acceptedResult.points_earned || 0;

      if (isStageMilestone) {
        setActiveTransition({ fromStage: stageNum, toStage: stageNum + 1, newScore: newTotalScore, challengeCount: totalChallengeCount });
      } else {
        setUnlockedLockInfo({
          step: currentChallengeStep,
          points: pointsForTransition,
          nextStep,
          nextPhase: "challenges",
          isFinal: false,
        });
      }

      return acceptedResult;
    } catch (err: any) {
      console.warn("Challenge submission caught error:", err);
      toast.error(err.message || "فشل إرسال الإجابة");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance from normal lock unlock (steps 1 and 2 of each stage)
  const handleAdvanceFromLockUnlock = () => {
    if (!unlockedLockInfo) return;
    const { nextStep } = unlockedLockInfo;
    setUnlockedLockInfo(null);
    setCurrentChallengeStep(nextStep);
  };

  // Complete the 3D Stage Transition
  const handleTransitionComplete = () => {
    if (!activeTransition) return;
    const { toStage } = activeTransition;
    setActiveTransition(null);

    if (toStage <= 4) {
      const nextRange = stageRanges[toStage - 1];
      if (nextRange.questionCount > 0) {
        setCurrentChallengeStep(nextRange.startStep);
        treasureHalalAudio.playStoneGateRumble();
      } else {
        const newTotalScore = toStage * 25;
        setAccumulatedScore(newTotalScore);
        setActiveTransition({ fromStage: toStage, toStage: toStage + 1, newScore: newTotalScore, challengeCount: totalChallengeCount });
      }
    } else {
      // The server keeps the score from the existing question and retry rules.
      void handleFinalizeAttempt(sessionData?.session_id);
    }
  };

  const handleRetryTreasurePoint = async () => {
    const sessionId = finalResult?.session_id;
    if (!sessionId || sessionId.startsWith("session_")) return;
    setIsRetryingTreasurePoint(true);
    try {
      // This RPC is idempotent: it safely retries both finalization and the one-point award.
      const retryResult = await treasureService.finalizeAttempt(sessionId);
      const saved = retryResult.subject_point_awarded === true && retryResult.subject_point === 1;
      if (saved) {
        setTreasurePointAwarded(true);
        setTreasurePointError("");
      } else {
        setTreasurePointError("تعذر تسجيل الدرجة الإضافية الآن.");
      }
      if (!saved) toast.error("ما زال تسجيل الدرجة متعذرًا. أعيدي المحاولة بعد قليل.");
    } catch (error) {
      console.error("Could not retry the treasure subject point:", error);
      setTreasurePointError("تعذر الاتصال لحفظ الدرجة الإضافية.");
      toast.error("تعذر الاتصال لحفظ الدرجة الإضافية.");
    } finally {
      setIsRetryingTreasurePoint(false);
    }
  };

  // Finalize Session & Celebrate with 100/100 and Certificate
  const handleFinalizeAttempt = async (
    overrideSessionId?: string,
    fallbackScore?: number,
    fallbackChallenges?: any[]
  ) => {
    const sId = overrideSessionId || sessionData?.session_id || "session_final";
    const score = fallbackScore ?? accumulatedScore;

    let finalized: FinalizeAttemptResponse | null = null;
    setTreasurePointError("");
    setTreasurePointAwarded(false);
    try {
      if (sessionData?.session_id && !sessionData.session_id.startsWith("session_")) {
        finalized = await treasureService.finalizeAttempt(sessionData.session_id);
        const pointAwarded = finalized.subject_point_awarded === true && finalized.subject_point === 1;
        setTreasurePointAwarded(pointAwarded);
        if (!pointAwarded) setTreasurePointError("لم يؤكد الخادم تسجيل الدرجة الإضافية. أعيدي المحاولة من شاشة الكنز.");
      } else {
        setTreasurePointError("لا يمكن تسجيل درجة المادة دون اتصال بقاعدة البيانات.");
      }
    } catch (error) {
      console.error("Could not award the treasure subject point:", error);
      setTreasurePointError("تعذر تسجيل الدرجة الإضافية. يمكنك إعادة المحاولة من شاشة الكنز.");
    }

    setAccumulatedScore(score);
    setFinalResult({
      success: true,
      attempt_id: finalized?.attempt_id || sId,
      session_id: sId,
      final_score: finalized?.final_score ?? score,
      base_score: finalized?.base_score ?? score,
      is_passed: finalized?.is_passed ?? score >= 60,
      is_certificate_eligible: finalized?.is_certificate_eligible ?? score >= 80,
      speed_bonus: finalized?.speed_bonus ?? 0,
      duration_seconds: finalized?.duration_seconds ?? 120,
      challenges_snapshot: fallbackChallenges || sessionData?.challenges || DEFAULT_TREASURE_12_CHALLENGES,
    });
    setCurrentPhase("completed");
    treasureHalalAudio.playChestVictory();

    // Launch Confetti Celebration
    confetti({
      particleCount: 180,
      spread: 100,
      origin: { y: 0.55 },
    });
  };

  const toggleSound = () => {
    setIsMuted((prev) => {
      const next = !prev;
      treasureHalalAudio.setMuted(next);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-foreground" dir="rtl">
        <SaudiLoader text="جاري فتح بوابة مغامرة الكنز..." />
      </div>
    );
  }

  const currentChallenge = sessionData?.challenges.find(
    (c) => c.step === currentChallengeStep
  ) || DEFAULT_TREASURE_12_CHALLENGES[0];

  return (
    <div className="fixed inset-0 w-full h-dvh overflow-hidden bg-slate-950 text-foreground select-none flex flex-col justify-between" dir="rtl">
      {/* 1. Full-Screen Interactive 3D World Scene Layer */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden select-none">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-sky-400 text-stone-900">
              <SaudiLoader text="جاري إطلاق عالم الكنز ثلاثي الأبعاد..." />
            </div>
          }
        >
          <TreasureWorld3D
            currentPhase={currentPhase}
            keyFound={keyFound}
            onInspectKey={handleInspectKey}
            onApproachPortal={handleApproachPortal}
            isChestOpen={currentPhase === "completed"}
            currentChallengeStep={currentChallengeStep}
          />
        </Suspense>

        {/* Soft magical atmospheric vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* 2. Sleek Adventure Explorer Command Bar with Stage & Score Badges */}
      <div className={`${currentPhase === "challenges" ? "hidden" : "relative"} z-30 p-2 sm:p-4 w-full max-w-6xl mx-auto pointer-events-none`}>
        <div className="pointer-events-auto rounded-[1.35rem] border border-[#e8cf94]/35 bg-[#0b2530]/88 p-2 shadow-[0_12px_34px_rgba(3,18,25,.38),inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3">
          {/* Left Controls: Sound & Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#dec58d]/35 bg-white/[0.06] text-[#f0d99f] flex items-center justify-center shadow-sm hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />}
            </button>

            {/* Stage Badge */}
            <div className="h-9 sm:h-10 px-3 rounded-xl border border-[#e8cf94]/35 bg-[#e4bd6c]/15 text-[#f5e7c4] font-black text-xs sm:text-sm flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#eccb7e]" />
              <span>المرحلة {currentStage} من 4</span>
            </div>

            {/* Score Badge */}
            <div className="h-9 sm:h-10 px-3 rounded-xl border border-white/15 bg-white/[0.07] text-[#f3e8cb] font-black text-xs sm:text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#eccb7e]" />
              <span dir="ltr">{accumulatedScore} / 100 نقطة</span>
            </div>

            {/* Key Status Badge */}
            {keyFound && (
              <div className="h-9 sm:h-10 px-3 rounded-xl border border-[#b7dcc3]/25 bg-[#6ab38a]/15 text-[#d2ead8] font-black text-xs sm:text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#b6dcae]" />
                <span className="hidden sm:inline">المفتاح معك!</span>
              </div>
            )}
          </div>

          {/* Center Title */}
          <div className="text-center min-w-0 flex-1 px-2 hidden sm:block">
            <div className="inline-flex items-center gap-1.5 max-w-full">
              <Compass className="w-4 h-4 text-[#eccb7e] shrink-0" />
              <h1 className="font-black text-xs sm:text-base text-[#f5e7c4] truncate font-sans">
                جزيرة الكنز الأسطوري
                <span className="font-bold text-[#b7d0c7]/75 mr-2 text-xs">
                  • أربع مراحل حتى الصندوق الذهبي
                </span>
              </h1>
            </div>
          </div>

          {/* Right Exit Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/student/games")}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/15 bg-white/[0.06] text-[#f3e8cb] flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
              title="العودة لمركز الألعاب"
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Center Screen Contextual Overlays */}
      {/* Phase 1: Cinematic Briefing Scroll */}
      {currentPhase === "briefing" && (
        <CinematicBriefingScroll
          adventureTitle={sessionData?.adventure_title}
          storyClue={sessionData?.story_clue}
          challengeCount={totalChallengeCount}
          trackType={selectionContext?.trackType}
          studentName={studentName}
          isMuted={isMuted}
          onStartExploration={handleStartExploration}
          onExit={() => navigate(selectionContext?.trackType === "central" ? "/central-exam/games" : "/student/games")}
        />
      )}

      {/* Phase 2: Exploration Footer Action */}
      {currentPhase === "exploration" && (
        <div className="relative z-20 flex-1 flex flex-col justify-end items-center pb-8 sm:pb-12 p-4 pointer-events-none animate-in fade-in slide-in-from-bottom-6">
          <div className="pointer-events-auto flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={handleInspectKey}
              className="relative overflow-hidden py-3.5 sm:py-4 px-8 sm:px-12 rounded-2xl border border-[#fff0c2]/65 bg-gradient-to-b from-[#f2d58f] via-[#d7a94f] to-[#ad743a] text-[#253c38] font-black text-base sm:text-lg shadow-[0_5px_0_#754b2d,0_12px_35px_rgba(9,27,28,.42)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/45 to-transparent pointer-events-none rounded-t-2xl" />
            <Key className="w-5 h-5 sm:w-6 sm:h-6 text-[#62462d]" />
              <span>التقاط المفتاح السري 🗝️</span>
            </button>
            <span className="text-[11px] sm:text-xs font-bold text-[#f3e6c4] drop-shadow-[0_2px_4px_rgba(0,0,0,.9)] bg-[#0b2530]/85 px-3 py-1.5 rounded-xl border border-[#e8cf94]/25 backdrop-blur-md">
              يمكنك أيضاً النقر مباشرة على المفتاح الطافي في المشهد ثلاثي الأبعاد
            </span>
          </div>
        </div>
      )}

      {/* Phase 3: Key Found Footer Action */}
      {currentPhase === "key_found" && (
        <div className="relative z-20 flex-1 flex flex-col justify-end items-center pb-8 sm:pb-12 p-4 pointer-events-none animate-in fade-in slide-in-from-bottom-6">
          <button
            type="button"
            onClick={handleApproachPortal}
            className="pointer-events-auto relative overflow-hidden py-4 px-10 sm:px-14 rounded-2xl border border-[#d4eee7]/45 bg-gradient-to-b from-[#7ac5bd] via-[#398d8a] to-[#21636d] text-white font-black text-lg sm:text-xl shadow-[0_5px_0_#153f49,0_12px_35px_rgba(5,29,36,.45)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/45 to-transparent pointer-events-none rounded-t-2xl" />
            <DoorClosed className="w-6 h-6 text-white" />
            <span>توجه للبوابة الحجرية لبدء المرحلة الأولى ⛩️</span>
          </button>
        </div>
      )}

      {/* Phase 4: Active challenge with a persistent island mission HUD */}
      {currentPhase === "challenges" && currentChallenge && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto w-full pb-16 sm:pb-8">
          <div className="relative max-w-[1340px] w-full rounded-[24px] sm:rounded-[30px] p-3 sm:p-5 bg-[#0b2530]/92 backdrop-blur-xl border border-[#e8cf94]/30 shadow-[0_24px_80px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.12)] space-y-3 sm:space-y-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-400 text-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#e8cf94]/15 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl border border-[#e8cf94]/30 bg-[#d1a85a]/15 shadow-lg flex items-center justify-center text-[#f1d38d] shrink-0">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="font-black text-sm sm:text-base text-white block leading-tight">
                    مغامرة جزيرة الكنز
                  </span>
                  <span className="text-[10px] sm:text-xs text-[#ccdbd4]/75 font-bold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#b9d6c7]" />
                    <span>المستوى {currentStage} من 4 · اللغز {questionInStage} من {currentStageRange.questionCount}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#d4ad63]/10 border border-[#e8cf94]/25 font-black text-xs text-[#f2e5c4] shadow-xs">
                  <Trophy className="w-4 h-4 text-[#e9ca81]" />
                  <span dir="ltr">{accumulatedScore} / 100</span>
                </div>
                <button type="button" onClick={toggleSound} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8cf94]/20 bg-white/5 text-[#edd79f] transition hover:bg-white/10" title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => navigate("/student/games")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/85 transition hover:bg-white/10" title="العودة لمركز الألعاب">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-4">
              <aside className="min-w-0 space-y-3">
                <TreasureAdventureMap
                  challengeCount={totalChallengeCount}
                  currentStage={currentStage}
                  completedStages={currentStage - 1}
                  completedQuestionsInStage={completedQuestionsInStage + (unlockedLockInfo ? 1 : 0)}
                  compact
                  missionMode
                />

                <div className="rounded-2xl border border-[#e8cf94]/25 bg-gradient-to-l from-[#d4ad63]/10 via-[#0b2530]/80 to-[#6ab38a]/10 p-2 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e8cf94]/30 bg-[#d4ad63]/10 text-[#efcd83] sm:h-10 sm:w-10">
                      <Key className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-[9px] font-black text-[#edcf8a] sm:text-xs">المهمة الحالية · المرحلة {currentStage}</span>
                        <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-0.5 text-[8px] font-bold text-white/70 sm:px-2.5 sm:py-1 sm:text-[10px]">
                          اللغز {questionInStage} من {currentStageRange.questionCount}
                        </span>
                      </div>
                      <h2 className="mt-0.5 line-clamp-2 text-xs font-black leading-tight text-white sm:text-base">
                        {currentStageMission?.stageTitle || `المرحلة ${currentStage}`}
                      </h2>
                      <p className="mt-0.5 line-clamp-1 text-[9px] font-medium leading-relaxed text-white/65 sm:mt-1 sm:text-xs sm:leading-relaxed">
                        {currentStageMission?.stageSubtitle || "أجيبي عن تحديات المحطة لفتح الطريق التالي."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 sm:mt-3" aria-label={`تقدم ألغاز المرحلة: ${completedQuestionsInStage} من ${currentStageRange.questionCount}`}>
                    {Array.from({ length: currentStageRange.questionCount }, (_, index) => {
                      const passed = index < completedQuestionsInStage;
                      const active = index === completedQuestionsInStage;
                      return (
                        <React.Fragment key={`${currentStage}-${index}`}>
                          {index > 0 && <div className={`h-0.5 min-w-2 flex-1 rounded-full ${passed ? "bg-[#b3d5ac]" : "bg-white/15"}`} />}
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-black transition-all duration-500 sm:h-7 sm:w-7 sm:text-[10px] ${
                            passed
                              ? "border-[#d6ecd0] bg-[#9fc49b] text-[#173d3a]"
                              : active
                              ? "scale-110 border-[#fff0c2] bg-[#e5c779] text-[#263e3a] ring-4 ring-[#e5c779]/15"
                              : "border-white/20 bg-slate-950/60 text-white/45"
                          }`}>
                            {passed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <span className="mr-auto text-[8px] font-bold text-white/55 sm:text-[10px]">
                      {completedQuestionsInStage} من {currentStageRange.questionCount} ألغاز مكتملة
                    </span>
                  </div>
                </div>

                <div className="hidden items-center gap-2 px-1 text-[9px] font-bold text-sky-100/65 sm:flex sm:text-[10px]">
                  <Compass className="h-3.5 w-3.5 shrink-0 text-[#bddbc8]" />
                  كل إجابة مكتملة تحرّك المستكشفة إلى نقطة جديدة على الخريطة.
                </div>
              </aside>

              <section className="min-w-0 rounded-2xl border border-[#e8cf94]/15 bg-[#071d26]/55 p-2.5 sm:p-3">
                {/* Smart Pedagogical Hint Button */}
                <div className="mb-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPedagogicalHint((p) => !p)}
                  className="text-[10px] sm:text-xs font-bold text-[#f0e6cd]/85 hover:text-white bg-white/5 hover:bg-white/10 border border-[#e8cf94]/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-[#e8c678]" />
                  <span>{showPedagogicalHint ? "إخفاء التلميح" : "عرض تلميح"}</span>
                </button>
                <span className="text-[10px] text-[#d2e6dc]/55 font-semibold">{currentStageMission?.stageTitle || `تحدي المستوى ${currentStage}`}</span>
              </div>

              {showPedagogicalHint && (
                <div className="mt-2 bg-[#102d37]/95 border border-[#e8cf94]/25 rounded-xl p-3 text-right text-xs text-white/85 leading-relaxed shadow-lg animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-1.5 font-bold text-[#f2dfad] mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#e8c678]" />
                    <span>تلميح:</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/75 font-medium">
                    {currentChallenge.wrong_reason ||
                      "تمعن في المعطيات العلمية للغز، وابحث عن العلاقة المنطقية بين المفاهيم المطروحة لفك شفرة القفل بدقة."}
                  </p>
                </div>
              )}
            </div>

            {/* Dynamic Polymorphic Challenge Component based on challenge_type */}
            {currentChallenge.challenge_type === "mcq" && (
              <Challenge1MCQ
                key={currentChallenge.step}
                challenge={currentChallenge}
                onSubmitAnswer={handleSubmitChallenge}
                isSubmitting={isSubmitting}
                stageNumber={currentStage}
                questionNumber={questionInStage}
                questionsInStage={currentStageRange.questionCount}
              />
            )}
            {currentChallenge.challenge_type === "ordering" && (
              <Challenge2Ordering
                key={currentChallenge.step}
                challenge={currentChallenge}
                onSubmitAnswer={handleSubmitChallenge}
                isSubmitting={isSubmitting}
              />
            )}
            {currentChallenge.challenge_type === "hotspot" && (
              <Challenge3Hotspot
                key={currentChallenge.step}
                challenge={currentChallenge}
                onSubmitAnswer={handleSubmitChallenge}
                isSubmitting={isSubmitting}
              />
            )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Phase 6: Completed / Treasure Chamber */}
      {currentPhase === "completed" && finalResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-500">
          <TreasureChamber
            finalResult={finalResult}
            gradePointAwarded={treasurePointAwarded}
            gradePointError={treasurePointError}
            isRetryingGradePoint={isRetryingTreasurePoint}
            onRetryGradePoint={() => void handleRetryTreasurePoint()}
            onOpenCertificate={() => setCertificateOpen(true)}
            onPlayAgain={initGameSession}
            onGoHome={() => navigate("/student/games")}
          />
        </div>
      )}

      {/* Explanation Modal on wrong attempt */}
      <ExplanationModal
        isOpen={explanationOpen}
        onClose={() => setExplanationOpen(false)}
        questionText={currentChallenge?.prompt || "تحدي مغامرة الكنز"}
        wrongReason={wrongReason || undefined}
        explanationUrl={explanationUrl || undefined}
      />

      {/* Official Certificate Modal for Successful Students */}
      {finalResult && (
        <CertificateModal
          isOpen={certificateOpen}
          onClose={() => setCertificateOpen(false)}
          studentName={studentName || "طالب متميز"}
          score={finalResult.final_score}
          totalQuestions={100}
          percentage={finalResult.final_score}
          examTitle="مغامرة الكنز العلمي - فك أقفال المعرفة"
        />
      )}

      {/* Cinematic Lock Unlocking Overlay for inter-stage steps */}
      {unlockedLockInfo && (
        <LockUnlockOverlay
          unlockedStep={unlockedLockInfo.step}
          currentStage={currentStage}
          questionInStage={questionInStage}
          questionsInStage={currentStageRange.questionCount}
          pointsEarned={unlockedLockInfo.points}
          onAdvance={handleAdvanceFromLockUnlock}
        />
      )}

      {/* Cinematic 3D Stage Transition (1->2, 2->3, 3->4, 4->Victory) */}
      {activeTransition && (
        <TreasureStageTransition3D
          transitionData={activeTransition}
          onComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}
