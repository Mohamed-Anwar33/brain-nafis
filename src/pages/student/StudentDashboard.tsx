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
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import PremiumBackground from "@/components/ui/PremiumBackground";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { audioManager } from "@/lib/audio";
import { StudentPortalHub } from "@/components/student/StudentPortalHub";
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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { data: catalog, isLoading: isCatalogLoading } = useAcademicCatalog();

  const [isLoading, setIsLoading] = useState(true);
  const [studentName, setStudentName] = useState<string | null>(null);
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

        if (!session) {
          navigate("/");
          return;
        }

        const { data: profile } = await supabase
          .from("student_profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();

        if (profile?.full_name) {
          setStudentName(profile.full_name);
        }
      } catch (error) {
        console.error("Failed to bootstrap student dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [navigate]);

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

  // Apply per-track name overrides and filtering
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
      });
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
      if (selection.trackType === "nafis") {
        setSelection((curr) => ({ ...curr, domainId: "" }));
      } else {
        setExperienceType(null);
      }
    } else if (step === 2) {
      setStep(1);
      setExperienceType(null);
      setSelection((curr) => ({ ...curr, domainId: "" }));
    }
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

    if (selection.trackType === "nafis") {
      if (type === "interactive-games") {
        const context: SelectionContext = {
          trackType: "nafis",
          experienceType: "interactive-games",
          gradeId: resolvedGrade?.id || "8db3f874-aa52-4893-8d04-4eb6ef74f0af",
          gradeName: resolvedGrade?.name || "ثالث متوسط",
          subjectId: resolvedSubject?.id || "a79e5e49-5a5e-4ccd-9ac8-c5e9c37c788b",
          subjectName: resolvedSubject?.name || "علوم",
          gradeSubjectId: resolvedGsId,
          domainId: null,
          domainName: null,
        };
        saveSelectionContext(context);
        navigate("/student/games");
        return;
      }
      if (type === "quick-quiz") {
        // Move to step 3: Select Scientific Domain (folders)
        setStep(3);
        return;
      }
    }

    // Central track or other
    const context = buildSelectionContextExtended(selection.trackType, type) || {
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

    const matchedDomain = availableDomains.find((d) => d.id === domainId);
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

    if (selection.trackType === "nafis") {
      const context: SelectionContext = {
        trackType: "nafis",
        experienceType: "quick-quiz",
        gradeId: resolvedGrade?.id || "8db3f874-aa52-4893-8d04-4eb6ef74f0af",
        gradeName: resolvedGrade?.name || "ثالث متوسط",
        subjectId: resolvedSubject?.id || "a79e5e49-5a5e-4ccd-9ac8-c5e9c37c788b",
        subjectName: resolvedSubject?.name || "علوم",
        gradeSubjectId: resolvedGsId,
        domainId: domainId,
        domainName: matchedDomain?.name || null,
      };
      await executeStart(context);
      return;
    }

    // Central track moves to step 3 for challenge mode
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
    } catch (error) {
      console.error("Failed to start student flow", error);
      toast.error("حدث خطأ أثناء تجهيز التجربة");
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

    const orderedQuestions = ((allQuestionsData || []) as DashboardQuestionRow[]).slice(0, 10);

    if (!orderedQuestions || orderedQuestions.length === 0) {
      if (context.domainName) {
        toast.error(`لا توجد أسئلة مخصصة لتخصص "${context.domainName}" حالياً، يُرجى تصنيف الأسئلة من لوحة التحكم`);
      } else {
        toast.error("لا توجد أسئلة متاحة لهذا الصف والمادة حاليًا");
      }
      return;
    }

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

    const examQuestions = orderedQuestions.map((question, index: number) => ({
      id: question.id,
      text: question.text,
      image_url: question.image_url,
      wrong_reason: question.wrong_reason,
      explanation_url: question.explanation_url,
      stage_number: question.stage_number,
      order_index: index,
      choices: (question.choices || []).map((choice) => ({
        id: choice.id,
        text: choice.text,
        image_url: choice.image_url,
        is_correct: choice.is_correct,
      })),
    }));

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
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-2xl shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    audioManager.playClick();
                    handleBack();
                  }}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-sm"
                  title="العودة للخطوة السابقة"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}

              {/* School Logo */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 opacity-20 blur-sm group-hover:opacity-40 transition-opacity" />
                <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-200 overflow-hidden p-1.5">
                  <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-[10px] sm:text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
                    منصة براين ساينس للتفوق 🚀
                  </span>
                  <span className="hidden md:inline-flex text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    المتوسطة 82 • أ/ هيفا السلمي
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                    {studentName ? `أهلاً، ${studentName}` : "منصة براين ساينس"}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <SoundToggle />

              <Button
                variant="ghost"
                onClick={() => {
                  audioManager.playClick();
                  handleLogout();
                }}
                className="gap-2 rounded-2xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 h-10 sm:h-11 px-3 sm:px-4 font-bold border border-slate-200 text-xs sm:text-sm transition-all shadow-2xs"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline-block">خروج</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area: Expansive & Modern Layout */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
          {/* Gamified Quest Adventure Stepper */}
          <div className="flex items-center justify-center mb-8 sm:mb-12 select-none px-2">
            <div className="relative flex items-center gap-2 sm:gap-4 p-2 sm:p-2.5 rounded-[2rem] bg-white/90 backdrop-blur-2xl border-2 border-indigo-100/90 shadow-xl shadow-indigo-500/5 max-w-2xl w-full justify-between sm:justify-center">
              {/* Step 1: Educational Track */}
              <button
                type="button"
                onClick={() => {
                  if (step > 1) {
                    audioManager.playClick();
                    setStep(1);
                  }
                }}
                className={`relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                  step === 1
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 scale-105 ring-4 ring-indigo-100"
                    : step > 1
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:scale-102"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                  step === 1
                    ? "bg-white/25 text-white"
                    : step > 1
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
                </span>
                <span className="hidden sm:inline">المسار التعليمي</span>
                <span className="sm:hidden">المسار</span>
                {step === 1 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
                  </span>
                )}
              </button>

              {/* Connecting Shimmer Bar 1 */}
              <div className={`h-1.5 flex-1 max-w-[2.5rem] sm:max-w-[4rem] rounded-full transition-all duration-700 overflow-hidden relative ${
                step >= 2 ? "bg-gradient-to-r from-emerald-500 to-indigo-600" : "bg-slate-200"
              }`}>
                {step >= 2 && <div className="absolute inset-0 bg-white/40 animate-[shimmerSweep_2s_infinite]" />}
              </div>

              {/* Step 2: Challenge Type OR Scientific Domain */}
              <button
                type="button"
                disabled={step < 2}
                onClick={() => {
                  if (step > 2) {
                    audioManager.playClick();
                    setStep(2);
                  }
                }}
                className={`relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                  step === 2
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-lg shadow-amber-500/30 scale-105 ring-4 ring-amber-100"
                    : step > 2
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:scale-102"
                    : "text-slate-400 opacity-60 cursor-not-allowed"
                }`}
              >
                <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                  step === 2
                    ? "bg-white/25 text-white"
                    : step > 2
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
                </span>
                <span className="hidden sm:inline">{selection.trackType === "central" ? "التخصص العلمي" : "نوع التحدي"}</span>
                <span className="sm:hidden">{selection.trackType === "central" ? "التخصص" : "التحدي"}</span>
                {step === 2 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                )}
              </button>

              {/* Connecting Shimmer Bar 2 */}
              <div className={`h-1.5 flex-1 max-w-[2.5rem] sm:max-w-[4rem] rounded-full transition-all duration-700 overflow-hidden relative ${
                step >= 3 ? "bg-gradient-to-r from-orange-500 to-purple-600" : "bg-slate-200"
              }`}>
                {step >= 3 && <div className="absolute inset-0 bg-white/40 animate-[shimmerSweep_2s_infinite]" />}
              </div>

              {/* Step 3: Scientific Domain OR Mode */}
              <div
                className={`relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                  step === 3
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 scale-105 ring-4 ring-purple-100"
                    : "text-slate-400 opacity-60"
                }`}
              >
                <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                  step === 3 ? "bg-white/25 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  3
                </span>
                <span className="hidden sm:inline">{selection.trackType === "central" ? "نمط التحدي" : "التخصص العلمي"}</span>
                <span className="sm:hidden">{selection.trackType === "central" ? "النمط" : "التخصص"}</span>
                {step === 3 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                )}
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
                        تحديات علمية مقننة في مجالات دقيقة: الكيمياء، الفيزياء، الأحياء، علوم الأرض والفضاء، الكهرباء والمغناطيسية، وطبيعة العلم لقياس الفهم المعياري.
                      </p>
                    </div>

                    {/* Domain Pills Preview */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-xl bg-purple-50 group-hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black transition-colors shadow-2xs">
                        🧪 كيمياء
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-black transition-colors shadow-2xs">
                        ⚛️ فيزياء
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition-colors shadow-2xs">
                        🧬 أحياء
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

              {/* Excellence & Motivation Hub (Leaderboard, Achievements, Progress, Certificates) */}
              <div className="pt-10 sm:pt-14 border-t border-slate-200/80">
                <div className="flex items-center justify-center gap-3 mb-6 select-none">
                  <div className="h-px w-12 sm:w-24 bg-gradient-to-r from-transparent to-indigo-300" />
                  <span className="text-xs sm:text-sm font-black text-slate-500 tracking-wide flex items-center gap-1.5 bg-white/80 px-4 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>لوحة الشرف والإنجازات الشخصية</span>
                  </span>
                  <div className="h-px w-12 sm:w-24 bg-gradient-to-l from-transparent to-indigo-300" />
                </div>
                <StudentPortalHub studentName={studentName} className="mt-0 pt-0 border-t-0" />
              </div>
            </div>
          )}

          {/* Step: Specializations / Domains (Central Exam Step 2 OR Nafis Quick Quiz Step 3) */}
          {((step === 2 && selection.trackType === "central") || (step === 3 && selection.trackType === "nafis")) && (
            <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500 relative">
              {/* Domain Step Hero Banner */}
              <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
                <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/90 text-indigo-800 text-xs sm:text-sm font-black shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>
                    {selection.trackType === "nafis"
                      ? "مسار بنك نافس • مجلدات المواد والتخصصات العلمية 🇸🇦"
                      : "المسار المركزي • 6 مجالات علمية متخصصة 🎯"}
                  </span>
                  <span className="text-indigo-300">|</span>
                  <span className="text-emerald-600 font-extrabold">اختر وانطلق 🚀</span>
                </div>

                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                  اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-600">التخصص العلمي</span>
                </h2>

                <p className="text-sm sm:text-base font-bold text-slate-600 max-w-xl mx-auto leading-relaxed bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                  {selection.trackType === "nafis"
                    ? "يا بطلنا المتميز! اختر مجالك العلمي المفضل لخوض الاختبار السريع وحصد النقاط والشهادات 🌟"
                    : "بطلنا المتميز! حدد المجال العلمي الذي ترغب في اكتساحه اليوم بتفوق وثقة"}
                </p>
              </div>

              {/* Expansive 3-Column Grid for Domains */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
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
                        className={`group relative text-right p-7 sm:p-8 rounded-[2.5rem] bg-gradient-to-b ${meta.gradient} border-2 border-slate-200/90 shadow-lg hover:shadow-[0_26px_75px_rgba(79,70,229,0.22)] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between overflow-hidden cursor-pointer ${meta.borderHover}`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        {/* Ambient Glow Aura */}
                        <div className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-50 group-hover:opacity-90 group-hover:scale-150 transition-all duration-700 pointer-events-none ${meta.glowBg}`} />

                        {/* Specular Shimmer Sweep on Hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none skew-x-12" />

                        <div className="relative space-y-5">
                          {/* Top: Icon + Gamified Badges */}
                          <div className="flex items-center justify-between gap-3">
                            <div className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl transition-all duration-500 ${meta.iconBg}`}>
                              <DomainIcon className="h-8 w-8 sm:h-10 sm:w-10 transition-transform group-hover:scale-115 group-hover:rotate-6 duration-500" />
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-3xl filter drop-shadow-sm group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-300 select-none">
                                {meta.emoji}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-[11px] font-black border shadow-2xs ${meta.chipStyle}`}>
                                جاهز للتحدي 🌟
                              </span>
                            </div>
                          </div>

                          {/* Title & Tagline & Description */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {domain.name}
                              </h3>
                            </div>
                            <p className="text-xs font-black text-indigo-600/90">
                              {meta.tagline}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-bold">
                              {meta.desc}
                            </p>
                          </div>

                          {/* Kid-friendly feature pills */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="px-2.5 py-1 rounded-xl bg-white/90 text-slate-700 border border-slate-200/80 text-[11px] font-black shadow-2xs">
                              ⭐ 10 أسئلة ذكية
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white/90 text-slate-700 border border-slate-200/80 text-[11px] font-black shadow-2xs">
                              ⚡ تصحيح فوري
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white/90 text-slate-700 border border-slate-200/80 text-[11px] font-black shadow-2xs">
                              🏆 نقاط وأوسمة
                            </span>
                          </div>
                        </div>

                        {/* Action Footer CTA with vibrant button */}
                        <div className="relative mt-7 pt-4 border-t border-slate-200/70 flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-slate-500">
                            مجلد علمي مقنن
                          </span>
                          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-300 group-hover:shadow-lg ${meta.buttonStyle}`}>
                            <span>انطلق للاختبار</span>
                            <span className="text-base group-hover:-translate-x-1.5 transition-transform duration-300">🚀</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center bg-white/80 rounded-3xl border border-slate-200">
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
                  <span>{selection.trackType === "nafis" ? "العودة لاختيار نوع التحدي" : "العودة لاختيار المسار التعليمي"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Step: Challenge Mode Selection (Nafis Step 2 OR Central Exam Step 3) */}
          {((step === 2 && selection.trackType === "nafis") || (step === 3 && selection.trackType === "central")) && (
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
                <span className="text-xs font-black">4 ألعاب ومغامرة الكنز 🗝️</span>
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
                    {selection.trackType === "central" && selectedDomain
                      ? `المسار المركزي 🎯 • التخصص: ${selectedDomain.name}`
                      : "مسار بنك اختبارات نافس الوطني 🇸🇦"}
                  </span>
                </div>

                {/* Main 3D Title with Vibrancy */}
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                    اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 filter drop-shadow-xs">نوع التحدي</span>
                  </h2>
                  <p className="text-sm sm:text-base font-bold text-slate-600 max-w-xl mx-auto leading-relaxed bg-white/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    يا بطلنا الذكي! 🌟 اختر طريقتك المفضلة اليوم: هل تفضل الاختبار السريع الخاطف ⚡ أم الانطلاق في ساحة الألعاب والمغامرات التفاعلية 🎮؟
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
                    </div>
                  </div>

                  {/* 3D Chunky Action Button */}
                  <div className="relative mt-8 pt-5 border-t border-amber-200/80 w-full space-y-3">
                    <div className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 shadow-lg shadow-amber-500/35 group-hover:shadow-amber-500/55 group-hover:brightness-105 flex items-center justify-center gap-3 transition-all">
                      <Zap className="w-5 h-5 fill-white" />
                      <span>{selection.trackType === "nafis" ? "اختر التخصص وابدأ الاختبار ⚡" : "ابدأ الاختبار السريع الآن ⚡"}</span>
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
                          <span>ساحة الألعاب 🎮</span>
                        </span>
                        <span className="text-[11px] font-black text-purple-700 bg-purple-100/90 border border-purple-200 px-3 py-1 rounded-full shadow-2xs">
                          4 ألعاب تفاعلية 🗝️
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2 text-right">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-fuchsia-600 transition-colors">
                          ألعاب تفاعلية
                        </h3>
                        <span className="text-xs font-black text-fuchsia-700 bg-fuchsia-100/80 px-2.5 py-0.5 rounded-lg border border-fuchsia-200">
                          تلعيب ومغامرة
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3D Chunky Action Button */}
                  <div className="relative mt-8 pt-5 border-t border-fuchsia-200/80 w-full space-y-3">
                    <div className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-fuchsia-500/35 group-hover:shadow-fuchsia-500/55 group-hover:brightness-105 flex items-center justify-center gap-3 transition-all">
                      <Gamepad2 className="w-5 h-5" />
                      <span>ادخل ساحة الألعاب والمغامرة 🎮</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-black text-fuchsia-800 px-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
                        <span>بوابة الألعاب مفتوحة</span>
                      </span>
                      <span>4 ألعاب شيقة بانتظارك</span>
                    </div>
                  </div>
                </button>
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
                  <span>{selection.trackType === "nafis" ? "العودة لاختيار المسار التعليمي" : "العودة لاختيار التخصص"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Academic Context Status Pill */}
          {currentContext && (
            <div className="max-w-xl mx-auto mt-12 p-3.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black text-slate-700">
                  {getSelectionDisplayText(currentContext)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                المتوسطة 82 • أ/ هيفا السلمي
              </span>
            </div>
          )}
        </main>
      </div>
    </PremiumBackground>
  );
}
