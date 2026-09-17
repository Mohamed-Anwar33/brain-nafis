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
import { TreasureScratchCard } from "./components/TreasureScratchCard";
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
  const [activeScratchCardStage, setActiveScratchCardStage] = useState<number | null>(null);
  const [activeTransition, setActiveTransition] = useState<StageTransitionData | null>(null);

  // Current Stage Helpers
  const currentStage = Math.min(4, Math.max(1, Math.floor((currentChallengeStep - 1) / 3) + 1));
  const questionInStage = ((currentChallengeStep - 1) % 3) + 1;

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

      // Always guarantee full 12 questions (4 stages × 3 questions)
      const sessionChallenges =
        resSession?.challenges && resSession.challenges.length >= 12
          ? resSession.challenges
          : DEFAULT_TREASURE_12_CHALLENGES;

      const fallbackSession: StartTreasureSessionResponse = {
        resumed: false,
        session_id: resSession?.session_id || "session_adv_" + Date.now(),
        adventure_id: resSession?.adventure_id || targetAdventureId || "adv_treasure_island",
        adventure_title: resSession?.adventure_title || "جزيرة الكنز الأسطوري - أسرار العلوم",
        story_clue:
          resSession?.story_clue ||
          "ابحث عن المفتاح الأثري في أنحاء الجزيرة لحل الألغاز الـ12 وفتح البوابة الأسطورية عبر 4 مراحل مشوقة",
        environment_config: resSession?.environment_config || {
          theme: "ancient_ruins",
          key_node: "statue",
          time_limit_seconds: 600,
        },
        current_phase: "briefing",
        current_challenge_step: 1,
        accumulated_score: 0,
        started_at: new Date().toISOString(),
        challenges: sessionChallenges,
      };

      setSessionData(fallbackSession);
      setCurrentPhase(fallbackSession.current_phase);
      setCurrentChallengeStep(1);
      setAccumulatedScore(0);
      setKeyFound(false);
      setFinalResult(null);
    } catch (err: any) {
      console.error("Failed to start treasure session:", err);
      // Even on severe error, load default session gracefully
      const defaultSession: StartTreasureSessionResponse = {
        resumed: false,
        session_id: "session_local_" + Date.now(),
        adventure_id: "adv_default",
        adventure_title: "جزيرة الكنز الأسطوري - أسرار العلوم",
        story_clue: "ابحث عن المفتاح الأثري لفك أختام البوابة الأسطورية عبر 4 مراحل مشوقة",
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
    toast.success("🧭 بدأت رحلة الاستكشاف! ابحث عن المفتاح الأثري في الجزيرة");

    if (sessionData.session_id && !sessionData.session_id.startsWith("session_")) {
      treasureService.advancePhase(sessionData.session_id, "exploration").catch(() => {});
    }
  };

  const handleInspectKey = () => {
    if (!sessionData || keyFound) return;
    setKeyFound(true);
    setCurrentPhase("key_found");
    treasureHalalAudio.playKeyFound();
    toast.success("🗝️ عثرت على المفتاح السري للبوابة الأثرية!");

    if (sessionData.session_id && !sessionData.session_id.startsWith("session_")) {
      treasureService.advancePhase(sessionData.session_id, "key_found").catch(() => {});
    }
  };

  const handleApproachPortal = () => {
    if (!sessionData) return;
    setCurrentPhase("challenges");
    treasureHalalAudio.playStoneGateRumble();
    toast.success("⛩️ اقتربت من البوابة الحجرية! استعد لفك أختام المرحلة الأولى");

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

      // Verify answer locally using solution dictionary
      const currentSol = TREASURE_SOLUTIONS[currentChallengeStep];
      let isCorrect = false;

      if (answerPayload.selected_choice_id) {
        isCorrect = currentSol ? answerPayload.selected_choice_id === currentSol.correct_choice_id : true;
      } else if (answerPayload.submitted_order) {
        isCorrect =
          currentSol && currentSol.correct_order
            ? JSON.stringify(answerPayload.submitted_order) === JSON.stringify(currentSol.correct_order)
            : true;
      } else {
        isCorrect = true;
      }

      // If server connected, submit in background
      if (sessionData.session_id && !sessionData.session_id.startsWith("session_")) {
        treasureService
          .submitStep(sessionData.session_id, crypto.randomUUID(), currentChallengeStep, answerPayload)
          .catch((e) => console.warn("Background server submitStep:", e));
      }

      if (isCorrect) {
        if (!isMuted) audioManager.playCorrect();

        const isStageMilestone = currentChallengeStep % 3 === 0;
        const stageNum = Math.min(4, Math.floor((currentChallengeStep - 1) / 3) + 1);

        if (isStageMilestone) {
          // 🎉 Stage complete! Show interactive scratch card awarding +25 points
          toast.success(`أحسنت! أكملت المرحلة ${stageNum} بنجاح! اكشط بطاقة الكنز 🪙`);
          setActiveScratchCardStage(stageNum);
        } else {
          // Standard lock unlock in stage
          toast.success(`إجابة صحيحة ومبهرة! تم فك القفل الأثري 🎉`);
          setUnlockedLockInfo({
            step: currentChallengeStep,
            points: 10,
            nextStep: currentChallengeStep + 1,
            nextPhase: "challenges",
            isFinal: false,
          });
        }

        return {
          is_correct: true,
          points_earned: isStageMilestone ? 25 : 10,
          attempts_taken: 1,
          current_challenge_step: currentChallengeStep + 1,
          current_phase: "challenges",
        };
      } else {
        if (!isMuted) audioManager.playWrong();
        const activeChallenge = sessionData.challenges.find((c) => c.step === currentChallengeStep);
        if (activeChallenge?.wrong_reason) {
          setWrongReason(activeChallenge.wrong_reason);
          setExplanationOpen(true);
        }
        toast.error("إجابة غير صحيحة، راجع التوجيه وحاول مجددًا!");
        return {
          is_correct: false,
          points_earned: 0,
          attempts_taken: 1,
          current_challenge_step: currentChallengeStep,
          current_phase: "challenges",
          explanation: {
            wrong_reason: activeChallenge?.wrong_reason || undefined,
          },
        };
      }
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

  // Advance after completing the scratch card (question 3 of each stage)
  const handleScratchCardCompleted = () => {
    const stageFinished = activeScratchCardStage || currentStage;
    const newTotalScore = stageFinished * 25;
    setAccumulatedScore(newTotalScore);
    setActiveScratchCardStage(null);

    // Launch Cinematic 3D Stage Transition!
    setActiveTransition({
      fromStage: stageFinished,
      toStage: stageFinished + 1,
      newScore: newTotalScore,
    });
  };

  // Complete the 3D Stage Transition
  const handleTransitionComplete = () => {
    if (!activeTransition) return;
    const { toStage } = activeTransition;
    setActiveTransition(null);

    if (toStage <= 4) {
      const nextStep = (toStage - 1) * 3 + 1;
      setCurrentChallengeStep(nextStep);
      treasureHalalAudio.playStoneGateRumble();
      toast.success(`🎉 بدأت المرحلة ${toStage} من 4 بنجاح! أختام جديدة بانتظارك 🗝️`);
    } else {
      // Stage 4 Complete: 100/100 Victory!
      handleFinalizeAttempt(sessionData?.session_id, 100);
    }
  };

  // Finalize Session & Celebrate with 100/100 and Certificate
  const handleFinalizeAttempt = async (
    overrideSessionId?: string,
    fallbackScore?: number,
    fallbackChallenges?: any[]
  ) => {
    const sId = overrideSessionId || sessionData?.session_id || "session_final";
    const score = fallbackScore ?? 100;

    try {
      if (sessionData?.session_id && !sessionData.session_id.startsWith("session_")) {
        await treasureService.finalizeAttempt(sessionData.session_id).catch(() => {});
      }
    } catch (_) {}

    setAccumulatedScore(score);
    setFinalResult({
      success: true,
      attempt_id: sId,
      session_id: sId,
      final_score: 100,
      base_score: 100,
      is_passed: true,
      is_certificate_eligible: true,
      speed_bonus: 0,
      duration_seconds: 120,
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 text-foreground select-none flex flex-col justify-between" dir="rtl">
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
      <div className="relative z-30 p-2 sm:p-4 w-full max-w-5xl mx-auto pointer-events-none">
        <div className="pointer-events-auto bg-gradient-to-r from-[#2c1407]/95 via-[#1a0c04]/95 to-[#2c1407]/95 backdrop-blur-md border-2 border-[#b45309]/80 p-2 sm:p-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_0_1px_rgba(245,158,11,0.25)] flex items-center justify-between gap-2 sm:gap-3">
          {/* Left Controls: Sound & Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#b45309] to-[#78350f] border-2 border-amber-400 text-amber-100 flex items-center justify-center shadow-[0_3px_0_#451a03] hover:brightness-110 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />}
            </button>

            {/* Stage Badge */}
            <div className="h-9 sm:h-10 px-3 rounded-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-2 border-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-[0_3px_0_#78350f] flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-stone-950" />
              <span>المرحلة {currentStage} من 4</span>
            </div>

            {/* Score Badge */}
            <div className="h-9 sm:h-10 px-3 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500 border-2 border-white text-[#451a03] font-black text-xs sm:text-sm shadow-[0_3px_0_#78350f] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#451a03]" />
              <span>{accumulatedScore} / 100 نقطة</span>
            </div>

            {/* Key Status Badge */}
            {keyFound && (
              <div className="h-9 sm:h-10 px-3 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 border-2 border-emerald-300 text-stone-950 font-black text-xs sm:text-sm shadow-[0_3px_0_#064e3b] flex items-center gap-1.5 animate-bounce">
                <Key className="w-4 h-4 text-stone-950" />
                <span className="hidden sm:inline">المفتاح معك!</span>
              </div>
            )}
          </div>

          {/* Center Title */}
          <div className="text-center min-w-0 flex-1 px-2 hidden sm:block">
            <div className="inline-flex items-center gap-1.5 max-w-full">
              <Compass className="w-4 h-4 text-amber-400 shrink-0 animate-spin [animation-duration:14s]" />
              <h1 className="font-black text-xs sm:text-base text-amber-200 truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
                جزيرة الكنز الأسطوري
                <span className="font-bold text-amber-400/80 mr-2 text-xs">
                  • 4 مراحل وشهادة التميز
                </span>
              </h1>
            </div>
          </div>

          {/* Right Exit Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/student/games")}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-rose-600 to-rose-800 border-2 border-rose-400 text-white flex items-center justify-center shadow-[0_3px_0_#4c0519] hover:brightness-110 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0"
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
              className="relative overflow-hidden py-3.5 sm:py-4 px-8 sm:px-12 rounded-full border-3 border-[#fef08a] bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-[#451a03] font-black text-base sm:text-lg shadow-[0_8px_0_#78350f,0_10px_25px_rgba(245,158,11,0.5)] hover:brightness-110 active:translate-y-1.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer group animate-pulse"
            >
              <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-full" />
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-[#451a03]" />
              <span>التقاط المفتاح السري 🗝️</span>
            </button>
            <span className="text-[11px] sm:text-xs font-bold text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/40 px-3 py-1 rounded-full border border-amber-500/30">
              💡 يمكنك أيضاً النقر مباشرة على المفتاح الطافي في المشهد 3D
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
            className="pointer-events-auto relative overflow-hidden py-4 px-10 sm:px-14 rounded-full border-3 border-[#bae6fd] bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-white font-black text-lg sm:text-xl shadow-[0_8px_0_#075985,0_10px_25px_rgba(2,132,199,0.5)] hover:brightness-110 active:translate-y-1.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer group animate-bounce"
          >
            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-full" />
            <DoorClosed className="w-6 h-6 text-white" />
            <span>توجه للبوابة الحجرية لبدء المرحلة الأولى ⛩️</span>
          </button>
        </div>
      )}

      {/* Phase 4: Challenges Active (4-Stage Map Parchment) */}
      {currentPhase === "challenges" && currentChallenge && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto w-full pb-16 sm:pb-8">
          <div className="relative max-w-2xl w-full rounded-[24px] sm:rounded-[32px] p-3.5 sm:p-5 bg-gradient-to-b from-[#fefce8] via-[#fef9c3] to-[#fef08a] border-3 sm:border-4 border-[#854d0e] shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_0_4px_#fde047,inset_0_2px_12px_rgba(180,83,9,0.18)] space-y-2.5 sm:space-y-3 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-400 text-[#451a03]">
            {/* Antique Watermark Compass */}
            <Compass className="absolute -left-10 -bottom-10 w-40 h-40 text-amber-900/10 pointer-events-none rotate-12" />
            <Compass className="absolute -right-10 -top-10 w-40 h-40 text-amber-900/10 pointer-events-none -rotate-12" />

            {/* Gilded Corner Filigrees */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#854d0e] pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#854d0e] pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#854d0e] pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#854d0e] pointer-events-none" />

            {/* Ancient Map Header: Stage & Question Info */}
            <div className="flex items-center justify-between border-b-2 border-[#b45309]/20 pb-2 sm:pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#b45309] to-[#f59e0b] border-2 border-white shadow-xs flex items-center justify-center text-white shrink-0">
                  <DoorClosed className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-base md:text-lg text-[#451a03] block leading-tight font-sans">
                    خَرِيطَةُ الأَلْغَازِ الأَثَرِيَّةِ • المرحلة {currentStage} من 4 (اللغز {questionInStage} من 3)
                  </span>
                  <span className="text-[9px] sm:text-[11px] text-[#78350f] font-bold flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                    <span>فك أختام اللغز لكشف بطاقة الكنز الذهبية (+25 نقطة)</span>
                  </span>
                </div>
              </div>

              {/* Accumulated Score Badge */}
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 border border-amber-600 font-black text-xs text-[#451a03] shadow-xs">
                <Trophy className="w-3.5 h-3.5 text-amber-700" />
                <span>{accumulatedScore} / 100</span>
              </div>
            </div>

            {/* 4 Stages Progression Navigator */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 py-0.5">
              {TREASURE_STAGES.map((st) => {
                const isStageDone = accumulatedScore >= st.targetAccumulatedScore;
                const isCurrentStage = currentStage === st.stageNumber && !isStageDone;
                return (
                  <div
                    key={st.stageNumber}
                    className={`p-1.5 sm:p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isStageDone
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-900 font-bold"
                        : isCurrentStage
                        ? "bg-gradient-to-r from-amber-400/25 to-yellow-400/35 border-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-400/50 scale-[1.02]"
                        : "bg-black/5 border-amber-900/15 text-amber-900/40 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                      {isStageDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isCurrentStage ? (
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-900/40" />
                      )}
                      <span>مرحلة {st.stageNumber}</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold mt-0.5">
                      {st.targetAccumulatedScore} نقطة
                    </span>
                  </div>
                );
              })}
            </div>

            {/* In-Stage Question Steps Indicator */}
            <div className="flex items-center justify-between px-1 text-[10px] sm:text-[11px] font-black text-[#78350f]">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600" />
                <span>تقدمك في المرحلة {currentStage}:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((dot) => {
                  const isDotPassed = questionInStage > dot;
                  const isDotCurrent = questionInStage === dot;
                  return (
                    <div
                      key={dot}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        isDotPassed
                          ? "bg-emerald-500 text-white shadow-xs"
                          : isDotCurrent
                          ? "bg-amber-500 text-stone-950 ring-2 ring-amber-300 animate-pulse font-black"
                          : "bg-amber-900/10 text-amber-900/50"
                      }`}
                    >
                      {dot === 3 ? "🪙 بطاقة الكنز" : `لغز ${dot}`}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall Energy Progress Bar */}
            <div className="space-y-0.5">
              <div className="w-full bg-[#451a03]/15 rounded-full h-2 border-2 border-[#854d0e]/30 p-0.5 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  style={{
                    width: `${Math.max(8, Math.round(((currentChallengeStep - 1) / 12) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Smart Pedagogical Hint Button */}
            <div className="pt-0.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPedagogicalHint((p) => !p)}
                  className="text-[10px] sm:text-xs font-black text-[#78350f] hover:text-[#451a03] bg-amber-200/90 hover:bg-amber-300 border border-[#b45309]/50 px-3 py-0.5 sm:py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>{showPedagogicalHint ? "إغلاق التوجيه الذكي" : "💡 تلميح القبطان التربوي"}</span>
                </button>
                <span className="text-[10px] text-[#92400e] font-semibold">
                  المعلمة: أ/ هيفاء السلمي
                </span>
              </div>

              {showPedagogicalHint && (
                <div className="mt-2 bg-gradient-to-r from-amber-100 via-[#fffbeb] to-amber-100 border-2 border-[#b45309]/60 rounded-xl p-3 text-right text-xs text-[#78350f] leading-relaxed shadow-md animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-1.5 font-black text-[#451a03] mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span>إرشاد تفكير المستكشف:</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#78350f] font-medium">
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
          </div>
        </div>
      )}

      {/* Phase 5: Interactive Scratch Card Modal at end of Stage 1, 2, 3, 4 */}
      {activeScratchCardStage !== null && (
        <TreasureScratchCard
          stageNumber={activeScratchCardStage}
          pointsAwarded={25}
          totalAccumulatedScore={activeScratchCardStage * 25}
          onCompleted={handleScratchCardCompleted}
        />
      )}

      {/* Phase 6: Completed / Treasure Chamber */}
      {currentPhase === "completed" && finalResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-500">
          <TreasureChamber
            finalResult={finalResult}
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
          totalSteps={12}
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
