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

  const handleTrackChange = (trackType: TrackType) => {
    setSelection((current) => ({
      ...current,
      trackType,
      domainId: trackType === "central" ? current.domainId : "",
    }));
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

  const handleStart = async () => {
    if (!experienceType) {
      toast.error("يرجى اختيار نوع التجربة");
      return;
    }

    const context = buildSelectionContext();
    if (!context) {
      toast.error(
        selection.trackType === "central"
          ? "يرجى اختيار الصف والمادة والمجال أولًا"
          : "يرجى اختيار الصف والمادة أولًا",
      );
      return;
    }

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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">
                  {studentName ? `أهلًا ${studentName}` : "لوحة الطالب"}
                </h1>
                <p className="text-sm text-slate-500">
                  اختر المسار والسياق الدراسي ثم ابدأ التجربة
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
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white mb-2">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-900">
                  اختر مسارك الدراسي
                </h2>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  حدد الصف والمادة والمسار المناسب لبدء رحلتك التعليمية
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleTrackChange("nafis")}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-right transition-all duration-300 ${
                    selection.trackType === "nafis"
                      ? "border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100"
                      : "border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                      selection.trackType === "nafis" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                    }`}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">نافس</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                      بنك الأسئلة والألعاب العامة
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTrackChange("central")}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-right transition-all duration-300 ${
                    selection.trackType === "central"
                      ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100"
                      : "border-slate-100 bg-white hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                      selection.trackType === "central" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                    }`}>
                      <Target className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">الاختبار المركزي</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                      مع مجال علمي محدد
                    </p>
                  </div>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-sm font-medium">بياناتك الدراسية</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">الصف</span>
                  <Select
                    value={selection.gradeId || undefined}
                    onValueChange={handleGradeChange}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">المادة</span>
                  <Select
                    disabled={!selection.gradeId}
                    value={selection.subjectId || undefined}
                    onValueChange={handleSubjectChange}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selection.trackType === "central" && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      المجال
                    </span>
                    <Select
                      disabled={!selection.gradeSubjectId}
                      value={selection.domainId || undefined}
                      onValueChange={handleDomainChange}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                        <SelectValue placeholder="اختر المجال" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDomains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-sm font-medium">نوع التجربة</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setExperienceType("quick-quiz")}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-right transition-all duration-300 ${
                    experienceType === "quick-quiz"
                      ? "border-amber-500 bg-amber-50/50 shadow-lg shadow-amber-100"
                      : "border-slate-100 bg-white hover:border-amber-200 hover:shadow-md"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                      experienceType === "quick-quiz" ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
                    }`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      اختبار سريع
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      أسئلة مباشرة حسب اختيارك
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExperienceType("interactive-games")}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-right transition-all duration-300 ${
                    experienceType === "interactive-games"
                      ? "border-fuchsia-500 bg-fuchsia-50/50 shadow-lg shadow-fuchsia-100"
                      : "border-slate-100 bg-white hover:border-fuchsia-200 hover:shadow-md"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                      experienceType === "interactive-games" ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white"
                    }`}>
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      ألعاب تفاعلية
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      ألعاب متاحة حسب سياقك
                    </p>
                  </div>
                </button>
              </div>

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

              <Button
                onClick={handleStart}
                disabled={isActionLoading}
                className="h-14 w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-base font-bold text-white shadow-lg shadow-slate-300/50 hover:shadow-xl hover:shadow-slate-300/70 hover:from-slate-800 hover:to-slate-700 transition-all duration-300"
              >
                {isActionLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    جاري التجهيز...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    ابدأ الآن
                    <span>→</span>
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
