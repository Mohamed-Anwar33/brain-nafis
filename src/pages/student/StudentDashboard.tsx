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
  Leaf
} from "lucide-react";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import PremiumBackground from "@/components/ui/PremiumBackground";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";
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
      icon: Dna,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
      borderHover: "hover:border-emerald-400 hover:shadow-[0_20px_60px_rgba(16,185,129,0.18)]",
      desc: "استكشف أسرار الكائنات الحية والبيولوجيا بتشويق وتفوق"
    };
  }
  if (s.includes("earth") || s.includes("space") || n.includes("أرض") || n.includes("فضاء") || n.includes("ارض")) {
    return {
      icon: Globe,
      color: "text-cyan-600",
      iconBg: "bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white",
      borderHover: "hover:border-cyan-400 hover:shadow-[0_20px_60px_rgba(6,182,212,0.18)]",
      desc: "انطلق في رحلة علوم كوكب الأرض وغلافه الجوي والفضاء الشاسع"
    };
  }
  if (s.includes("chem") || n.includes("كيمياء")) {
    return {
      icon: FlaskConical,
      color: "text-purple-600",
      iconBg: "bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white",
      borderHover: "hover:border-purple-400 hover:shadow-[0_20px_60px_rgba(147,51,234,0.18)]",
      desc: "تفاعل مع عالم الذرات والجزيئات والتفاعلات الكيميائية المبهرة"
    };
  }
  if (s.includes("phys") || n.includes("فيزياء")) {
    return {
      icon: Atom,
      color: "text-blue-600",
      iconBg: "bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white",
      borderHover: "hover:border-blue-400 hover:shadow-[0_20px_60px_rgba(59,130,246,0.18)]",
      desc: "اكتشف قوانين الحركة والطاقة والمادة في عالم الفيزياء الممتع"
    };
  }
  if (s.includes("elec") || n.includes("كهرباء")) {
    return {
      icon: Zap,
      color: "text-amber-600",
      iconBg: "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white",
      borderHover: "hover:border-amber-400 hover:shadow-[0_20px_60px_rgba(245,158,11,0.18)]",
      desc: "تعرف على الدوائر الكهربائية والتيارات والقدرة بذكاء واحتراف"
    };
  }
  return {
    icon: Target,
    color: "text-indigo-600",
    iconBg: "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
    borderHover: "hover:border-indigo-400 hover:shadow-[0_20px_60px_rgba(99,102,241,0.18)]",
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

  const selectedGrade = grades.find((grade) => grade.id === selection.gradeId);
  const selectedSubject = availableSubjects.find(
    (subject) => subject.id === selection.subjectId,
  );
  const selectedDomain = availableDomains.find(
    (domain) => domain.id === selection.domainId,
  );

  const handleTrackChange = async (trackType: TrackType) => {
    setSelection((current) => ({
      ...current,
      trackType,
      domainId: trackType === "central" ? current.domainId : "",
    }));

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
      if (selection.trackType === "central") {
        setSelection(curr => ({ ...curr, domainId: "" }));
      }
    }
  };

  const handleExperienceChange = async (type: ExperienceType) => {
    setExperienceType(type);

    // Auto-start if track (and domain for central) is already selected
    const context = buildSelectionContextExtended(selection.trackType, type);
    if (context) {
      await executeStart(context);
    }
  };

  const handleDomainSelection = (domainId: string) => {
    handleDomainChange(domainId);
    setStep(3);
  };

  const buildSelectionContextExtended = (track: TrackType, exp: ExperienceType): SelectionContext | null => {
    if (!selectedGrade || !selectedSubject || !selection.gradeSubjectId) {
      return null;
    }

    if (track === "central" && !selectedDomain) {
      return null;
    }

    return {
      trackType: track,
      experienceType: exp,
      gradeId: selectedGrade.id,
      gradeName: selectedGrade.name,
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      gradeSubjectId: selection.gradeSubjectId,
      domainId: track === "central" ? selectedDomain?.id || null : null,
      domainName: track === "central" ? selectedDomain?.name || null : null,
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

  // Auto-selection logic for single availability
  useEffect(() => {
    if (grades.length === 1 && !selection.gradeId) {
      handleGradeChange(grades[0].id);
    }
  }, [grades, selection.gradeId]);

  useEffect(() => {
    if (
      availableSubjects.length === 1 &&
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
      domainId:
        selection.trackType === "central" ? selectedDomain?.id || null : null,
      domainName:
        selection.trackType === "central"
          ? selectedDomain?.name || null
          : null,
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

    const orderedQuestions = (allQuestionsData || []) as DashboardQuestionRow[];

    if (!orderedQuestions || orderedQuestions.length === 0) {
      toast.error("لا توجد أسئلة متاحة لهذا الصف والمادة حاليًا");
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
      <div className="min-h-screen" dir="rtl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/60 backdrop-blur-3xl">
          <div className="container mx-auto flex items-center justify-between px-6 py-5">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                {step > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-12 w-12 rounded-2xl text-slate-500 hover:bg-slate-100"
                    title="العودة للخطوة السابقة"
                  >
                    <ChevronRight className="h-7 w-7" />
                  </Button>
                )}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-200 overflow-hidden p-1">
                  <img src="/logo.jpg" alt="SCIRISE Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md tracking-wider">SCIRISE</span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                      {studentName ? `أهلًا ${studentName}` : "منصة SCIRISE"}
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold mt-0.5">
                    {step === 1 ? "اختر المسار التعليمي" : step === 2 && selection.trackType === 'central' ? "اختر التخصص" : "اختر نوع التحدي"}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="gap-3 rounded-2xl text-slate-600 hover:bg-slate-100 h-12 px-6 font-bold border border-slate-200"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <Card className="border-0 bg-white/60 backdrop-blur-[40px] p-6 sm:p-10 md:p-14 shadow-[0_32px_128px_-12px_rgba(0,0,0,0.08)] rounded-[2.5rem] md:rounded-[3.5rem] border border-white/80">
              {/* Step Progress Tracker */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 max-w-lg mx-auto select-none">
                <div className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-black transition-all ${step === 1 ? "bg-[#1e3a8a] text-white shadow-lg shadow-blue-900/20 scale-105" : "bg-white/90 text-slate-600 border border-slate-200"
                  }`}>
                  <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs">1</span>
                  <span>المسار</span>
                </div>

                <div className={`h-1 w-6 sm:w-10 rounded-full transition-all duration-500 ${step >= 2 ? "bg-[#1e3a8a]" : "bg-slate-200"}`} />

                <div className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-black transition-all ${step === 2 ? "bg-[#1e3a8a] text-white shadow-lg shadow-blue-900/20 scale-105" : "bg-white/90 text-slate-600 border border-slate-200"
                  }`}>
                  <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs">2</span>
                  <span>{selection.trackType === 'central' ? "التخصص" : "نوع التحدي"}</span>
                </div>

                {selection.trackType === 'central' && (
                  <>
                    <div className={`h-1 w-6 sm:w-10 rounded-full transition-all duration-500 ${step >= 3 ? "bg-[#1e3a8a]" : "bg-slate-200"}`} />

                    <div className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-black transition-all ${step === 3 ? "bg-[#1e3a8a] text-white shadow-lg shadow-blue-900/20 scale-105" : "bg-white/90 text-slate-600 border border-slate-200"
                      }`}>
                      <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs">3</span>
                      <span>التحدي</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-8">
                {step === 1 ? (
                  <>
                    <div className="text-center space-y-4 sm:space-y-6 mb-10 sm:mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                      {/* SCIRISE Header Banner - Blended Seamlessly with Background */}
                      <div className="relative max-w-lg mx-auto flex items-center justify-center mb-4 group">
                        {/* Organic circular soft aura behind the logo */}
                        <div className="absolute inset-0 m-auto w-64 sm:w-80 h-36 sm:h-44 bg-gradient-to-tr from-sky-400/20 via-indigo-400/20 to-purple-400/15 rounded-full blur-2xl pointer-events-none -z-10" />
                        
                        {/* Logo image blended smoothly into the background without cutting off details */}
                        <div
                          className="relative w-full overflow-hidden flex items-center justify-center"
                          style={{
                            WebkitMaskImage: "radial-gradient(ellipse 92% 88% at 50% 50%, black 70%, transparent 100%)",
                            maskImage: "radial-gradient(ellipse 92% 88% at 50% 50%, black 70%, transparent 100%)",
                          }}
                        >
                          <img
                            src="/logo.jpg"
                            alt="SCIRISE"
                            className="w-full h-auto max-h-40 sm:max-h-52 object-contain mx-auto mix-blend-multiply transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-black tracking-widest text-[#1e3a8a]">
                        <span>تعلمي</span>
                        <span>•</span>
                        <span>تدربي</span>
                        <span>•</span>
                        <span>ارتقي</span>
                        <span className="text-slate-300 mx-1">|</span>
                        <span className="text-slate-500 font-bold tracking-wider">LEARN • PRACTICE • RISE</span>
                      </div>

                      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 border border-indigo-100 shadow-sm">
                        <p className="text-xs sm:text-base md:text-lg font-bold text-slate-800 leading-relaxed">
                          منصة تعليمية تفاعلية لتنمية المهارات العلمية ورفع نواتج التعلم والاستعداد للاختبارات الوطنية ( نافس ) والمركزية
                        </p>
                      </div>

                      <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight pt-2">
                        اختر <span className="text-indigo-600">تحديك العلمي</span>
                      </h2>
                    </div>

                    <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
                      {/* Central Exam */}
                      <button
                        type="button"
                        onClick={() => handleTrackChange("central")}
                        className="group relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] border-4 border-slate-100 bg-white/80 p-6 sm:p-10 text-right transition-all duration-500 hover:border-indigo-500 hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)] hover:scale-[1.05] active:scale-95 shadow-sm"
                      >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative">
                          <div className="mb-6 sm:mb-8 flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-[1.25rem] sm:rounded-[2rem] bg-indigo-600 text-white group-hover:rotate-[360deg] transition-all duration-700 shadow-xl shadow-indigo-500/30">
                            <Target className="h-8 w-8 sm:h-12 sm:w-12" />
                          </div>
                          <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">الاختبار المركزي</h3>
                          <p className="text-base sm:text-lg text-slate-500 leading-relaxed font-bold">
                            أثبت قوتك العلمية في تخصصات دقيقة وشاملة وممتعة
                          </p>
                          <div className="mt-8 sm:mt-10 flex items-center justify-between">
                            <div className="flex items-center text-indigo-600 font-black text-lg sm:text-xl">
                              <span>انطلق للاكتساح</span>
                              <span className="mr-3 group-hover:translate-x-[-12px] transition-transform duration-300">←</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Nafis */}
                      <button
                        type="button"
                        onClick={() => handleTrackChange("nafis")}
                        className="group relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] border-4 border-slate-100 bg-white/80 p-6 sm:p-10 text-right transition-all duration-500 hover:border-emerald-500 hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)] hover:scale-[1.05] active:scale-95 shadow-sm"
                      >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative">
                          <div className="mb-6 sm:mb-8 flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-[1.25rem] sm:rounded-[2rem] bg-emerald-500 text-white group-hover:rotate-[360deg] transition-all duration-700 shadow-xl shadow-emerald-500/30">
                            <Zap className="h-8 w-8 sm:h-12 sm:w-12" />
                          </div>
                          <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">بنك نافس</h3>
                          <p className="text-base sm:text-lg text-slate-500 leading-relaxed font-bold">
                            تعلم بذكاء من خلال ألعاب وتحديات تفاعلية مشوقة جداً
                          </p>
                          <div className="mt-8 sm:mt-10 flex items-center justify-between">
                            <div className="flex items-center text-emerald-600 font-black text-lg sm:text-xl">
                              <span>ابدأ المغامرة</span>
                              <span className="mr-3 group-hover:translate-x-[-12px] transition-transform duration-300">←</span>
                            </div>
                          </div>
                        </div>
                      </button>

                    </div>
                  </>
                ) : step === 2 && selection.trackType === "central" ? (
                  <>
                    <div className="text-center space-y-6 sm:space-y-8 mb-12 sm:mb-20 animate-in fade-in slide-in-from-top-10 duration-1000">
                      <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
                        <Target className="h-10 w-10 sm:h-14 sm:w-14 animate-bounce" />
                      </div>
                      <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
                        اختر التخصص
                      </h2>
                      <p className="text-slate-600 text-lg sm:text-2xl max-w-2xl mx-auto leading-relaxed font-semibold">
                        بطل! حدد المجال العلمي الذي ترغب في اكتساحه اليوم بتفاؤل
                      </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                      {availableDomains.length > 0 ? (
                        availableDomains.map((domain, idx) => {
                          const meta = getDomainMeta(domain.slug, domain.name);
                          const DomainIcon = meta.icon;
                          return (
                            <button
                              key={domain.id}
                              type="button"
                              onClick={() => handleDomainSelection(domain.id)}
                              className={`group relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border-4 p-6 sm:p-10 text-right transition-all duration-500 shadow-sm border-slate-100 bg-white/80 ${meta.borderHover} hover:scale-[1.05] active:scale-95`}
                              style={{ animationDelay: `${idx * 100}ms` }}
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700" />
                              <div className="relative">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                  <div className={`flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-2xl transition-all duration-500 shadow-md ${meta.iconBg}`}>
                                    <DomainIcon className="h-7 w-7 sm:h-9 sm:w-9 transition-transform group-hover:rotate-12 duration-500" />
                                  </div>
                                  <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    متاح للاختبار ✓
                                  </span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                                  {domain.name}
                                </h3>
                                <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-bold">
                                  {meta.desc}
                                </p>
                                <div className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                  <span>دخول التحدي</span>
                                  <span className="group-hover:translate-x-[-6px] transition-transform">←</span>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-40 text-center">
                          <p className="text-4xl font-black text-slate-400">لا توجد تخصصات متاحة الآن</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-20 flex justify-center">
                      <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="text-slate-500 hover:text-indigo-600 gap-3 sm:gap-4 text-lg sm:text-2xl font-black px-8 sm:px-12 h-12 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] hover:bg-white/10 transition-all border border-slate-200"
                      >
                        <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
                        العودة للمسارات
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-8 sm:space-y-12 mb-12 sm:mb-20 animate-in zoom-in duration-1000">
                      <div className="inline-flex items-center justify-center w-24 h-24 sm:w-36 sm:h-36 rounded-[2.5rem] sm:rounded-[3.5rem] bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-4 sm:mb-6 shadow-[0_15px_40px_rgba(245,158,11,0.3)]">
                        <Gamepad2 className="h-12 w-12 sm:h-18 sm:w-18 animate-pulse text-white" />
                      </div>
                      <h2 className="text-3xl sm:text-6xl md:text-8xl font-black text-slate-900 tracking-tight">
                        اختر <span className="text-amber-500">نوع التحدي</span>
                      </h2>
                      <div className="bg-white/60 inline-block px-8 sm:px-14 py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 backdrop-blur-3xl shadow-xl">
                        <p className="text-slate-600 text-xl sm:text-3xl font-bold">
                          {selection.trackType === 'central' && selectedDomain ? (
                            <>المجال: <span className="font-black text-indigo-600 text-2xl sm:text-4xl">{selectedDomain.name}</span></>
                          ) : (
                            <>المسار: <span className="font-black text-emerald-600 text-2xl sm:text-4xl">{selection.trackType === 'nafis' ? 'نافس' : 'الاختبار المركزي'}</span></>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-10 md:grid-cols-2">
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleExperienceChange("quick-quiz")}
                        className="group relative overflow-hidden rounded-[2.5rem] sm:rounded-[4rem] border-4 border-slate-100 bg-white/80 p-8 sm:p-14 text-right transition-all duration-500 hover:border-amber-400 hover:shadow-[0_20px_80px_rgba(245,158,11,0.15)] hover:scale-[1.05] disabled:opacity-50 shadow-sm"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                          <div className="mb-6 sm:mb-10 flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-[1.5rem] sm:rounded-[2.5rem] bg-amber-500 text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-amber-500/30">
                            <Zap className="h-10 w-10 sm:h-14 sm:w-14" />
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mb-4 sm:mb-6 tracking-tight">
                            اختبار سريع
                          </h3>
                          <p className="text-lg sm:text-2xl text-slate-500 leading-relaxed font-bold">
                            أسئلة سريعة ومنوعة لقياس مستواك العلمي بطريقة ممتعة
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleExperienceChange("interactive-games")}
                        className="group relative overflow-hidden rounded-[2.5rem] sm:rounded-[4rem] border-4 border-slate-100 bg-white/80 p-8 sm:p-14 text-right transition-all duration-500 hover:border-fuchsia-400 hover:shadow-[0_20px_80px_rgba(192,38,211,0.15)] hover:scale-[1.05] disabled:opacity-50 shadow-sm"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                          <div className="mb-6 sm:mb-10 flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-[1.5rem] sm:rounded-[2.5rem] bg-fuchsia-600 text-white group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 shadow-xl shadow-fuchsia-500/30">
                            <Gamepad2 className="h-10 w-10 sm:h-14 sm:w-14" />
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mb-4 sm:mb-6 tracking-tight">
                            ألعاب تفاعلية
                          </h3>
                          <p className="text-lg sm:text-2xl text-slate-500 leading-relaxed font-bold">
                            تعلم واستمتع من خلال مجموعة من الألعاب التعليمية المشوقة
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="mt-12 sm:mt-24 flex justify-center">
                      <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="text-slate-500 hover:text-slate-900 gap-3 sm:gap-5 text-xl sm:text-3xl font-black px-10 sm:px-14 h-14 sm:h-20 rounded-[1.5rem] sm:rounded-[2.5rem] hover:bg-slate-100 transition-all border border-slate-200"
                      >
                        <ArrowRight className="h-7 w-7 sm:h-10 sm:w-10" />
                        العودة للخلف
                      </Button>
                    </div>
                  </>
                )}

                {currentContext && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-sm font-bold text-emerald-800">جاهز للبدء</p>
                    </div>
                    <p className="text-sm text-emerald-600 leading-relaxed">
                      {getSelectionDisplayText(currentContext)}
                    </p>
                  </div>
                )}


              </div>
            </Card>
          </div>
        </main>
      </div>
    </PremiumBackground>
  );
}
