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
  ArrowRight
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

    const { data: setting } = await supabase
      .from("settings")
      .select("exam_question_count")
      .eq("id", 1)
      .maybeSingle();

    const limitCount = setting?.exam_question_count || 10;

    const scopedIdsQuery = applySelectionFilters(
      supabase.from("questions").select("id").eq("active", true),
      context,
    );
    const { data: allQuestions, error: questionsError } = await scopedIdsQuery;

    if (questionsError) {
      throw questionsError;
    }

    if (!allQuestions || allQuestions.length === 0) {
      toast.error("لا توجد أسئلة متاحة لهذا الصف والمادة حاليًا");
      return;
    }

    if (allQuestions.length < limitCount) {
      toast.error(
        `عدد الأسئلة المتاح أقل من المطلوب. المطلوب ${limitCount} والمتاح ${allQuestions.length}`,
      );
      return;
    }

    const seenIds = await getScopedHistoryIds(session.user.id, "exam", context);
    let availableQuestions = allQuestions.filter((question) => !seenIds.has(question.id));

    if (availableQuestions.length < limitCount) {
      await resetScopedHistory(session.user.id, "exam", context);
      availableQuestions = allQuestions;
    }

    const shuffled = [...availableQuestions];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    const selectedQuestionIds = shuffled.slice(0, limitCount).map((item) => item.id);

    const scopedQuestionsQuery = applySelectionFilters(
      supabase
        .from("questions")
        .select("*, choices(*)")
        .in("id", selectedQuestionIds),
      context,
    );
    const { data: selectedQuestionsData, error: fullDataError } =
      await scopedQuestionsQuery;

    if (fullDataError) {
      throw fullDataError;
    }

    const selectedQuestions = (selectedQuestionsData ||
      []) as DashboardQuestionRow[];
    const questionMap = new Map(
      selectedQuestions.map((question) => [question.id, question]),
    );
    const orderedQuestions = selectedQuestionIds
      .map((id) => questionMap.get(id))
      .filter(
        (question): question is DashboardQuestionRow => question !== undefined,
      );

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
      selectedQuestionIds,
      context,
    );

    const examQuestions = orderedQuestions.map((question, index: number) => ({
      id: question.id,
      text: question.text,
      image_url: question.image_url,
      wrong_reason: question.wrong_reason,
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.2)]">
                <Brain className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  {studentName ? `أهلًا ${studentName}` : "لوحة الطالب"}
                </h1>
                <p className="text-base text-slate-500 font-medium">
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

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="border-0 bg-white/40 backdrop-blur-[40px] p-10 md:p-16 shadow-[0_32px_128px_-12px_rgba(0,0,0,0.08)] rounded-[4rem] border border-white/60">
            <div className="space-y-8">
              {step === 1 ? (
                <>
                  <div className="text-center space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="inline-flex items-center justify-center w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white mb-4 shadow-[0_15px_40px_rgba(251,191,36,0.4)] animate-bounce duration-[3s]">
                      <Zap className="h-14 w-14" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-tight">
                      اختر <span className="text-indigo-600">تحديك الجبار</span>
                    </h2>
                    <p className="text-slate-600 text-2xl max-w-2xl mx-auto leading-relaxed font-semibold">
                      مرحباً بك في عالم المعرفة! اختر المسار المفعم بالحيوية اليوم
                    </p>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    {/* Central Exam */}
                    <button
                      type="button"
                      onClick={() => handleTrackChange("central")}
                      className="group relative overflow-hidden rounded-[3rem] border-4 border-slate-100 bg-white/80 p-10 text-right transition-all duration-500 hover:border-indigo-500 hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)] hover:scale-[1.05] active:scale-95 shadow-sm"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                      <div className="relative">
                        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-indigo-600 text-white group-hover:rotate-[360deg] transition-all duration-700 shadow-xl shadow-indigo-500/30">
                          <Target className="h-12 w-12" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">الاختبار المركزي</h3>
                        <p className="text-lg text-slate-500 leading-relaxed font-bold">
                          أثبت قوتك العلمية في تخصصات دقيقة وشاملة وممتعة
                        </p>
                        <div className="mt-10 flex items-center justify-between">
                          <div className="flex items-center text-indigo-600 font-black text-xl">
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
                      className="group relative overflow-hidden rounded-[3rem] border-4 border-slate-100 bg-white/80 p-10 text-right transition-all duration-500 hover:border-emerald-500 hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)] hover:scale-[1.05] active:scale-95 shadow-sm"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                      <div className="relative">
                        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-500 text-white group-hover:rotate-[360deg] transition-all duration-700 shadow-xl shadow-emerald-500/30">
                          <Zap className="h-12 w-12" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">بنك نافس</h3>
                        <p className="text-lg text-slate-500 leading-relaxed font-bold">
                          تعلم بذكاء من خلال ألعاب وتحديات تفاعلية مشوقة جداً
                        </p>
                        <div className="mt-10 flex items-center justify-between">
                          <div className="flex items-center text-emerald-600 font-black text-xl">
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
                  <div className="text-center space-y-8 mb-20 animate-in fade-in slide-in-from-top-10 duration-1000">
                    <div className="inline-flex items-center justify-center w-28 h-28 rounded-[2.5rem] bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
                      <Target className="h-14 w-14 animate-bounce" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
                      اختر التخصص
                    </h2>
                    <p className="text-slate-600 text-2xl max-w-2xl mx-auto leading-relaxed font-semibold">
                      بطل! حدد المجال العلمي الذي ترغب في اكتساحه اليوم بتفاؤل
                    </p>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    {availableDomains.length > 0 ? (
                      availableDomains.map((domain, idx) => (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => handleDomainSelection(domain.id)}
                          className="group relative overflow-hidden rounded-[2.5rem] border-4 border-slate-100 bg-white/80 p-10 text-right transition-all duration-500 hover:border-indigo-400 hover:shadow-[0_20px_60px_rgba(99,102,241,0.15)] hover:scale-[1.05] shadow-sm"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform" />
                          <div className="relative">
                            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-md">
                              <Target className="h-10 w-10" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-4">
                              {domain.name}
                            </h3>
                            <p className="text-slate-500 text-lg leading-relaxed font-bold">
                              أثبت جدارتك في هذا المجال العلمي المتميز والمشوق
                            </p>
                          </div>
                        </button>
                      ))
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
                      className="text-slate-500 hover:text-indigo-600 gap-4 text-2xl font-black px-12 h-16 rounded-[2rem] hover:bg-white/10 transition-all border border-slate-200"
                    >
                      <ArrowRight className="h-8 w-8" />
                      العودة للمسارات
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-12 mb-20 animate-in zoom-in duration-1000">
                    <div className="inline-flex items-center justify-center w-36 h-36 rounded-[3.5rem] bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-6 shadow-[0_15px_40px_rgba(245,158,11,0.3)]">
                      <Gamepad2 className="h-18 w-18 animate-pulse text-white" />
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight">
                      اختر <span className="text-amber-500">نوع التحدي</span>
                    </h2>
                    <div className="bg-white/60 inline-block px-14 py-6 rounded-[2.5rem] border border-slate-200 backdrop-blur-3xl shadow-xl">
                      <p className="text-slate-600 text-3xl font-bold">
                        {selection.trackType === 'central' && selectedDomain ? (
                          <>المجال: <span className="font-black text-indigo-600 text-4xl">{selectedDomain.name}</span></>
                        ) : (
                          <>المسار: <span className="font-black text-emerald-600 text-4xl">{selection.trackType === 'nafis' ? 'نافس' : 'الاختبار المركزي'}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-10 md:grid-cols-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleExperienceChange("quick-quiz")}
                      className="group relative overflow-hidden rounded-[4rem] border-4 border-slate-100 bg-white/80 p-14 text-right transition-all duration-500 hover:border-amber-400 hover:shadow-[0_20px_80px_rgba(245,158,11,0.15)] hover:scale-[1.05] disabled:opacity-50 shadow-sm"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative">
                        <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-amber-500 text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-amber-500/30">
                          <Zap className="h-14 w-14" />
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">
                          اختبار جبار
                        </h3>
                        <p className="text-2xl text-slate-500 leading-relaxed font-bold">
                          أسئلة سريعة ومركزة لقياس قوتك الحقيقية بمتعة
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleExperienceChange("interactive-games")}
                      className="group relative overflow-hidden rounded-[4rem] border-4 border-slate-100 bg-white/80 p-14 text-right transition-all duration-500 hover:border-fuchsia-400 hover:shadow-[0_20px_80px_rgba(192,38,211,0.15)] hover:scale-[1.05] disabled:opacity-50 shadow-sm"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative">
                        <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-fuchsia-600 text-white group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 shadow-xl shadow-fuchsia-500/30">
                          <Gamepad2 className="h-14 w-14" />
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">
                          ألعاب نارية
                        </h3>
                        <p className="text-2xl text-slate-500 leading-relaxed font-bold">
                          تعلم واستمتع في عالم من الألعاب التفاعلية المبهجة
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-24 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-slate-500 hover:text-slate-900 gap-5 text-3xl font-black px-14 h-20 rounded-[2.5rem] hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      <ArrowRight className="h-10 w-10" />
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
