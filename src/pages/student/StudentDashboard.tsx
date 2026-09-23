import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Brain,
  Gamepad2,
  GraduationCap,
  LogOut,
  Target,
  Zap,
  ChevronRight,
  ArrowRight,
  Atom,
  FlaskConical,
  Dna,
  Globe,
  Leaf,
  Star,
  Compass,
  Sparkles,
  Trophy,
  Rocket,
  CheckCircle2,
  ArrowLeft,
  Shield,
  Flame,
  Key,
  Award,
  Menu,
  ChevronDown,
  Puzzle,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import PremiumBackground from "@/components/ui/PremiumBackground";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { audioManager } from "@/lib/audio";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { isStudentFemale } from "@/lib/studentUtils";
import {
  clearSelectionContext,
  getSelectionDisplayText,
  getStoredSelectionContext,
  saveSelectionContext,
} from "@/lib/selection-context";
import {
  applySelectionFilters,
  getScopedHistoryIds,
  getScopedPayload,
  recordScopedHistory,
  resetScopedHistory,
} from "@/lib/selection-scope";
import {
  ExperienceType,
  SelectionContext,
  TrackType,
} from "@/types/selection";

type DashboardChoiceRow = {
  id: string;
  text: string;
  image_url?: string | null;
  is_correct: boolean;
};

type DashboardQuestionRow = {
  id: string;
  text: string;
  image_url?: string | null;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  stage_number?: number | null;
  choices?: DashboardChoiceRow[];
};

type DashboardSelectionState = {
  trackType: TrackType;
  gradeId: string;
  subjectId: string;
  gradeSubjectId: string;
  domainId: string;
};

const defaultSelectionState: DashboardSelectionState = {
  trackType: "nafis",
  gradeId: "",
  subjectId: "",
  gradeSubjectId: "",
  domainId: "",
};

const getDomainMeta = (slug?: string, name?: string) => {
  const s = (slug || "").toLowerCase();
  const n = name || "";
  if (s.includes("bio") || n.includes("أحياء") || n.includes("احياء")) {
    return {
      emoji: "🧬",
      badgeTitle: "عالم الأحياء والكائنات",
      tagline: "مغامرة استكشاف أسرار الحياة",
      icon: Dna,
      color: "text-emerald-600",
      gradient: "from-emerald-500/15 via-teal-500/5 to-white",
      iconBg: "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100",
      glowBg: "bg-emerald-400/20",
      borderHover: "hover:border-emerald-400 hover:shadow-[0_24px_70px_rgba(16,185,129,0.22)]",
      buttonStyle: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/30",
      chipStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      desc: "استكشف أسرار الكائنات الحية والبيولوجيا بتشويق وتفوق"
    };
  }
  if (s.includes("earth") || s.includes("space") || n.includes("أرض") || n.includes("فضاء") || n.includes("ارض")) {
    return {
      emoji: "🌍",
      badgeTitle: "علوم الأرض والفضاء",
      tagline: "رحلة رواد الفضاء والكون الشاسع",
      icon: Globe,
      color: "text-cyan-600",
      gradient: "from-cyan-500/15 via-sky-500/5 to-white",
      iconBg: "bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-100",
      glowBg: "bg-cyan-400/20",
      borderHover: "hover:border-cyan-400 hover:shadow-[0_24px_70px_rgba(6,182,212,0.22)]",
      buttonStyle: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md shadow-cyan-600/30",
      chipStyle: "bg-cyan-50 text-cyan-800 border-cyan-200",
      desc: "انطلق في رحلة استكشاف كوكب الأرض والغلاف الجوي والنجوم والمجرات"
    };
  }
  if (s.includes("chem") || n.includes("كيمياء")) {
    return {
      emoji: "🧪",
      badgeTitle: "مختبر الكيمياء العجيب",
      tagline: "تفاعلات مدهشة وعالم الذرات",
      icon: FlaskConical,
      color: "text-purple-600",
      gradient: "from-purple-500/15 via-fuchsia-500/5 to-white",
      iconBg: "bg-gradient-to-tr from-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30 ring-4 ring-purple-100",
      glowBg: "bg-purple-400/20",
      borderHover: "hover:border-purple-400 hover:shadow-[0_24px_70px_rgba(147,51,234,0.22)]",
      buttonStyle: "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-md shadow-purple-600/30",
      chipStyle: "bg-purple-50 text-purple-800 border-purple-200",
      desc: "تفاعل مع الذرات والعناصر والتجارب الكيميائية المبهرة والمسلية"
    };
  }
  if (s.includes("phys") || n.includes("فيزياء")) {
    return {
      emoji: "⚛️",
      badgeTitle: "فرسان الفيزياء والطاقة",
      tagline: "قوانين الحركة والجاذبية والمادة",
      icon: Atom,
      color: "text-blue-600",
      gradient: "from-blue-500/15 via-indigo-500/5 to-white",
      iconBg: "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100",
      glowBg: "bg-blue-400/20",
      borderHover: "hover:border-blue-400 hover:shadow-[0_24px_70px_rgba(59,130,246,0.22)]",
      buttonStyle: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/30",
      chipStyle: "bg-blue-50 text-blue-800 border-blue-200",
      desc: "اكتشف قوانين الحركة والسرعة والقوى في عالم الفيزياء المليء بالإثارة"
    };
  }
  if (s.includes("elec") || n.includes("كهرباء")) {
    return {
      emoji: "⚡",
      badgeTitle: "طاقة الكهرباء والمغناطيس",
      tagline: "دوائر وتيارات وشرارات الذكاء",
      icon: Zap,
      color: "text-amber-600",
      gradient: "from-amber-500/15 via-orange-500/5 to-white",
      iconBg: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-4 ring-amber-100",
      glowBg: "bg-amber-400/20",
      borderHover: "hover:border-amber-400 hover:shadow-[0_24px_70px_rgba(245,158,11,0.22)]",
      buttonStyle: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/30",
      chipStyle: "bg-amber-50 text-amber-800 border-amber-200",
      desc: "تعرف على الدوائر الكهربائية والقدرة والشحنات بذكاء وسرعة بديهة"
    };
  }
  if (s.includes("nature") || s.includes("sci") || n.includes("طبيعة") || n.includes("طبيعه")) {
    return {
      emoji: "🧭",
      badgeTitle: "مستكشفو طبيعة العلم",
      tagline: "التفكير العلمي والاستقصاء الذكي",
      icon: Compass,
      color: "text-rose-600",
      gradient: "from-rose-500/15 via-pink-500/5 to-white",
      iconBg: "bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 ring-4 ring-rose-100",
      glowBg: "bg-rose-400/20",
      borderHover: "hover:border-rose-400 hover:shadow-[0_24px_70px_rgba(244,63,94,0.22)]",
      buttonStyle: "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-md shadow-rose-600/30",
      chipStyle: "bg-rose-50 text-rose-800 border-rose-200",
      desc: "خطوات التفكير الاستقصائي وصياغة الفرضيات والاستنتاج كعالم حقيقي"
    };
  }
  return {
    emoji: "🎯",
    badgeTitle: "تحديات علمية مميزة",
    tagline: "إتقان المفاهيم وحصد الأوسمة",
    icon: Target,
    color: "text-indigo-600",
    gradient: "from-indigo-500/15 via-sky-500/5 to-white",
    iconBg: "bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100",
    glowBg: "bg-indigo-400/20",
    borderHover: "hover:border-indigo-400 hover:shadow-[0_24px_70px_rgba(99,102,241,0.22)]",
    buttonStyle: "bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white shadow-md shadow-indigo-600/30",
    chipStyle: "bg-indigo-50 text-indigo-800 border-indigo-200",
    desc: "أثبت جدارتك وقوتك في هذا المجال العلمي المتميز والمشوق"
  };
};

const getDomainOrder = (name?: string, slug?: string) => {
  const n = (name || "").toLowerCase();
  const s = (slug || "").toLowerCase();
  // 1. Biology (الأحياء) first/top
  if (n.includes("أحياء") || n.includes("احياء") || s.includes("bio")) return 1;
  // 2. Chemistry (الكيمياء) second
  if (n.includes("كيمياء") || s.includes("chem")) return 2;
  // 3. Physics (الفيزياء) third
  if (n.includes("فيزياء") || s.includes("phys")) return 3;
  // 4. Electricity & Magnetism
  if (n.includes("كهرباء") || s.includes("elec")) return 4;
  // 5. Earth and Space
  if (n.includes("أرض") || n.includes("ارض") || n.includes("فضاء") || s.includes("earth") || s.includes("space")) return 5;
  // 6. Nature of Science
  if (n.includes("طبيعة") || n.includes("طبيعه") || s.includes("nature")) return 6;
  return 10;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { data: catalog, isLoading: isCatalogLoading } = useAcademicCatalog();
  const storedStudentName =
    localStorage.getItem("student_name") ||
    sessionStorage.getItem("student_name") ||
    null;

  const [isLoading, setIsLoading] = useState(!storedStudentName);
  const [studentName, setStudentName] = useState<string | null>(storedStudentName);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [selection, setSelection] =
    useState<DashboardSelectionState>(defaultSelectionState);
  const [experienceType, setExperienceType] = useState<ExperienceType | null>(
    null,
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const existingContext = getStoredSelectionContext();
    if (!existingContext) {
      return;
    }

    setSelection({
      trackType: existingContext.trackType,
      gradeId: existingContext.gradeId,
      subjectId: existingContext.subjectId,
      gradeSubjectId: existingContext.gradeSubjectId,
      domainId: existingContext.domainId || "",
    });
    setExperienceType(existingContext.experienceType);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session && !storedStudentName) {
          navigate("/");
          return;
        }

        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .single();

          if (profile?.full_name) {
            setStudentName(profile.full_name);
            localStorage.setItem("student_name", profile.full_name);
          }
        }
      } catch (error) {
        console.error("Failed to bootstrap student dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [navigate, storedStudentName]);

  const gradeSubjects = useMemo(
    () => catalog?.gradeSubjects ?? [],
    [catalog?.gradeSubjects],
  );
  const domains = useMemo(() => catalog?.domains ?? [], [catalog?.domains]);
  const grades = useMemo(() => catalog?.grades ?? [], [catalog?.grades]);

  const availableSubjects = useMemo(() => {
    if (!catalog?.subjects || !selection.gradeId) {
      return [];
    }

    const subjectIds = new Set(
      gradeSubjects
        .filter((item) => item.grade_id === selection.gradeId)
        .map((item) => item.subject_id),
    );

    return catalog.subjects.filter((subject) => subjectIds.has(subject.id));
  }, [catalog?.subjects, gradeSubjects, selection.gradeId]);

  const availableDomains = useMemo(
    () =>
      domains.filter(
        (domain) => domain.grade_subject_id === selection.gradeSubjectId,
      ),
    [domains, selection.gradeSubjectId],
  );

  // Apply per-track name overrides, filtering, and sorting (Biology first, Chemistry second, Physics third)
  const displayDomains = useMemo(() => {
    return availableDomains
      .filter((domain) => {
        // Remove "طبيعة العلم" from Nafis bank only
        if (selection.trackType === "nafis") {
          const s = (domain.slug || "").toLowerCase();
          const n = domain.name || "";
          if (
            s.includes("nature") ||
            n.includes("طبيعة العلم") ||
            n.includes("طبيعه العلم") ||
            n === "طبيعة العلم" ||
            n === "طبيعه العلم"
          ) {
            return false;
          }
        }
        return true;
      })
      .map((domain) => {
        let name = domain.name;
        const s = (domain.slug || "").toLowerCase();
        // Rename "الكهرباء" → "الكهرباء والمغناطيسية" in both tracks (Nafis & Central)
        if (
          (name === "الكهرباء" ||
            name === "كهرباء" ||
            s.includes("elec") ||
            name.includes("الكهرباء")) &&
          !name.includes("المغناطيسية")
        ) {
          name = "الكهرباء والمغناطيسية";
        }
        // Rename "علم الارض والفضاء" → "علم الارض والفضاء والبيئة" in Nafis only
        if (
          selection.trackType === "nafis" &&
          (name.includes("الأرض والفضاء") ||
            name.includes("الارض والفضاء") ||
            name.includes("أرض وفضاء") ||
            name.includes("فضاء وأرض") ||
            s.includes("earth") ||
            s.includes("space")) &&
          !name.includes("البيئة") &&
          !name.includes("البيئه")
        ) {
          name = "علم الأرض والفضاء والبيئة";
        }
        return { ...domain, name };
      })
      .sort((a, b) => getDomainOrder(a.name, a.slug) - getDomainOrder(b.name, b.slug));
  }, [availableDomains, selection.trackType]);

  const selectedGrade = grades.find((grade) => grade.id === selection.gradeId);
  const selectedSubject = availableSubjects.find(
    (subject) => subject.id === selection.subjectId,
  );
  const selectedDomain = displayDomains.find(
    (domain) => domain.id === selection.domainId,
  ) || availableDomains.find(
    (domain) => domain.id === selection.domainId,
  );

  const handleTrackChange = async (trackType: TrackType) => {
    setSelection((current) => ({
      ...current,
      trackType,
      domainId: "",
    }));
    setExperienceType(null);

    // Move to next step instead of starting immediately
    setStep(2);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setExperienceType(null);
    } else if (step === 2) {
      setStep(1);
      setExperienceType(null);
      setSelection((curr) => ({ ...curr, domainId: "" }));
    }
  };

  const handleLaunchGame = (gamePath: string) => {
    audioManager.playPowerUp();
    const resolvedGrade = selectedGrade || grades[0];
    const resolvedSubject = selectedSubject || availableSubjects[0];
    const resolvedGsId =
      selection.gradeSubjectId ||
      gradeSubjects.find(
        (gs) =>
          gs.grade_id === (resolvedGrade?.id || selection.gradeId) &&
          gs.subject_id === (resolvedSubject?.id || selection.subjectId)
      )?.id ||
      "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

    const context: SelectionContext = {
      trackType: selection.trackType,
      experienceType: "interactive-games",
      gradeId: resolvedGrade?.id || "8db3f874-aa52-4893-8d04-4eb6ef74f0af",
      gradeName: resolvedGrade?.name || "ثالث متوسط",
      subjectId: resolvedSubject?.id || "a79e5e49-5a5e-4ccd-9ac8-c5e9c37c788b",
      subjectName: resolvedSubject?.name || "علوم",
      gradeSubjectId: resolvedGsId,
      domainId: selectedDomain?.id || null,
      domainName: selectedDomain?.name || null,
    };
    saveSelectionContext(context);
    navigate(gamePath);
  };

  const handleExperienceChange = async (type: ExperienceType) => {
    setExperienceType(type);

    const resolvedGrade = selectedGrade || grades[0];
    const resolvedSubject = selectedSubject || availableSubjects[0];
    const resolvedGsId =
      selection.gradeSubjectId ||
      gradeSubjects.find(
        (gs) =>
          gs.grade_id === (resolvedGrade?.id || selection.gradeId) &&
          gs.subject_id === (resolvedSubject?.id || selection.subjectId)
      )?.id ||
      "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

    const context: SelectionContext = {
      trackType: selection.trackType,
      experienceType: type,
      gradeId: resolvedGrade?.id || "8db3f874-aa52-4893-8d04-4eb6ef74f0af",
      gradeName: resolvedGrade?.name || "ثالث متوسط",
      subjectId: resolvedSubject?.id || "a79e5e49-5a5e-4ccd-9ac8-c5e9c37c788b",
      subjectName: resolvedSubject?.name || "علوم",
      gradeSubjectId: resolvedGsId,
      domainId: selectedDomain?.id || null,
      domainName: selectedDomain?.name || null,
    };

    await executeStart(context);
  };

  const handleDomainSelection = async (domainId: string) => {
    handleDomainChange(domainId);
    // Both Nafis and Central move to step 3 to choose Challenge Mode (Quiz vs Games)
    setStep(3);
  };

  const buildSelectionContextExtended = (track: TrackType, exp: ExperienceType): SelectionContext | null => {
    const resolvedGrade = selectedGrade || grades[0];
    const resolvedSubject = selectedSubject || availableSubjects[0];
    const resolvedGsId =
      selection.gradeSubjectId ||
      gradeSubjects.find(
        (gs) =>
          gs.grade_id === (resolvedGrade?.id || selection.gradeId) &&
          gs.subject_id === (resolvedSubject?.id || selection.subjectId)
      )?.id ||
      "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

    if (!resolvedGrade || !resolvedSubject) {
      return null;
    }

    return {
      trackType: track,
      experienceType: exp,
      gradeId: resolvedGrade.id,
      gradeName: resolvedGrade.name,
      subjectId: resolvedSubject.id,
      subjectName: resolvedSubject.name,
      gradeSubjectId: resolvedGsId,
      domainId: selectedDomain?.id || null,
      domainName: selectedDomain?.name || null,
    };
  };

  const executeStart = async (context: SelectionContext) => {
    saveSelectionContext(context);
    setIsActionLoading(true);

    try {
      if (context.trackType === "nafis" && context.experienceType === "quick-quiz") {
        await startNafisQuickQuiz(context);
        return;
      }

      if (
        context.trackType === "nafis" &&
        context.experienceType === "interactive-games"
      ) {
        navigate("/student/games");
        return;
      }

      if (
        context.trackType === "central" &&
        context.experienceType === "interactive-games"
      ) {
        navigate("/central-exam/games");
        return;
      }

      navigate("/central-exam/play");
    } catch (error: any) {
      console.error("Failed to start student flow", error);
      toast.error(error?.message || "حدث خطأ أثناء تجهيز التجربة");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGradeChange = (gradeId: string) => {
    setSelection((current) => ({
      ...current,
      gradeId,
      subjectId: "",
      gradeSubjectId: "",
      domainId: "",
    }));
  };

  const handleSubjectChange = (subjectId: string) => {
    const matchedGradeSubject = gradeSubjects.find(
      (item) =>
        item.grade_id === selection.gradeId && item.subject_id === subjectId,
    );

    setSelection((current) => ({
      ...current,
      subjectId,
      gradeSubjectId: matchedGradeSubject?.id || "",
      domainId: "",
    }));
  };

  const handleDomainChange = (domainId: string) => {
    setSelection((current) => ({
      ...current,
      domainId,
    }));
  };

  // Auto-selection logic for catalog availability
  useEffect(() => {
    if (grades.length > 0 && !selection.gradeId) {
      handleGradeChange(grades[0].id);
    }
  }, [grades, selection.gradeId]);

  useEffect(() => {
    if (
      availableSubjects.length > 0 &&
      !selection.subjectId &&
      selection.gradeId
    ) {
      handleSubjectChange(availableSubjects[0].id);
    }
  }, [availableSubjects, selection.subjectId, selection.gradeId]);

  useEffect(() => {
    if (
      selection.trackType === "central" &&
      availableDomains.length === 1 &&
      !selection.domainId &&
      selection.gradeSubjectId
    ) {
      handleDomainChange(availableDomains[0].id);
    }
  }, [
    selection.trackType,
    availableDomains,
    selection.domainId,
    selection.gradeSubjectId,
  ]);

  const buildSelectionContext = (): SelectionContext | null => {
    if (!selectedGrade || !selectedSubject || !selection.gradeSubjectId) {
      return null;
    }

    if (selection.trackType === "central" && !selectedDomain) {
      return null;
    }

    return {
      trackType: selection.trackType,
      experienceType: experienceType || "quick-quiz",
      gradeId: selectedGrade.id,
      gradeName: selectedGrade.name,
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      gradeSubjectId: selection.gradeSubjectId,
      domainId: selectedDomain?.id || null,
      domainName: selectedDomain?.name || null,
    };
  };

  const handleLogout = async () => {
    clearSelectionContext();
    await supabase.auth.signOut();
    navigate("/");
  };

  const startNafisQuickQuiz = async (context: SelectionContext) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
      return;
    }

    const scopedQuestionsQuery = applySelectionFilters(
      supabase
        .from("questions")
        .select("*, choices(*)")
        .eq("active", true)
        .order("stage_number", { ascending: true })
        .order("created_at", { ascending: true }),
      context,
    );
    const { data: allQuestionsData, error: questionsError } = await scopedQuestionsQuery;

    if (questionsError) {
      throw questionsError;
    }

    const availableQuestions = (allQuestionsData || []) as DashboardQuestionRow[];

    if (!availableQuestions || availableQuestions.length === 0) {
      if (context.domainName) {
        toast.error(`لا توجد أسئلة مخصصة لتخصص "${context.domainName}" حالياً، يُرجى تصنيف الأسئلة من لوحة التحكم`);
      } else {
        toast.error("لا توجد أسئلة متاحة لهذا الصف والمادة حاليًا");
      }
      return;
    }

    const TARGET_QUESTIONS = 40;
    const TOTAL_STAGES = 4;
    const orderedQuestions = availableQuestions.slice(0, TARGET_QUESTIONS);
    const questionsPerStage = Math.max(1, Math.ceil(orderedQuestions.length / TOTAL_STAGES));

    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .insert({
        student_name: studentName || "طالب",
        score: 0,
        question_count: orderedQuestions.length,
        ...getScopedPayload(context),
      })
      .select()
      .single();

    if (attemptError) {
      throw attemptError;
    }

    const attemptRow = attempt as unknown as { id: string };

    await recordScopedHistory(
      session.user.id,
      "exam",
      orderedQuestions.map((q) => q.id),
      context,
    );

    const examQuestions = orderedQuestions.map((question, index: number) => {
      const stageNumber = Math.min(TOTAL_STAGES, Math.floor(index / questionsPerStage) + 1);
      return {
        id: question.id,
        text: question.text,
        image_url: question.image_url,
        wrong_reason: question.wrong_reason,
        explanation_url: question.explanation_url,
        stage_number: stageNumber,
        order_index: index,
        choices: (question.choices || []).map((choice) => ({
          id: choice.id,
          text: choice.text,
          image_url: choice.image_url,
          is_correct: choice.is_correct,
        })),
      };
    });

    const attemptData = {
      attempt_id: attemptRow.id,
      student_name: studentName || "طالب",
      question_count: examQuestions.length,
      score: 0,
      selection_snapshot: getScopedPayload(context).selection_snapshot,
      questions: examQuestions,
    };

    sessionStorage.setItem(`exam_${attemptRow.id}`, JSON.stringify(attemptData));
    navigate(`/exam/${attemptRow.id}`);
  };



  const currentContext = buildSelectionContext();

  if (isLoading || isCatalogLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <SaudiLoader text="جاري تجهيز لوحة الطالب..." />
      </div>
    );
  }

  return (
    <PremiumBackground>
      <div className="min-h-screen flex flex-col justify-between" dir="rtl">
        {/* Full-width Glassmorphic Navbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-2xl shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 gap-2 sm:gap-4 relative">
            
            {/* 1. RIGHT SIDE: Back Button + Student Profile Capsule (Select Trigger) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
              {step > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    audioManager.playClick();
                    handleBack();
                  }}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-xs"
                  title="العودة للخطوة السابقة"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}

              {/* Enhanced Student Profile Capsule Button */}
              <button
                type="button"
                onClick={() => {
                  audioManager.playClick();
                  setIsProfileMenuOpen((prev) => !prev);
                }}
                className={`group flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer text-right select-none ${
                  isProfileMenuOpen
                    ? "bg-indigo-50/95 border-indigo-300 ring-2 ring-indigo-200/70 shadow-sm"
                    : "bg-white/90 hover:bg-slate-50 border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-xs active:scale-[0.98]"
                }`}
                title="اضغط لفتح قائمة الخدمات والملف الشخصي"
                aria-label="اضغط لفتح قائمة الخدمات والملف الشخصي"
                aria-expanded={isProfileMenuOpen}
              >
                {/* Modern Avatar with Glow Ring and Pulse Beacon */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-[2px] shadow-sm flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                    <div className="w-full h-full rounded-[13px] bg-gradient-to-br from-white via-indigo-50/40 to-slate-50 flex items-center justify-center overflow-hidden">
                      <span className="text-lg sm:text-xl select-none filter drop-shadow-xs">
                        {isStudentFemale(studentName) ? "👩‍🎓" : "🧑‍🎓"}
                      </span>
                    </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                  </span>
                </div>

                {/* Student Details: Name & Level */}
                <div className="flex flex-col text-right min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate max-w-[110px] sm:max-w-[170px] md:max-w-[240px]">
                      {studentName ? `أهلاً، ${studentName}` : "طالب متميز"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9.5px] sm:text-[10px] font-black text-indigo-700 bg-indigo-50/90 border border-indigo-200/60 px-1.5 py-0.2 rounded-md">
                      طالب/ة متفوق/ة ⭐
                    </span>
                  </div>
                </div>

                {/* Dropdown Indicator Pill */}
                <div
                  className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                    isProfileMenuOpen
                      ? "rotate-180 bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100/90 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* 2. CENTER: Brand Logo & Teacher Name */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 px-2.5 sm:px-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-2xs backdrop-blur-md md:absolute md:left-1/2 md:-translate-x-1/2">
              <div className="relative group shrink-0">
                <div className="relative flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200/80 overflow-hidden p-1">
                  <img src="/brain-science-logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col text-center sm:text-right leading-tight">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="font-black text-xs sm:text-sm text-slate-900 tracking-tight">براين ساينس</span>
                  <span className="hidden xs:inline-block text-[9px] sm:text-[9.5px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                    للتفوق 🚀
                  </span>
                </div>
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-600 mt-0.5">
                  المعلمة: أ/ هيفاء السلمي
                </span>
              </div>
            </div>

            {/* 3. LEFT SIDE: Sound Toggle & Clean Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
              <SoundToggle />

              <Button
                variant="ghost"
                onClick={() => {
                  audioManager.playClick();
                  handleLogout();
                }}
                className="gap-1.5 sm:gap-2 rounded-2xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 h-9 sm:h-11 px-2.5 sm:px-4 font-bold border border-slate-200 text-xs sm:text-sm transition-all shadow-2xs"
                title="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline-block">خروج</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Floating Profile Dropdown / Drawer Menu */}
        <StudentSidebar
          studentName={studentName}
          activeItem="home"
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
          onNavigateHome={() => setStep(1)}
          onLogout={handleLogout}
        />

        {/* Main Content Layout - Centered, Wide, and Spacious */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Main Stage Content */}
          <main className="space-y-6 sm:space-y-8">
          {/* Gamified Quest Adventure Stepper - 3 Steps */}
          <div className="flex items-center justify-center mb-8 sm:mb-12 select-none px-2">
            <div className="relative flex items-center gap-2 sm:gap-4 p-2 sm:p-2.5 rounded-[2rem] bg-white/90 backdrop-blur-2xl border-2 border-indigo-100/90 shadow-xl shadow-indigo-500/5 max-w-2xl w-full justify-between sm:justify-center overflow-x-auto">
              {/* Step 1: Educational Track */}
              <button
                type="button"
                onClick={() => {
                  if (step > 1) {
                    audioManager.playClick();
                    setStep(1);
                  }
                }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                  step === 1
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 scale-105 ring-4 ring-indigo-100"
                    : step > 1
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                  step === 1
                    ? "bg-white/25 text-white"
                    : step > 1
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : "1"}
                </span>
                <span>المسار التعليمي</span>
              </button>

              {/* Connecting Bar 1 */}
              <div className={`h-1 flex-1 max-w-[2rem] sm:max-w-[3rem] rounded-full transition-all duration-700 ${
                step >= 2 ? "bg-gradient-to-r from-emerald-500 to-amber-500" : "bg-slate-200"
              }`} />

              {/* Step 2: Scientific Domain */}
              <button
                type="button"
                disabled={step < 2}
                onClick={() => {
                  if (step > 2) {
                    audioManager.playClick();
                    setStep(2);
                  }
                }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                  step === 2
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-lg shadow-amber-500/30 scale-105 ring-4 ring-amber-100"
                    : step > 2
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    : "text-slate-400 opacity-60 cursor-not-allowed"
                }`}
              >
                <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                  step === 2
                    ? "bg-white/25 text-white"
                    : step > 2
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {step > 2 ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : "2"}
                </span>
                <span>المجال العلمي</span>
              </button>

              {/* Connecting Bar 2 */}
              <div className={`h-1 flex-1 max-w-[2rem] sm:max-w-[3rem] rounded-full transition-all duration-700 ${
                step >= 3 ? "bg-gradient-to-r from-amber-500 to-purple-600" : "bg-slate-200"
              }`} />

              {/* Step 3: Challenge Mode */}
              <div
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                  step === 3
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 scale-105 ring-4 ring-purple-100"
                    : "text-slate-400 opacity-60"
                }`}
              >
                <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                  step === 3 ? "bg-white/25 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  3
                </span>
                <span>نوع التحدي</span>
              </div>
            </div>
          </div>

          {/* Step 1: Track Selection */}
          {step === 1 && (
            <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500 relative">
              {/* Scoped Keyframes for Smooth Micro-Animations */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes floatSlow {
                  0%, 100% { transform: translateY(0px) rotate(0deg); }
                  50% { transform: translateY(-9px) rotate(3deg); }
                }
                @keyframes floatSlowReverse {
                  0%, 100% { transform: translateY(0px) rotate(0deg); }
                  50% { transform: translateY(9px) rotate(-3deg); }
                }
                @keyframes shimmerSweep {
                  0% { transform: translateX(-120%) skewX(-20deg); }
                  100% { transform: translateX(260%) skewX(-20deg); }
                }
              `}} />

              {/* Compact Sleek Top Header so tracks appear right at the top */}
              <div className="text-center space-y-2 max-w-2xl mx-auto pt-1 pb-2 animate-in fade-in slide-in-from-top-2 duration-500">
                {studentName && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-black text-indigo-900 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span>أهلاً بك يا بطل 🌟 {studentName}</span>
                  </div>
                )}
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-sky-600 to-emerald-600">مسارك العلمي</span>
                </h2>
              </div>

              {/* The Two Grand Masterpiece Track Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto pt-2">
                {/* Card 1: Nafis National Track (Emerald & Teal Edition) */}
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playClick()}
                  onClick={() => {
                    audioManager.playPowerUp();
                    handleTrackChange("nafis");
                  }}
                  className="group relative text-right p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-b from-white via-emerald-50/40 to-white border-2 border-emerald-200/90 hover:border-emerald-500 shadow-xl shadow-emerald-500/5 hover:shadow-[0_28px_80px_rgba(16,185,129,0.24)] transition-all duration-500 hover:-translate-y-2.5 active:scale-[0.99] flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  {/* Subtle Background Glow Auras */}
                  <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl group-hover:scale-150 group-hover:bg-emerald-500/25 transition-all duration-700 pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700 pointer-events-none" />

                  {/* Specular Shimmer Sweep on Hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none skew-x-12" />

                  <div className="relative space-y-6">
                    {/* Top Header of Card */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ring-4 ring-emerald-100 group-hover:ring-emerald-300">
                        <Zap className="h-8 w-8 sm:h-10 sm:w-10 group-hover:animate-pulse" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="flex items-center gap-2 text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>المعيار الوطني 🇸🇦</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                          ألعاب تفاعلية + اختبار سريع
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                        بنك اختبارات نافس
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-bold">
                        استعداد وطني شامل وفق معايير الاختبارات الوطنية (نافس) مع ألعاب تعليمية وتحديات سريعة لرفع نواتج التعلم وتثبيت المفاهيم.
                      </p>
                    </div>

                    {/* Features Preview Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition-colors shadow-2xs">
                        🏆 اختبار سريع فوري
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-teal-50 group-hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-black transition-colors shadow-2xs">
                        🗝️ مغامرة صائد الكنز
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-cyan-50 group-hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-black transition-colors shadow-2xs">
                        ⚡ تحدي السرعة
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black transition-colors shadow-2xs">
                        ⭐ نقاط وأوسمة
                      </span>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="relative mt-8 pt-5 border-t border-emerald-100/90 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>جاهز للاستعداد</span>
                    </span>
                    <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-black text-sm sm:text-base border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 shadow-md shadow-emerald-600/30 group-hover:shadow-lg group-hover:shadow-emerald-600/40 transition-all">
                      <span>ابدأ تدريب نافس الوطني</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </button>

                {/* Card 2: Central Exam (Indigo & Sky Edition) */}
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playClick()}
                  onClick={() => {
                    audioManager.playPowerUp();
                    handleTrackChange("central");
                  }}
                  className="group relative text-right p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-b from-white via-indigo-50/40 to-white border-2 border-indigo-200/90 hover:border-indigo-500 shadow-xl shadow-indigo-500/5 hover:shadow-[0_28px_80px_rgba(79,70,229,0.24)] transition-all duration-500 hover:-translate-y-2.5 active:scale-[0.99] flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  {/* Subtle Background Glow Auras */}
                  <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl group-hover:scale-150 group-hover:bg-indigo-500/25 transition-all duration-700 pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700 pointer-events-none" />

                  {/* Specular Shimmer Sweep on Hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none skew-x-12" />

                  <div className="relative space-y-6">
                    {/* Top Header of Card */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ring-4 ring-indigo-100 group-hover:ring-indigo-300">
                        <Target className="h-8 w-8 sm:h-10 sm:w-10 group-hover:animate-pulse" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="flex items-center gap-2 text-xs font-black text-indigo-800 bg-indigo-100/90 border border-indigo-300/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                          <span>تخصصات علمية 🎯</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                          6 مجالات علمية مقننة
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                        الاختبار المركزي
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-bold">
                        تحديات علمية مقننة في مجالات دقيقة: الأحياء، الكيمياء، الفيزياء، علوم الأرض والفضاء، الكهرباء والمغناطيسية، وطبيعة العلم لقياس الفهم المعياري.
                      </p>
                    </div>

                    {/* Domain Pills Preview - Ordered: Biology first */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition-colors shadow-2xs">
                        🧬 أحياء
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-purple-50 group-hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black transition-colors shadow-2xs">
                        🧪 كيمياء
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-black transition-colors shadow-2xs">
                        ⚛️ فيزياء
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black transition-colors shadow-2xs">
                       ⚡ كهرباء ومغناطيسية
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-cyan-50 group-hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-black transition-colors shadow-2xs">
                        🌍 فضاء وأرض
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-rose-50 group-hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black transition-colors shadow-2xs">
                        🧭 طبيعة العلم
                      </span>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="relative mt-8 pt-5 border-t border-indigo-100/90 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>بنك أسئلة معياري</span>
                    </span>
                    <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-sm sm:text-base border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 shadow-md shadow-indigo-600/30 group-hover:shadow-lg group-hover:shadow-indigo-600/40 transition-all">
                      <span>انطلق للاختبار المركزي</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Specializations / Domains (for BOTH Nafis and Central) */}
          {step === 2 && (
            <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500 relative">
              {/* Domain Step Hero Banner */}
              <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
                <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/90 text-indigo-800 text-xs sm:text-sm font-black shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>
                    {selection.trackType === "nafis"
                      ? "مسار بنك نافس • مجلدات المواد والتخصصات العلمية 🇸🇦"
                      : "المسار المركزي • مجالات علمية متخصصة 🎯"}
                  </span>
                  <span className="text-indigo-300">|</span>
                  <span className="text-emerald-600 font-extrabold">اختر وانطلق 🚀</span>
                </div>

                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                  اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-600">التخصص العلمي</span>
                </h2>

                <p className="text-sm sm:text-base font-bold text-slate-600 max-w-xl mx-auto leading-relaxed bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                  {selection.trackType === "nafis"
                    ? "يا بطلنا المتميز! اختر مجالك العلمي المفضل لخوض الاختبار أو الألعاب التفاعلية وحصد النقاط والشهادات 🌟"
                    : "بطلنا المتميز! حدد المجال العلمي الذي ترغب في اكتساحه اليوم بتفوق وثقة"}
                </p>
              </div>

              {/* Elegant Vertical List View for Domains (as requested: شكل قوائم - Biology first) */}
              <div className="flex flex-col gap-3.5 max-w-4xl mx-auto w-full">
                {displayDomains.length > 0 ? (
                  displayDomains.map((domain, idx) => {
                    const meta = getDomainMeta(domain.slug, domain.name);
                    const DomainIcon = meta.icon;
                    return (
                      <button
                        key={domain.id}
                        type="button"
                        onMouseEnter={() => audioManager.playClick()}
                        onClick={() => {
                          audioManager.playPowerUp();
                          handleDomainSelection(domain.id);
                        }}
                        className="group relative text-right p-4 sm:p-5 rounded-3xl bg-white/95 hover:bg-gradient-to-r hover:from-white hover:via-indigo-50/40 hover:to-white border-2 border-slate-200/90 hover:border-indigo-400 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer overflow-hidden"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Right Section: Icon + Domain Details */}
                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                          <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl shrink-0 transition-transform group-hover:scale-105 shadow-md ${meta.iconBg}`}>
                            <DomainIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {domain.name}
                              </h3>
                              <span className="text-xl select-none">{meta.emoji}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-2xs ${meta.chipStyle}`}>
                                {meta.badgeTitle}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed line-clamp-2">
                              {meta.desc}
                            </p>
                          </div>
                        </div>

                        {/* Left Section: Badges & Action CTA */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="hidden md:inline-block px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-black border border-slate-200/80">
                            ⭐ 10 أسئلة ذكية
                          </span>
                          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-b-4 active:border-b-0 active:translate-y-0.5 transition-all shadow-md group-hover:shadow-lg ${meta.buttonStyle}`}>
                            <span>اختيار التخصص</span>
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-300" />
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-20 text-center bg-white/80 rounded-3xl border border-slate-200">
                    <p className="text-xl font-black text-slate-400">لا توجد تخصصات متاحة لهذا الصف حالياً</p>
                  </div>
                )}
              </div>

              {/* Back Button with Modern Tactile Pill */}
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    audioManager.playClick();
                    handleBack();
                  }}
                  className="rounded-2xl border-2 border-slate-200/90 bg-white/95 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 h-12 px-6 font-black text-sm gap-2.5 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة لاختيار المسار التعليمي</span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Challenge Mode Selection (for BOTH Nafis and Central) */}
          {step === 3 && (
            <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500 relative">
              {/* Floating Ambient Science Badges (Desktop) */}
              <div
                className="hidden lg:flex absolute -top-4 -right-6 items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-amber-200/90 shadow-lg shadow-amber-500/10 text-amber-800 pointer-events-none select-none z-10"
                style={{ animation: "floatSlow 5.5s ease-in-out infinite" }}
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                <span className="text-xs font-black">سرعة خارقة وتصحيح فوري ⚡</span>
              </div>

              <div
                className="hidden lg:flex absolute -top-4 -left-6 items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-fuchsia-200/90 shadow-lg shadow-fuchsia-500/10 text-fuchsia-800 pointer-events-none select-none z-10"
                style={{ animation: "floatSlowReverse 6.5s ease-in-out infinite" }}
              >
                <Gamepad2 className="w-4 h-4 text-fuchsia-600" />
                <span className="text-xs font-black">ألعاب تطابقية ومغامرة الكنز 🗝️</span>
              </div>

              {/* Step Hero Mission Banner & Friendly Mascot Capsule */}
              <div className="text-center space-y-4 max-w-3xl mx-auto pt-1">
                {/* Hero Mascot Greeting Capsule */}
                <div className="inline-flex items-center gap-2.5 px-4 sm:px-6 py-2 rounded-full bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 border-2 border-amber-200/90 shadow-sm text-xs sm:text-sm font-black text-slate-800">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: "6s" }} />
                  <span>
                    {selectedDomain
                      ? `${selection.trackType === "central" ? "المسار المركزي 🎯" : "مسار بنك نافس الوطني 🇸🇦"} • المجال: ${selectedDomain.name}`
                      : selection.trackType === "central"
                      ? "المسار المركزي 🎯"
                      : "مسار بنك اختبارات نافس الوطني 🇸🇦"}
                  </span>
                </div>

                {/* Main 3D Title with Vibrancy */}
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                    اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 filter drop-shadow-xs">نوع التحدي</span>
                  </h2>
                  <p className="text-sm sm:text-base font-bold text-slate-600 max-w-xl mx-auto leading-relaxed bg-white/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    يا بطلنا الذكي! 🌟 في مجال <span className="text-indigo-600 font-black">{selectedDomain?.name || "العلوم"}</span>: اختر طريقتك المفضلة اليوم: هل تفضل الاختبار السريع الخاطف ⚡ أم الألعاب التطابقية والتفاعلية 🎮؟
                  </p>
                </div>
              </div>

              {/* The Two Grand Masterpiece Challenge Mode Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto pt-2">
                {/* Mode 1: Quick Quiz (بركان الطاقة والسرعة ⚡) */}
                <button
                  type="button"
                  disabled={isActionLoading}
                  onMouseEnter={() => audioManager.playClick()}
                  onClick={() => {
                    audioManager.playPowerUp();
                    handleExperienceChange("quick-quiz");
                  }}
                  className="group relative text-right p-7 sm:p-9 rounded-[2.5rem] bg-gradient-to-b from-white via-amber-50/50 to-orange-50/30 border-3 border-amber-300/90 hover:border-amber-500 shadow-xl shadow-amber-500/10 hover:shadow-[0_28px_80px_rgba(245,158,11,0.28)] transition-all duration-500 hover:-translate-y-2.5 active:scale-[0.99] flex flex-col justify-between overflow-hidden disabled:opacity-50 cursor-pointer text-slate-800"
                >
                  {/* Subtle Background Glow Auras */}
                  <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl group-hover:scale-150 group-hover:bg-amber-400/30 transition-all duration-700 pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-orange-400/15 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700 pointer-events-none" />

                  {/* Specular Shimmer Sweep on Hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none skew-x-12" />

                  <div className="relative space-y-6 w-full">
                    {/* Top Header of Card */}
                    <div className="flex items-center justify-between gap-4">
                      {/* 3D Emblems with Glow */}
                      <div className="relative">
                        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-400 to-orange-500 opacity-40 blur-md group-hover:opacity-75 transition-opacity" />
                        <div className="relative h-18 w-18 sm:h-22 sm:w-22 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-xl shadow-amber-500/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ring-4 ring-amber-100 group-hover:ring-amber-300">
                          <Zap className="h-9 w-9 sm:h-11 sm:w-11 fill-white group-hover:animate-bounce" />
                        </div>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2 text-right">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                          اختبار سريع
                        </h3>
                        <span className="text-xs font-black text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                          10 أسئلة ذكية
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-500 leading-relaxed">
                        اختبار سريع وخاطف في أسئلة مجال {selectedDomain?.name || "المادة المختارة"} لقياس مستواك فورياً.
                      </p>
                    </div>
                  </div>

                  {/* 3D Chunky Action Button */}
                  <div className="relative mt-8 pt-5 border-t border-amber-200/80 w-full space-y-3">
                    <div className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 shadow-lg shadow-amber-500/35 group-hover:shadow-amber-500/55 group-hover:brightness-105 flex items-center justify-center gap-3 transition-all">
                      <Zap className="w-5 h-5 fill-white" />
                      <span>ابدأ الاختبار السريع الآن ⚡</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-black text-amber-800 px-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>جاهز للانطلاق المباشر</span>
                      </span>
                      <span>مدة الاختبار: 5-8 دقائق</span>
                    </div>
                  </div>
                </button>

                {/* Mode 2: Interactive Games (ساحة الألعاب والمغامرات 🎮) */}
                <button
                  type="button"
                  disabled={isActionLoading}
                  onMouseEnter={() => audioManager.playClick()}
                  onClick={() => {
                    audioManager.playPowerUp();
                    handleExperienceChange("interactive-games");
                  }}
                  className="group relative text-right p-7 sm:p-9 rounded-[2.5rem] bg-gradient-to-b from-white via-fuchsia-50/50 to-purple-50/30 border-3 border-fuchsia-300/90 hover:border-fuchsia-500 shadow-xl shadow-fuchsia-500/10 hover:shadow-[0_28px_80px_rgba(192,38,211,0.28)] transition-all duration-500 hover:-translate-y-2.5 active:scale-[0.99] flex flex-col justify-between overflow-hidden disabled:opacity-50 cursor-pointer text-slate-800"
                >
                  {/* Subtle Background Glow Auras */}
                  <div className="absolute -top-24 -left-24 w-72 h-72 bg-fuchsia-400/20 rounded-full blur-3xl group-hover:scale-150 group-hover:bg-fuchsia-400/30 transition-all duration-700 pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-400/15 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700 pointer-events-none" />

                  {/* Specular Shimmer Sweep on Hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none skew-x-12" />

                  <div className="relative space-y-6 w-full">
                    {/* Top Header of Card */}
                    <div className="flex items-center justify-between gap-4">
                      {/* 3D Emblems with Glow */}
                      <div className="relative">
                        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-fuchsia-500 to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity" />
                        <div className="relative h-18 w-18 sm:h-22 sm:w-22 rounded-3xl bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-xl shadow-fuchsia-500/40 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 ring-4 ring-fuchsia-100 group-hover:ring-fuchsia-300">
                          <Gamepad2 className="h-9 w-9 sm:h-11 sm:w-11 group-hover:animate-pulse" />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="flex items-center gap-2 text-xs font-black text-fuchsia-900 bg-fuchsia-100 border border-fuchsia-300/90 px-3.5 py-1.5 rounded-full shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping" />
                          <span>ألعاب تطابقية وتفاعلية 🎮</span>
                        </span>
                        <span className="text-[11px] font-black text-purple-700 bg-purple-100/90 border border-purple-200 px-3 py-1 rounded-full shadow-2xs">
                          5 ألعاب تفاعلية ومطابقة 🧩
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2 text-right">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-fuchsia-600 transition-colors">
                          ألعاب تطابقية وتفاعلية
                        </h3>
                        <span className="text-xs font-black text-fuchsia-700 bg-fuchsia-100/80 px-2.5 py-0.5 rounded-lg border border-fuchsia-200">
                          المطابقة والعجلة والكنز
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-500 leading-relaxed">
                        ادخل ساحة الألعاب العلمية لمجال {selectedDomain?.name || "المادة المختارة"} واستمتع بلعبة المطابقة وعجلة العلوم وباقي التحديات.
                      </p>
                    </div>
                  </div>

                  {/* 3D Chunky Action Button */}
                  <div className="relative mt-8 pt-5 border-t border-fuchsia-200/80 w-full space-y-3">
                    <div className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-fuchsia-500/35 group-hover:shadow-fuchsia-500/55 group-hover:brightness-105 flex items-center justify-center gap-3 transition-all">
                      <Gamepad2 className="w-5 h-5" />
                      <span>ادخل ساحة الألعاب التفاعلية 🎮</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-black text-fuchsia-800 px-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
                        <span>بوابة الألعاب مفتوحة</span>
                      </span>
                      <span>5 ألعاب شيقة بانتظارك</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Direct Domain Games Launchpad */}
              <div className="pt-2 max-w-5xl mx-auto space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      أو اختر اللعبة مباشرة في مجال {selectedDomain?.name || "العلوم"}:
                    </h3>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-black text-xs">
                    انطلاق فوري 🎯
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* Game 1: Matching Game */}
                  <button
                    type="button"
                    onClick={() => handleLaunchGame("/games/matching")}
                    className="group relative p-4 rounded-2xl bg-white hover:bg-violet-50/70 border-2 border-slate-200/80 hover:border-violet-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center gap-2.5 cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white flex items-center justify-center shadow-md shadow-violet-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Puzzle className="w-6 h-6" />
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-800 group-hover:text-violet-700">لعبة المطابقة</span>
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-100/70 px-2 py-0.5 rounded-full">مطابقة المفاهيم 🧩</span>
                  </button>

                  {/* Game 2: Wheel Game */}
                  <button
                    type="button"
                    onClick={() => handleLaunchGame("/games/wheel")}
                    className="group relative p-4 rounded-2xl bg-white hover:bg-rose-50/70 border-2 border-slate-200/80 hover:border-rose-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center gap-2.5 cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-800 group-hover:text-rose-700">عجلة العلوم</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-full">عجلة العلوم 🎡</span>
                  </button>

                  {/* Game 3: Speed Challenge */}
                  <button
                    type="button"
                    onClick={() => handleLaunchGame("/games/speed")}
                    className="group relative p-4 rounded-2xl bg-white hover:bg-amber-50/70 border-2 border-slate-200/80 hover:border-amber-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center gap-2.5 cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Timer className="w-6 h-6" />
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-800 group-hover:text-amber-700">تحدي السرعة</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-full">سرعة وخاطف ⚡</span>
                  </button>

                  {/* Game 4: Ordering Puzzle */}
                  <button
                    type="button"
                    onClick={() => handleLaunchGame("/games/ordering")}
                    className="group relative p-4 rounded-2xl bg-white hover:bg-blue-50/70 border-2 border-slate-200/80 hover:border-blue-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center gap-2.5 cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Target className="w-6 h-6" />
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-800 group-hover:text-blue-700">لغز الترتيب</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">ترتيب منطقي 🔄</span>
                  </button>

                  {/* Game 5: Treasure Adventure */}
                  <button
                    type="button"
                    onClick={() => handleLaunchGame("/games/treasure/active")}
                    className="group relative p-4 rounded-2xl bg-white hover:bg-emerald-50/70 border-2 border-slate-200/80 hover:border-emerald-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center gap-2.5 cursor-pointer col-span-2 sm:col-span-1"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Compass className="w-6 h-6" />
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-800 group-hover:text-emerald-700">مغامرة الكنز</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-full">فك الأقفال 🗝️</span>
                  </button>
                </div>
              </div>

              {/* Back Button with Modern Tactile Pill */}
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    audioManager.playClick();
                    handleBack();
                  }}
                  className="rounded-2xl border-2 border-slate-200/90 bg-white/95 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 h-12 px-6 font-black text-sm gap-2.5 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة لاختيار المجال العلمي</span>
                </Button>
              </div>
            </div>
          )}
          </main>
        </div>
      </div>
    </PremiumBackground>
  );
}
