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
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.14),_transparent_25%),linear-gradient(135deg,#f8fafc,#eef2ff,#ecfeff)]"
      dir="rtl"
    >
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 mr-2"
                  title="العودة للخطوة السابقة"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">
                  {studentName ? `أهلًا ${studentName}` : "لوحة الطالب"}
                </h1>
                <p className="text-sm text-slate-500">
                  {step === 1 ? "اختر المسار التعليمي" : step === 2 && selection.trackType === 'central' ? "اختر التخصص" : "اختر نوع التجربة"}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="gap-2 rounded-full text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Card className="border-0 bg-white p-8 shadow-2xl shadow-slate-200/50 rounded-3xl">
            <div className="space-y-8">
              {step === 1 ? (
                <>
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white mb-2 shadow-lg shadow-emerald-100">
                      <Zap className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">
                      اختر مسارك الدراسي
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                      ابدأ رحلتك التعليمية باختيار المسار المناسب لك اليوم
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleTrackChange("nafis")}
                      className="group relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-6 text-right transition-all duration-300 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100/50"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-100 transition-colors" />
                      <div className="relative">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
                          <Zap className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">نافس</h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          استمتع ببنك الأسئلة والألعاب التعليمية العامة لتطوير مهاراتك
                        </p>
                        <div className="mt-4 flex items-center text-emerald-600 font-bold text-sm">
                          <span>ابدأ الآن</span>
                          <span className="mr-1 group-hover:translate-x-[-4px] transition-transform">←</span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTrackChange("central")}
                      className="group relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-6 text-right transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100/50"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100 transition-colors" />
                      <div className="relative">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                          <Target className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">الاختبار المركزي</h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          اختبر معلوماتك في مجالات علمية محددة ومنظمة
                        </p>
                        <div className="mt-4 flex items-center text-blue-600 font-bold text-sm">
                          <span>ابدأ الآن</span>
                          <span className="mr-1 group-hover:translate-x-[-4px] transition-transform">←</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              ) : step === 2 && selection.trackType === "central" ? (
                <>
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-white mb-2 shadow-lg shadow-blue-100">
                      <Target className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">
                      اختر التخصص
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                      حدد المجال العلمي الذي ترغب في البدء به للاختبار المركزي
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {availableDomains.length > 0 ? (
                      availableDomains.map((domain) => (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => handleDomainSelection(domain.id)}
                          className="group relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-6 text-right transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100/50"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100 transition-colors" />
                          <div className="relative">
                            <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                              <Target className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {domain.name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
                              اختبر مهاراتك في هذا المجال المحدد
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        لا توجد مجالات متاحة حالياً لهذا التخصص.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-slate-500 hover:text-slate-900 gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      العودة للمسارات
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white mb-2 shadow-lg shadow-amber-100">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">
                      اختر نوع التجربة
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                      {selection.trackType === 'central' && selectedDomain ? (
                        <>التخصص: <span className="font-bold text-slate-900">{selectedDomain.name}</span></>
                      ) : (
                        <>المسار المختار: <span className="font-bold text-slate-900">{selection.trackType === 'nafis' ? 'نافس' : 'الاختبار المركزي'}</span></>
                      )}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleExperienceChange("quick-quiz")}
                      className="group relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-6 text-right transition-all duration-300 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-100/50 disabled:opacity-50"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-100 transition-colors" />
                      <div className="relative">
                        <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-xl bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                          <Zap className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                          اختبار سريع
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          أسئلة مباشرة وسريعة لقياس مستواك بشكل حصري
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleExperienceChange("interactive-games")}
                      className="group relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-6 text-right transition-all duration-300 hover:border-fuchsia-500 hover:shadow-xl hover:shadow-fuchsia-100/50 disabled:opacity-50"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-100/50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-fuchsia-100 transition-colors" />
                      <div className="relative">
                        <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white transition-all duration-300">
                          <Gamepad2 className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                          ألعاب تفاعلية
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          تعلم بطريقة ممتعة وتفاعلية من خلال الألعاب التعليمية
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-slate-500 hover:text-slate-900 gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {selection.trackType === 'central' ? 'تغيير التخصص المختار' : 'تغيير المسار المختار'}
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
  );
}
