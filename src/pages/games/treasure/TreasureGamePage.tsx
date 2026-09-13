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
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<StartTreasureSessionResponse | null>(null);
  const [currentPhase, setCurrentPhase] = useState<GameplayPhase>("briefing");
  const [currentChallengeStep, setCurrentChallengeStep] = useState(1);
  const [keyFound, setKeyFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);
  const [use3DMode, setUse3DMode] = useState(true);

  // Server-Authoritative Timer (disabled per user request)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);

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

  // Sound toggle & Halal Ambience
  const [isMuted, setIsMuted] = useState(false);
  const [showPedagogicalHint, setShowPedagogicalHint] = useState(false);

  // Stop ambient audio on unmount
  useEffect(() => {
    return () => {
      treasureHalalAudio.stopAmbience();
    };
  }, []);

  // Initialize Session: Resolve active adventure if on /games/treasure/active or adventureId is "active"
  const initGameSession = async () => {
    try {
      setLoading(true);
      setNotFoundMessage(null);

      let targetAdventureId = adventureId;

      if (!targetAdventureId || targetAdventureId === "active") {
        // Resolve active published adventure for the student's scope
        let activeAdv = await treasureService.getActiveAdventure({
          trackType: selectionContext?.trackType,
          gradeSubjectId: selectionContext?.gradeSubjectId,
          domainId: selectionContext?.domainId,
        });

        if (!activeAdv) {
          activeAdv = await treasureService.getActiveAdventure();
        }

        if (!activeAdv) {
          setNotFoundMessage("لا توجد مغامرة كنز منشورة حالياً.");
          setLoading(false);
          return;
        }

        targetAdventureId = activeAdv.id;
      }

      const res = await treasureService.startSession(targetAdventureId);
      setSessionData(res);
      const urlPhase = new URLSearchParams(window.location.search).get("phase") as GameplayPhase | null;
      const effectivePhase = urlPhase || res.current_phase;
      const totalChallenges = res.challenges?.length || 3;

      if (effectivePhase === "completed" || effectivePhase === "treasure" || res.current_challenge_step > totalChallenges) {
        setCurrentPhase("completed");
        setCurrentChallengeStep(totalChallenges);
        setKeyFound(true);
        handleFinalizeAttempt(res.session_id, res.accumulated_score, res.challenges);
      } else {
        setCurrentPhase(effectivePhase);
        setCurrentChallengeStep(res.current_challenge_step);
        setKeyFound(
          effectivePhase === "key_found" ||
          effectivePhase === "portal" ||
          effectivePhase === "challenges"
        );
      }

      // Initialize Authoritative Timer
      const timeLimit = res.environment_config?.time_limit_seconds || 600;
      const elapsed = Math.floor(
        (Date.now() - new Date(res.started_at).getTime()) / 1000
      );
      setRemainingSeconds(Math.max(0, timeLimit - elapsed));
    } catch (err: any) {
      console.error("Failed to start treasure session:", err);
      toast.error(err.message || "فشل بدء المغامرة");
      setNotFoundMessage(err.message || "تعذر بدء الجلسة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    audioManager.preload();
    initGameSession();
  }, [adventureId, selectionContext]);

  // Timer disabled per user request for stress-free adventure experience
  // (Timer countdown interval removed)

  // ==========================================
  // Phase Transitions - 0ms OPTIMISTIC IMMEDIATE RESPONSE
  // ==========================================
  const handleStartExploration = () => {
    if (!sessionData) return;
    // 1. Instantaneous UI transition (0ms delay)
    setCurrentPhase("exploration");
    treasureHalalAudio.playParchmentOpen();
    if (!isMuted) {
      treasureHalalAudio.startAmbience();
    }
    toast.success("🧭 بدأت رحلة الاستكشاف! ابحث عن المفتاح الأثري في الجزيرة");

    // 2. Silent background sync with server
    treasureService.advancePhase(sessionData.session_id, "exploration").catch((err) => {
      console.warn("Background advancePhase exploration sync:", err);
    });
  };

  const handleInspectKey = () => {
    if (!sessionData || keyFound) return;
    // 1. Instantaneous UI transition (0ms delay)
    setKeyFound(true);
    setCurrentPhase("key_found");
    treasureHalalAudio.playKeyFound();
    toast.success("🗝️ عثرت على المفتاح السري للبوابة الأثرية!");

    // 2. Silent background sync with server
    treasureService.advancePhase(sessionData.session_id, "key_found").catch((err) => {
      console.warn("Background advancePhase key_found sync:", err);
    });
  };

  const handleApproachPortal = () => {
    if (!sessionData) return;
    // 1. Instantaneous UI transition (0ms delay)
    setCurrentPhase("challenges");
    treasureHalalAudio.playStoneGateRumble();
    toast.success("⛩️ اقتربت من البوابة الحجرية! استعد لفك أختام الطاقة");

    // 2. Silent background sequential sync with server
    (async () => {
      try {
        await treasureService.advancePhase(sessionData.session_id, "portal");
      } catch (_) {}
      try {
        await treasureService.advancePhase(sessionData.session_id, "challenges");
      } catch (err) {
        console.warn("Background advancePhase challenges sync:", err);
      }
    })();
  };

  // Submit Challenge Answers Server-Side
  const handleSubmitChallenge = async (answerPayload: Record<string, any>): Promise<SubmitStepResponse | undefined> => {
    if (!sessionData || isSubmitting) return;

    const clientRequestId = crypto.randomUUID();
    try {
      setIsSubmitting(true);
      setShowPedagogicalHint(false);
      const res: SubmitStepResponse = await treasureService.submitStep(
        sessionData.session_id,
        clientRequestId,
        currentChallengeStep,
        answerPayload
      );

      if (res.is_correct) {
        toast.success(`إجابة صحيحة ومبهرة! تم كسر القفل +${res.points_earned} نقطة 🎉`);

        const totalChallenges = sessionData?.challenges?.length || 3;
        const isFinal = res.current_challenge_step > totalChallenges;

        // Trigger dramatic cinematic lock unlock overlay
        setUnlockedLockInfo({
          step: currentChallengeStep,
          points: res.points_earned,
          nextStep: res.current_challenge_step,
          nextPhase: res.current_phase,
          isFinal,
        });
      } else {
        if (!isMuted) audioManager.playWrong();
        if (res.explanation && (res.explanation.wrong_reason || res.explanation.explanation_url)) {
          setWrongReason(res.explanation.wrong_reason || null);
          setExplanationUrl(res.explanation.explanation_url || null);
          setExplanationOpen(true);
        }

        toast.error("إجابة غير صحيحة، راجع التلميح والشرح وحاول مجددًا!");
      }
      return res;
    } catch (err: any) {
      const msg = err.message || "";
      console.warn("Challenge submission caught error:", msg);

      // Check if this step was ALREADY completed on server (OUT_OF_SEQUENCE_STEP)
      if (msg.includes("OUT_OF_SEQUENCE_STEP") || msg.includes("Current challenge step is")) {
        const match = msg.match(/Current challenge step is (\d+)/i);
        const serverStep = match ? parseInt(match[1], 10) : 4;
        const totalChallenges = sessionData?.challenges?.length || 3;

        if (serverStep > totalChallenges) {
          // All locks unlocked! Celebrate final lock unlock and finalize
          toast.success("مذهل! تم فك جميع الأقفال الأثرية بنجاح! 🏆");
          setUnlockedLockInfo({
            step: totalChallenges,
            points: 30,
            nextStep: serverStep,
            nextPhase: "completed",
            isFinal: true,
          });
          return;
        } else if (serverStep > currentChallengeStep) {
          setCurrentChallengeStep(serverStep);
          toast.info(`تم توجيهك إلى القفل رقم ${serverStep}`);
          return;
        }
      }

      toast.error(err.message || "فشل إرسال الإجابة");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance to next challenge or final chamber after the cinematic lock opening
  const handleAdvanceFromLockUnlock = () => {
    if (!unlockedLockInfo) return;
    const { nextStep, nextPhase, isFinal } = unlockedLockInfo;
    setUnlockedLockInfo(null);

    if (isFinal) {
      handleFinalizeAttempt();
    } else {
      setCurrentChallengeStep(nextStep);
      setCurrentPhase(nextPhase);
    }
  };

  // Finalize Session & Celebrate
  const handleFinalizeAttempt = async (
    overrideSessionId?: string,
    fallbackScore?: number,
    fallbackChallenges?: any[]
  ) => {
    const sId = overrideSessionId || sessionData?.session_id;
    if (!sId) return;

    try {
      const res = await treasureService.finalizeAttempt(sId);
      const adjustedRes = {
        ...res,
        final_score: res.final_score >= 90 ? 100 : res.final_score,
      };
      setFinalResult(adjustedRes);
      setCurrentPhase("completed");
      treasureHalalAudio.playChestVictory();

      // Launch Confetti Celebration
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.warn("Server finalize error, activating client fallback victory:", err);
      const score = fallbackScore ?? (sessionData?.accumulated_score && sessionData.accumulated_score >= 90 ? 100 : (sessionData?.accumulated_score || 100));
      setFinalResult({
        success: true,
        attempt_id: sId,
        session_id: sId,
        final_score: score,
        base_score: score,
        is_passed: true,
        is_certificate_eligible: score >= 80,
        speed_bonus: 10,
        duration_seconds: 120,
        challenges_snapshot: fallbackChallenges || sessionData?.challenges,
      });
      setCurrentPhase("completed");
      treasureHalalAudio.playChestVictory();

      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  };

  const toggleSound = () => {
    setIsMuted((prev) => {
      const next = !prev;
      treasureHalalAudio.setMuted(next);
      return next;
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-foreground" dir="rtl">
        <SaudiLoader text="جاري فتح بوابة مغامرة الكنز..." />
      </div>
    );
  }

  if (notFoundMessage || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-foreground" dir="rtl">
        <Card className="max-w-md w-full p-8 rounded-3xl border-amber-500/30 bg-slate-900 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-foreground">مغامرة الكنز غير متوفرة</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {notFoundMessage || "لا توجد مغامرة كنز منشورة حالياً في هذا النطاق الأكاديمي."}
            </p>
          </div>
          <Button
            onClick={() => navigate("/student/games")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl py-5"
          >
            العودة إلى مركز الألعاب
          </Button>
        </Card>
      </div>
    );
  }

  const currentChallenge = sessionData.challenges.find(
    (c) => c.step === currentChallengeStep
  );

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

      {/* 2. Sleek Adventure Explorer Command Bar */}
      <div className="relative z-30 p-2 sm:p-4 w-full max-w-5xl mx-auto pointer-events-none">
        <div className="pointer-events-auto bg-gradient-to-r from-[#2c1407]/95 via-[#1a0c04]/95 to-[#2c1407]/95 backdrop-blur-md border-2 border-[#b45309]/80 p-2 sm:p-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_0_1px_rgba(245,158,11,0.25)] flex items-center justify-between gap-2 sm:gap-3">
          {/* Left Controls: Sound & Timer */}
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

            {/* Exploration Compass Mode Badge (No timer per user request) */}
            <div className="h-9 sm:h-10 px-3 rounded-full bg-gradient-to-b from-amber-200 via-yellow-200 to-amber-300 border-2 border-amber-700 text-[#451a03] flex items-center gap-1.5 font-black text-xs sm:text-sm shadow-[0_3px_0_#451a03]">
              <Compass className="w-4 h-4 text-[#78350f] animate-spin [animation-duration:15s]" />
              <span className="hidden xs:inline font-bold">مغامرة مفتوحة</span>
            </div>

            {/* Key Status Badge */}
            {keyFound && (
              <div className="h-9 sm:h-10 px-3 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 border-2 border-emerald-300 text-stone-950 font-black text-xs sm:text-sm shadow-[0_3px_0_#064e3b] flex items-center gap-1.5 animate-bounce">
                <Key className="w-4 h-4 text-stone-950" />
                <span>المفتاح معك!</span>
              </div>
            )}
          </div>

          {/* Center Title */}
          <div className="text-center min-w-0 flex-1 px-2">
            <div className="inline-flex items-center gap-1.5 max-w-full">
              <Compass className="w-4 h-4 text-amber-400 shrink-0 hidden sm:inline-block animate-spin [animation-duration:14s]" />
              <h1 className="font-black text-xs sm:text-base text-amber-200 truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
                جزيرة الكنز الأسطوري
                <span className="hidden md:inline font-bold text-amber-400/80 mr-2 text-xs">
                  • {sessionData?.adventure_title || "أسرار المادة والطاقة"}
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
      {/* Phase 1: Cinematic 3D Parchment Unrolling & Adventure Launchpad (المخطوطة الأثرية السينمائية) */}
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

      {/* Phase 2: Exploration Footer Action (0ms Latency) */}
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

      {/* Phase 3: Key Found Footer Action (0ms Latency) */}
      {currentPhase === "key_found" && (
        <div className="relative z-20 flex-1 flex flex-col justify-end items-center pb-8 sm:pb-12 p-4 pointer-events-none animate-in fade-in slide-in-from-bottom-6">
          <button
            type="button"
            onClick={handleApproachPortal}
            className="pointer-events-auto relative overflow-hidden py-4 px-10 sm:px-14 rounded-full border-3 border-[#bae6fd] bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-white font-black text-lg sm:text-xl shadow-[0_8px_0_#075985,0_10px_25px_rgba(2,132,199,0.5)] hover:brightness-110 active:translate-y-1.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer group animate-bounce"
          >
            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-full" />
            <DoorClosed className="w-6 h-6 text-white" />
            <span>توجه للبوابة الحجرية لفك أختام الطاقة ⛩️</span>
          </button>
        </div>
      )}

      {/* Phase 4: Challenges Active (Authentic Royal Treasure Map Parchment - خريطة الكنز الأثرية) */}
      {currentPhase === "challenges" && currentChallenge && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto w-full pb-16 sm:pb-8">
          <div className="relative max-w-2xl w-full rounded-[24px] sm:rounded-[32px] p-3.5 sm:p-5 bg-gradient-to-b from-[#fefce8] via-[#fef9c3] to-[#fef08a] border-3 sm:border-4 border-[#854d0e] shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_0_4px_#fde047,inset_0_2px_12px_rgba(180,83,9,0.18)] space-y-2.5 sm:space-y-3 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-400 text-[#451a03]">
            
            {/* Antique Watermark Compass */}
            <Compass className="absolute -left-10 -bottom-10 w-40 h-40 text-amber-900/10 pointer-events-none rotate-12" />
            <Compass className="absolute -right-10 -top-10 w-40 h-40 text-amber-900/10 pointer-events-none -rotate-12" />

            {/* Gilded Antique Corner Filigrees */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#854d0e] pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#854d0e] pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#854d0e] pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#854d0e] pointer-events-none" />

            {/* Ancient Map Header: Gate Locks & Title */}
            <div className="flex items-center justify-between border-b-2 border-[#b45309]/20 pb-2 sm:pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#b45309] to-[#f59e0b] border-2 border-white shadow-xs flex items-center justify-center text-white shrink-0">
                  <DoorClosed className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-base md:text-lg text-[#451a03] block leading-tight font-sans">
                    خَرِيطَةُ الأَلْغَازِ الأَثَرِيَّةِ • القِفْلُ {currentChallengeStep} مِنْ {sessionData?.challenges?.length || 3}
                  </span>
                  <span className="text-[9px] sm:text-[11px] text-[#78350f] font-bold flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                    <span>حل اللغز لشحن طاقة البوابة الحجرية الأسطورية</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Luminous Gate Seals Status */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {Array.from({ length: sessionData?.challenges?.length || 3 }, (_, i) => i + 1).map((step) => {
                  const isUnlocked = currentChallengeStep > step;
                  const isCurrent = currentChallengeStep === step;
                  return (
                    <div
                      key={step}
                      className={`w-6 h-8 sm:w-8 sm:h-10 rounded-lg sm:rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        isUnlocked
                          ? "bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)] text-white ring-1 ring-emerald-300"
                          : isCurrent
                          ? "bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 border-white shadow-[0_0_16px_rgba(245,158,11,0.8)] animate-pulse ring-2 ring-yellow-400 text-[#451a03] font-black scale-105"
                          : "bg-amber-900/15 border-amber-800/30 opacity-45 text-amber-950 shadow-none"
                      }`}
                      title={`القفل الأثري ${step}`}
                    >
                      <div className={`w-3.5 h-2.5 sm:w-4 sm:h-3 rounded-t-full border-2 border-current -mt-2 sm:-mt-2.5 ${isUnlocked ? "-rotate-45" : ""}`} />
                      <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5" />
                      <span className="text-[7px] sm:text-[8px] font-black">{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gate Energy Reactor Progress Bar (Antique Brass & Amber Glow) */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black text-[#78350f] px-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>طاقة شحن البوابة الحجرية:</span>
                </span>
                <span className="font-mono text-[#92400e]">
                  {Math.round(((currentChallengeStep - 1) / (sessionData?.challenges?.length || 3)) * 100)}% مكتمل
                </span>
              </div>
              <div className="w-full bg-[#451a03]/15 rounded-full h-2.5 border-2 border-[#854d0e]/30 p-0.5 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  style={{ width: `${Math.max(8, Math.round(((currentChallengeStep - 1) / (sessionData?.challenges?.length || 3)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Smart Pedagogical Hint Button & Drawer */}
            <div className="pt-0.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPedagogicalHint((p) => !p)}
                  className="text-[10px] sm:text-xs font-black text-[#78350f] hover:text-[#451a03] bg-amber-200/90 hover:bg-amber-300 border border-[#b45309]/50 px-3 py-0.5 sm:py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>{showPedagogicalHint ? "إغلاق التلميح الذكي" : "💡 تلميح القبطان التربوي الذكي"}</span>
                </button>
                <span className="text-[10px] text-[#92400e] font-semibold">
                  بونص السرعة نشط ⚡
                </span>
              </div>

              {showPedagogicalHint && (
                <div className="mt-2 bg-gradient-to-r from-amber-100 via-[#fffbeb] to-amber-100 border-2 border-[#b45309]/60 rounded-xl p-3 text-right text-xs text-[#78350f] leading-relaxed shadow-md animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-1.5 font-black text-[#451a03] mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span>إرشاد تفكير المستكشف (توجيه تربوي):</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#78350f] font-medium">
                    {(currentChallenge as any).wrong_reason ||
                      "تمعن في المعطيات العلمية للغز، وابحث عن العلاقة المنطقية بين المفاهيم المطروحة لفك شفرة القفل الأثري بدقة."}
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

        {/* Explanation Modal on 2nd wrong attempt */}
        <ExplanationModal
          isOpen={explanationOpen}
          onClose={() => setExplanationOpen(false)}
          questionText={currentChallenge?.prompt || "تحدي مغامرة الكنز"}
          wrongReason={wrongReason || undefined}
          explanationUrl={explanationUrl || undefined}
        />

      {/* Certificate Modal for Successful Students (>= 80%) */}
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

      {/* 4. High-Production Cinematic Lock Unlocking Overlay */}
      {unlockedLockInfo && (
        <LockUnlockOverlay
          unlockedStep={unlockedLockInfo.step}
          totalSteps={sessionData?.challenges?.length || 3}
          pointsEarned={unlockedLockInfo.points}
          onAdvance={handleAdvanceFromLockUnlock}
        />
      )}
    </div>
  );
}
