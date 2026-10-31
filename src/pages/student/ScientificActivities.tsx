import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, FlaskConical, Play, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getStoredSelectionContext } from "@/lib/selection-context";
import { isScientificActivityInScope } from "@/lib/scientific-activity-scope";

type Choice = { id: string; text: string };
type ReadingQuestion = { id: string; text: string; question_order: number; choices: Choice[] };
type Reading = { id: string; title: string; passage: string; domain_id?: string | null; grade_subject_id?: string | null; questions: ReadingQuestion[] };
type LabQuestion = { id: string; text: string; choices: Choice[] };
type Lab = {
  id: string; title: string; domain_id?: string | null; grade_subject_id?: string | null;
  instructions: string; simulation_url: string; display_mode: "external" | "iframe";
  question_set?: LabQuestion[];
  before_question: string; before_choices: Choice[]; after_question: string; after_choices: Choice[];
};
type LabComparison = { before_percent: number; after_percent: number; improvement_percent: number };

const embedUrl = (input: string) => {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    return url.toString();
  } catch { return input; }
};

export default function ScientificActivities() {
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("type");
  const requestedDomainId = searchParams.get("domain_id");
  const requestedGradeSubjectId = searchParams.get("grade_subject_id");
  const showReading = activityType !== "lab";
  const showLab = activityType !== "reading";
  const [readings, setReadings] = useState<Reading[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [readingResults, setReadingResults] = useState<Record<string, boolean>>({});
  const [legacyAnswers, setLegacyAnswers] = useState<Record<string, string>>({});
  const [beforeAnswers, setBeforeAnswers] = useState<Record<string, Record<string, string>>>({});
  const [afterAnswers, setAfterAnswers] = useState<Record<string, Record<string, string>>>({});
  const [attempts, setAttempts] = useState<Record<string, string>>({});
  const [beforeScores, setBeforeScores] = useState<Record<string, number>>({});
  const [labOpened, setLabOpened] = useState<Record<string, boolean>>({});
  const [legacyResults, setLegacyResults] = useState<Record<string, boolean>>({});
  const [comparisons, setComparisons] = useState<Record<string, LabComparison>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const [{ data: readingData, error: readingError }, { data: labData, error: labError }] = await Promise.all([
        supabase.from("scientific_readings").select("*,questions:scientific_reading_questions(*)").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("virtual_lab_activities").select("*").eq("active", true).order("created_at", { ascending: false }),
      ]);
      if (readingError) console.error("Could not load readings:", readingError);
      if (labError) console.error("Could not load virtual labs:", labError);
      const context = getStoredSelectionContext();
      const domainId = requestedDomainId || context?.domainId || null;
      const gradeSubjectId = requestedGradeSubjectId || context?.gradeSubjectId || null;
      const inScope = (item: { domain_id?: string | null; grade_subject_id?: string | null }) =>
        isScientificActivityInScope(item, { domainId, gradeSubjectId });
      setReadings(((readingData || []) as unknown as Reading[]).filter(inScope));
      setLabs(((labData || []) as unknown as Lab[]).filter(inScope));
      setLoading(false);
    };
    void load();
  }, [requestedDomainId, requestedGradeSubjectId]);

  const saveReadingAnswer = async (question: ReadingQuestion) => {
    const choiceId = readingAnswers[question.id];
    if (!choiceId) { toast.error("اختاري إجابة أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ إجاباتك"); return; }
    const { data, error } = await supabase.rpc("submit_scientific_reading_answer", { p_question_id: question.id, p_choice_id: choiceId });
    if (error) { toast.error("تعذر حفظ إجابتك"); return; }
    setReadingResults((current) => ({ ...current, [question.id]: data === true }));
  };

  const setQuestionAnswer = (setter: typeof setBeforeAnswers | typeof setAfterAnswers, labId: string, questionId: string, choiceId: string) => {
    setter((current) => ({ ...current, [labId]: { ...current[labId], [questionId]: choiceId } }));
  };

  const saveBeforeSet = async (lab: Lab) => {
    const questions = lab.question_set || [];
    const answers = beforeAnswers[lab.id] || {};
    if (questions.length < 4 || questions.some((question) => !answers[question.id])) { toast.error("أجيبي عن كل الأسئلة أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ تقدمك في المختبر"); return; }
    setBusy((current) => ({ ...current, [lab.id]: true }));
    const { data, error } = await supabase.rpc("start_virtual_lab_question_set_attempt", {
      p_activity_id: lab.id,
      p_before_answers: questions.map((question) => ({ question_id: question.id, choice_id: answers[question.id] })),
    });
    setBusy((current) => ({ ...current, [lab.id]: false }));
    if (error || !data?.attempt_id) { toast.error("تعذر حفظ الإجابات القبلية"); return; }
    setAttempts((current) => ({ ...current, [lab.id]: data.attempt_id }));
    setBeforeScores((current) => ({ ...current, [lab.id]: data.before_percent }));
    toast.success("حُفظت إجاباتك. افتحي الفيديو ثم أجيبي عن الأسئلة نفسها.");
  };

  const openVideo = async (lab: Lab) => {
    const isQuestionSet = (lab.question_set || []).length >= 4;
    let attemptId = attempts[lab.id];
    if (isQuestionSet && !attemptId) { toast.error("أجيبي عن أسئلة ما قبل الفيديو أولًا"); return; }
    if (!isQuestionSet && !legacyAnswers[`${lab.id}-before`]) { toast.error("أجيبي عن سؤال التوقع أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ تقدمك في المختبر"); return; }
    if (!attemptId && !isQuestionSet) {
      const { data, error } = await supabase.rpc("start_virtual_lab_attempt", {
        p_activity_id: lab.id, p_before_answer: legacyAnswers[`${lab.id}-before`],
      });
      if (error || !data) { toast.error("تعذر بدء تسجيل نشاط المختبر"); return; }
      attemptId = data as string;
      setAttempts((current) => ({ ...current, [lab.id]: attemptId! }));
    }
    const { error } = await supabase.rpc("mark_virtual_lab_opened", { p_attempt_id: attemptId });
    if (error) { toast.error("تعذر تسجيل فتح الفيديو"); return; }
    setLabOpened((current) => ({ ...current, [lab.id]: true }));
  };

  const saveAfterSet = async (lab: Lab) => {
    const questions = lab.question_set || [];
    const answers = afterAnswers[lab.id] || {};
    if (!attempts[lab.id] || !labOpened[lab.id] || questions.some((question) => !answers[question.id])) {
      toast.error("شاهدي الفيديو ثم أجيبي عن كل الأسئلة مرة أخرى"); return;
    }
    setBusy((current) => ({ ...current, [lab.id]: true }));
    const { data, error } = await supabase.rpc("submit_virtual_lab_question_set", {
      p_attempt_id: attempts[lab.id],
      p_after_answers: questions.map((question) => ({ question_id: question.id, choice_id: answers[question.id] })),
    });
    setBusy((current) => ({ ...current, [lab.id]: false }));
    if (error) { toast.error("تعذر حفظ إجابات ما بعد الفيديو"); return; }
    setComparisons((current) => ({ ...current, [lab.id]: data as LabComparison }));
  };

  const saveLegacyAnswer = async (lab: Lab, phase: "before" | "after") => {
    const answer = legacyAnswers[`${lab.id}-${phase}`];
    if (!answer) { toast.error("اختاري إجابة أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ تقدمك في المختبر"); return; }
    let attemptId = attempts[lab.id];
    if (!attemptId) {
      if (phase === "after") { toast.error("أجيبي عن سؤال التوقع وافتحي الفيديو أولًا"); return; }
      const { data, error } = await supabase.rpc("start_virtual_lab_attempt", { p_activity_id: lab.id, p_before_answer: answer });
      if (error || !data) { toast.error("تعذر حفظ الإجابة"); return; }
      attemptId = data as string; setAttempts((current) => ({ ...current, [lab.id]: attemptId! }));
    }
    if (phase === "before") {
      const { error } = await supabase.rpc("update_virtual_lab_prediction", { p_attempt_id: attemptId, p_before_answer: answer });
      if (error) { toast.error("تعذر حفظ التوقع"); return; }
      toast.success("تم حفظ توقعك. افتحي الفيديو ثم أجيبي عن سؤال الاستنتاج."); return;
    }
    if (!labOpened[lab.id]) { toast.error("افتحي الفيديو أولًا ثم أجيبي عن سؤال الاستنتاج"); return; }
    const { data, error } = await supabase.rpc("submit_virtual_lab_answer", { p_attempt_id: attemptId, p_after_answer: answer });
    if (error) { toast.error("تعذر حفظ الإجابة"); return; }
    setLegacyResults((current) => ({ ...current, [lab.id]: data === true }));
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return <main dir="rtl" className="mx-auto max-w-5xl space-y-10 px-4 py-8">
    <header><h1 className="text-3xl font-black">{activityType === "reading" ? "الفهم القرائي" : activityType === "lab" ? "المختبر الافتراضي" : "أنشطة العلوم"}</h1><p className="mt-2 text-muted-foreground">{activityType === "reading" ? "اقرئي النصوص العلمية واستنتجي الإجابات من المعلومات الواردة فيها." : activityType === "lab" ? "استكشفي التجارب العلمية وتابعي كيف يتطور فهمك بعد المشاهدة." : "اقرئي النصوص العلمية واستكشفي التجارب الافتراضية."}</p>{(requestedDomainId || getStoredSelectionContext()?.domainName) && <p className="mt-3 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800">المجال المحدد: {getStoredSelectionContext()?.domainName || "المجال المختار"}</p>}</header>
    {showReading && <section className="space-y-4"><h2 className="flex items-center gap-2 text-2xl font-black"><BookOpen className="h-6 w-6 text-indigo-600" />اقرئي واستنتجي</h2>
      {readings.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">لا توجد نصوص علمية متاحة حاليًا.</p>}
      {readings.map((reading) => <Card key={reading.id}><CardHeader><CardTitle>{reading.title}</CardTitle></CardHeader><CardContent className="space-y-5"><div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-5 leading-8">{reading.passage}</div>
        {reading.questions.slice().sort((a, b) => a.question_order - b.question_order).map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><p className="font-bold">{index + 1}. {question.text}</p><RadioGroup value={readingAnswers[question.id] || ""} onValueChange={(value) => setReadingAnswers((current) => ({ ...current, [question.id]: value }))}>{(question.choices || []).map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${question.id}-${choice.id}`} value={choice.id} /><Label htmlFor={`${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup><Button variant="outline" onClick={() => void saveReadingAnswer(question)}>تحققي من الإجابة</Button>{readingResults[question.id] !== undefined && <p className={`font-bold ${readingResults[question.id] ? "text-emerald-700" : "text-rose-700"}`}>{readingResults[question.id] ? "إجابة صحيحة" : "إجابة غير صحيحة، أعيدي قراءة القطعة."}</p>}</div>)}
      </CardContent></Card>)}
    </section>}

    {showLab && <section className="space-y-4"><h2 className="flex items-center gap-2 text-2xl font-black"><FlaskConical className="h-6 w-6 text-emerald-600" />استكشفي وجرّبي</h2>
      {labs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">لا توجد تجارب افتراضية متاحة حاليًا.</p>}
      {labs.map((lab) => {
        const questions = lab.question_set || [];
        const usesQuestionSet = questions.length >= 4;
        return <Card key={lab.id}><CardHeader><CardTitle>{lab.title}</CardTitle></CardHeader><CardContent className="space-y-5">
          {lab.instructions && <p className="whitespace-pre-wrap text-sm leading-7">{lab.instructions}</p>}
          {usesQuestionSet ? <>
            <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><p className="font-bold">قبل الفيديو — أجيبي عن الأسئلة لقياس فهمك الأولي</p>
              {questions.map((question, index) => <div key={question.id} className="space-y-2 rounded-lg bg-white p-3"><p className="font-medium">{index + 1}. {question.text}</p><RadioGroup value={beforeAnswers[lab.id]?.[question.id] || ""} onValueChange={(value) => setQuestionAnswer(setBeforeAnswers, lab.id, question.id, value)}>{question.choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-before-${question.id}-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-before-${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup></div>)}
              <Button disabled={busy[lab.id] || !!attempts[lab.id]} onClick={() => void saveBeforeSet(lab)}>{busy[lab.id] ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{attempts[lab.id] ? `نتيجتك قبل الفيديو: ${beforeScores[lab.id]}٪` : "حفظ الإجابات وبدء التجربة"}</Button>
            </div>
            <Button disabled={!attempts[lab.id] || !!labOpened[lab.id]} onClick={() => void openVideo(lab)}><Play className="ml-2 h-4 w-4" />{labOpened[lab.id] ? "الفيديو مفتوح" : "شاهدي فيديو التجربة"}</Button>
            {labOpened[lab.id] && <iframe title={`فيديو ${lab.title}`} src={embedUrl(lab.simulation_url)} className="aspect-video w-full rounded-xl border bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
            {labOpened[lab.id] && <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><p className="font-bold">بعد الفيديو — أجيبي عن الأسئلة نفسها</p>
              {questions.map((question, index) => <div key={question.id} className="space-y-2 rounded-lg bg-white p-3"><p className="font-medium">{index + 1}. {question.text}</p><RadioGroup value={afterAnswers[lab.id]?.[question.id] || ""} onValueChange={(value) => setQuestionAnswer(setAfterAnswers, lab.id, question.id, value)}>{question.choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-after-${question.id}-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-after-${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup></div>)}
              <Button disabled={busy[lab.id] || !!comparisons[lab.id]} onClick={() => void saveAfterSet(lab)}>{busy[lab.id] ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}احسبي نسبة التحسن</Button>
              {comparisons[lab.id] && <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="flex items-center gap-2 font-black text-emerald-900"><TrendingUp className="h-5 w-5" />نتيجة التجربة</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><p className="text-xs text-muted-foreground">قبل الفيديو</p><p className="text-xl font-black">{comparisons[lab.id].before_percent}٪</p></div><div><p className="text-xs text-muted-foreground">بعد الفيديو</p><p className="text-xl font-black text-emerald-700">{comparisons[lab.id].after_percent}٪</p></div><div><p className="text-xs text-muted-foreground">التحسن</p><p className="text-xl font-black text-indigo-700">{comparisons[lab.id].improvement_percent > 0 ? "+" : ""}{comparisons[lab.id].improvement_percent}٪</p></div></div></div>}
            </div>}
          </> : <>
            <p className="rounded-lg bg-indigo-50 p-3 font-bold">قبل التجربة — {lab.before_question}</p>
            <RadioGroup value={legacyAnswers[`${lab.id}-before`] || ""} onValueChange={(value) => setLegacyAnswers((current) => ({ ...current, [`${lab.id}-before`]: value }))}>{lab.before_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-legacy-before-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-legacy-before-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup>
            <Button variant="outline" onClick={() => void saveLegacyAnswer(lab, "before")}>حفظ التوقع</Button>
            <Button disabled={!attempts[lab.id] || !!labOpened[lab.id]} onClick={() => void openVideo(lab)}><Play className="ml-2 h-4 w-4" />{labOpened[lab.id] ? "الفيديو مفتوح" : "شاهدي فيديو التجربة"}</Button>
            {labOpened[lab.id] && <iframe title={`فيديو ${lab.title}`} src={embedUrl(lab.simulation_url)} className="aspect-video w-full rounded-xl border bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
            <p className="rounded-lg bg-emerald-50 p-3 font-bold">بعد التجربة — {lab.after_question}</p>
            <RadioGroup value={legacyAnswers[`${lab.id}-after`] || ""} onValueChange={(value) => setLegacyAnswers((current) => ({ ...current, [`${lab.id}-after`]: value }))}>{lab.after_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-legacy-after-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-legacy-after-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup>
            <Button disabled={!labOpened[lab.id]} onClick={() => void saveLegacyAnswer(lab, "after")}>تحققي من استنتاجي</Button>
            {legacyResults[lab.id] !== undefined && <p className={`font-bold ${legacyResults[lab.id] ? "text-emerald-700" : "text-rose-700"}`}>{legacyResults[lab.id] ? "أحسنتِ! أتقنتِ النشاط." : "راجعي التجربة وحاولي فهم النتيجة مرة أخرى."}</p>}
          </>}
        </CardContent></Card>;
      })}
    </section>}
  </main>;
}
