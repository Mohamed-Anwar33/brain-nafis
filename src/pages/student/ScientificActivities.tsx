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
import { ReadingPassageDesignSystem, type ReadingPassageItem, type ReadingQuestionItem } from "@/components/student/reading/ReadingPassageDesignSystem";

type Choice = { id: string; text: string };
type ReadingQuestion = ReadingQuestionItem;
type Reading = ReadingPassageItem & { domain_id?: string | null; grade_subject_id?: string | null };
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

function orderKnownBiologyReadings(items: Reading[]) {
  const priority = (title: string) => {
    if (title.includes("كيف تحصل الخلية على الطاقة")) return 0;
    if (title.includes("الغدد الصماء")) return 1;
    return 2;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priority(a.item.title) - priority(b.item.title) || a.index - b.index)
    .map(({ item }) => item);
}

export default function ScientificActivities() {
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("type");
  const requestedDomainId = searchParams.get("domain_id");
  const requestedGradeSubjectId = searchParams.get("grade_subject_id");
  const showReading = activityType !== "lab";
  const showLab = activityType !== "reading";
  const [readings, setReadings] = useState<Reading[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedDomainName, setSelectedDomainName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [readingResults, setReadingResults] = useState<Record<string, boolean>>({});
  const [activeReadingIndex, setActiveReadingIndex] = useState(0);
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
      const context = getStoredSelectionContext();
      const domainId = requestedDomainId || context?.domainId || null;
      const gradeSubjectId = requestedGradeSubjectId || context?.gradeSubjectId || null;
      const domainNamePromise = domainId && context?.domainId !== domainId
        ? supabase.from("central_domains").select("name").eq("id", domainId).maybeSingle()
        : Promise.resolve({ data: context?.domainName ? { name: context.domainName } : null });
      let readingQuery = supabase.from("scientific_readings").select("*,questions:scientific_reading_questions(*)").eq("active", true);
      let labQuery = supabase.from("virtual_lab_activities").select("*").eq("active", true);
      if (domainId) {
        readingQuery = readingQuery.eq("domain_id", domainId);
        labQuery = labQuery.eq("domain_id", domainId);
      } else if (gradeSubjectId) {
        readingQuery = readingQuery.eq("grade_subject_id", gradeSubjectId);
        labQuery = labQuery.eq("grade_subject_id", gradeSubjectId);
      }
      const [{ data: readingData, error: readingError }, { data: labData, error: labError }, { data: domainData }] = await Promise.all([
        readingQuery.order("created_at", { ascending: false }),
        labQuery.order("created_at", { ascending: false }),
        domainNamePromise,
      ]);
      setSelectedDomainName(domainData?.name || null);
      if (readingError) console.error("Could not load readings:", readingError);
      if (labError) console.error("Could not load virtual labs:", labError);
      const inScope = (item: { domain_id?: string | null; grade_subject_id?: string | null }) =>
        isScientificActivityInScope(item, { domainId, gradeSubjectId });
      setReadings(orderKnownBiologyReadings(((readingData || []) as unknown as Reading[]).filter(inScope)));
      setActiveReadingIndex(0);
      setLabs(((labData || []) as unknown as Lab[]).filter(inScope));
      setLoading(false);
    };
    void load();
  }, [requestedDomainId, requestedGradeSubjectId]);

  const saveReadingAnswer = async (question: ReadingQuestion) => {
    const choiceId = readingAnswers[question.id];
    if (!choiceId) { toast.error("اختر إجابة أولًا"); return; }
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
    if (questions.length < 4 || questions.some((question) => !answers[question.id])) { toast.error("أجب عن كل الأسئلة أولًا"); return; }
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
    toast.success("حُفظت إجاباتك. افتح الفيديو ثم أجب عن الأسئلة نفسها.");
  };

  const openVideo = async (lab: Lab) => {
    const isQuestionSet = (lab.question_set || []).length >= 4;
    let attemptId = attempts[lab.id];
    if (isQuestionSet && !attemptId) { toast.error("أجب عن أسئلة ما قبل الفيديو أولًا"); return; }
    if (!isQuestionSet && !legacyAnswers[`${lab.id}-before`]) { toast.error("أجب عن سؤال التوقع أولًا"); return; }
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
      toast.error("شاهد الفيديو ثم أجب عن كل الأسئلة مرة أخرى"); return;
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
    if (!answer) { toast.error("اختر إجابة أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ تقدمك في المختبر"); return; }
    let attemptId = attempts[lab.id];
    if (!attemptId) {
      if (phase === "after") { toast.error("أجب عن سؤال التوقع وافتح الفيديو أولًا"); return; }
      const { data, error } = await supabase.rpc("start_virtual_lab_attempt", { p_activity_id: lab.id, p_before_answer: answer });
      if (error || !data) { toast.error("تعذر حفظ الإجابة"); return; }
      attemptId = data as string; setAttempts((current) => ({ ...current, [lab.id]: attemptId! }));
    }
    if (phase === "before") {
      const { error } = await supabase.rpc("update_virtual_lab_prediction", { p_attempt_id: attemptId, p_before_answer: answer });
      if (error) { toast.error("تعذر حفظ التوقع"); return; }
      toast.success("تم حفظ توقعك. افتح الفيديو ثم أجب عن سؤال الاستنتاج."); return;
    }
    if (!labOpened[lab.id]) { toast.error("افتح الفيديو أولًا ثم أجب عن سؤال الاستنتاج"); return; }
    const { data, error } = await supabase.rpc("submit_virtual_lab_answer", { p_attempt_id: attemptId, p_after_answer: answer });
    if (error) { toast.error("تعذر حفظ الإجابة"); return; }
    setLegacyResults((current) => ({ ...current, [lab.id]: data === true }));
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const readingQuestionCount = readings.reduce((count, reading) => count + (reading.questions?.length || 0), 0);
  const currentReadingIndex = Math.min(activeReadingIndex, Math.max(readings.length - 1, 0));
  const currentReading = readings[currentReadingIndex] || null;
  const navigateToReading = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= readings.length) return;
    setActiveReadingIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main dir="rtl" className="relative isolate w-full overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(167,139,250,0.18),transparent_25%),radial-gradient(circle_at_88%_42%,rgba(56,189,248,0.16),transparent_25%),linear-gradient(150deg,#f2f1ff,#f8fbff_50%,#effbf7)]">
    {showReading && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block">
      <div className="absolute inset-y-0 left-0 w-[clamp(200px,17vw,330px)] opacity-90" style={{ backgroundImage: "url('/assets/reading/reading-side-left.png')", backgroundRepeat: "repeat-y", backgroundSize: "100% auto", backgroundPosition: "center top", transform: "scaleX(-1)" }} />
      <div className="absolute inset-y-0 right-0 w-[clamp(200px,17vw,330px)] opacity-90" style={{ backgroundImage: "url('/assets/reading/reading-side-right.png')", backgroundRepeat: "repeat-y", backgroundSize: "100% auto", backgroundPosition: "center top", transform: "scaleX(-1)" }} />
    </div>}
    <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-3 py-6 sm:space-y-10 sm:px-6 sm:py-8">
    {showReading && <header className="relative isolate min-h-[300px] overflow-hidden rounded-[2rem] border border-violet-100 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,255,255,0.25),transparent_55%),linear-gradient(120deg,#d8d3ff_0%,#d9f0ff_48%,#bdf4dd_100%)] px-4 pb-4 pt-5 shadow-xl shadow-indigo-900/10 sm:min-h-[390px] sm:px-8 sm:pt-7">
      <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 h-52 w-52 rounded-full border-2 border-white/40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-20 h-40 w-40 rounded-full border border-dashed border-violet-400/40" />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/90 px-4 py-2 text-sm font-black text-violet-800 shadow-md"><BookOpen className="h-4 w-4" />وقت القراءة والاستكشاف</div>
        <h1 className="mx-auto mt-3 w-fit rounded-[2rem] border border-white/90 bg-white/90 px-6 py-2 text-3xl font-black leading-tight text-indigo-950 shadow-lg sm:px-10 sm:text-5xl">الفهم القرائي</h1>
        <div aria-hidden="true" className="mx-auto mt-1 h-1.5 w-32 -rotate-2 rounded-full bg-amber-400 shadow-sm" />
        <p className="mt-2 text-sm font-bold leading-7 text-slate-700 sm:text-base">اقرأ النص التالي، ثم أجب عن الأسئلة</p>
      </div>
      <img src={currentReadingIndex === 1 ? "/assets/reading/reading-girl.png" : "/assets/reading/reading-boy.png"} alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[150px] w-full object-contain object-bottom sm:h-[265px]" />
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-5 sm:gap-2">
        <span className="rounded-full border border-white bg-white/90 px-3 py-2 text-xs font-black text-indigo-900 shadow-md sm:px-4 sm:text-sm">📖 {readings.length} {readings.length === 2 ? "قطعتان قرائيتان" : "قطع قرائية"}</span>
        <span className="rounded-full border border-white bg-white/90 px-3 py-2 text-xs font-black text-violet-900 shadow-md sm:px-4 sm:text-sm">✨ {readingQuestionCount} سؤالًا</span>
      </div>
      {selectedDomainName && <span className="absolute left-3 top-3 z-20 rounded-full border border-white bg-white/90 px-3 py-2 text-xs font-black text-indigo-800 shadow-md sm:left-6 sm:top-5 sm:px-4 sm:text-sm">المجال: {selectedDomainName}</span>}
    </header>}
    {!showReading && <header><h1 className="text-3xl font-black">{activityType === "lab" ? "المختبر الافتراضي" : "أنشطة العلوم"}</h1><p className="mt-2 text-muted-foreground">استكشفي التجارب العلمية وتابعي كيف يتطور فهمك بعد المشاهدة.</p>{selectedDomainName && <p className="mt-3 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800">المجال المحدد: {selectedDomainName}</p>}</header>}
    {showReading && <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 text-xl font-black text-indigo-950 sm:text-2xl"><BookOpen className="h-6 w-6 text-violet-700" />اقرأ واستنتجي</h2>
        <span className="text-sm font-bold text-slate-500">قطعة ← أسئلة ← مراجعة</span>
      </div>
      {readings.length === 0 && <p className="rounded-2xl border border-violet-100 bg-white/90 p-5 font-bold text-slate-600">لا توجد نصوص علمية متاحة حاليًا.</p>}
      {currentReading && <ReadingPassageDesignSystem
        key={currentReading.id}
        reading={currentReading}
        passageNumber={currentReadingIndex + 1}
        passageCount={readings.length}
        selectedAnswers={readingAnswers}
        results={readingResults}
        onAnswerChange={(questionId, choiceId) => setReadingAnswers((current) => ({ ...current, [questionId]: choiceId }))}
        onCheckAnswer={(question) => void saveReadingAnswer(question)}
        hasPreviousPassage={currentReadingIndex > 0}
        hasNextPassage={currentReadingIndex < readings.length - 1}
        onPreviousPassage={() => navigateToReading(currentReadingIndex - 1)}
        onNextPassage={() => navigateToReading(currentReadingIndex + 1)}
      />}
      {readings.length > 1 && <div className="flex items-center justify-center gap-3" aria-label="التنقل بين القطع القرائية">
        {readings.map((reading, index) => <span key={reading.id} className={`h-2.5 w-2.5 rounded-full ${index === currentReadingIndex ? (index % 2 === 0 ? "bg-violet-600" : "bg-teal-600") : "bg-indigo-200"}`} />)}
        <span className="text-xs font-bold text-slate-500">استخدم زر الانتقال أسفل القطعة</span>
      </div>}
    </section>}

    {showLab && <section className="space-y-4"><h2 className="flex items-center gap-2 text-2xl font-black"><FlaskConical className="h-6 w-6 text-emerald-600" />استكشفي وجرّبي</h2>
      {labs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">لا توجد تجارب افتراضية متاحة حاليًا.</p>}
      {labs.map((lab) => {
        const questions = lab.question_set || [];
        const usesQuestionSet = questions.length >= 4;
        return <Card key={lab.id} className="overflow-hidden rounded-3xl border-2 border-emerald-100 shadow-lg shadow-emerald-950/5"><CardHeader className="bg-gradient-to-l from-emerald-50 via-white to-teal-50"><CardTitle className="flex items-center gap-3 text-emerald-950"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md"><FlaskConical className="h-6 w-6" /></span>{lab.title}</CardTitle></CardHeader><CardContent className="space-y-5 p-4 sm:p-6">
          {lab.instructions && <p className="whitespace-pre-wrap text-sm leading-7">{lab.instructions}</p>}
          {usesQuestionSet ? <>
            <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><p className="font-bold">قبل الفيديو — أجب عن الأسئلة لقياس فهمك الأولي</p>
              {questions.map((question, index) => <div key={question.id} className="space-y-2 rounded-xl border border-indigo-100 bg-white p-3"><p className="font-black text-indigo-950">{index + 1}. {question.text}</p><RadioGroup value={beforeAnswers[lab.id]?.[question.id] || ""} onValueChange={(value) => setQuestionAnswer(setBeforeAnswers, lab.id, question.id, value)}>{question.choices.map((choice) => <div key={choice.id} className={`flex items-center gap-2 rounded-xl border p-3 ${beforeAnswers[lab.id]?.[question.id] === choice.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-200"}`}><RadioGroupItem id={`${lab.id}-before-${question.id}-${choice.id}`} value={choice.id} /><Label className="flex-1 cursor-pointer font-bold" htmlFor={`${lab.id}-before-${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup></div>)}
              <Button disabled={busy[lab.id] || !!attempts[lab.id]} onClick={() => void saveBeforeSet(lab)}>{busy[lab.id] ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{attempts[lab.id] ? `نتيجتك قبل الفيديو: ${beforeScores[lab.id]}٪` : "حفظ الإجابات وبدء التجربة"}</Button>
            </div>
            <Button disabled={!attempts[lab.id] || !!labOpened[lab.id]} onClick={() => void openVideo(lab)}><Play className="ml-2 h-4 w-4" />{labOpened[lab.id] ? "الفيديو مفتوح" : "شاهد فيديو التجربة"}</Button>
            {labOpened[lab.id] && <iframe title={`فيديو ${lab.title}`} src={embedUrl(lab.simulation_url)} className="aspect-video w-full rounded-xl border bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
            {labOpened[lab.id] && <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><p className="font-bold">بعد الفيديو — أجب عن الأسئلة نفسها</p>
              {questions.map((question, index) => <div key={question.id} className="space-y-2 rounded-xl border border-emerald-100 bg-white p-3"><p className="font-black text-emerald-950">{index + 1}. {question.text}</p><RadioGroup value={afterAnswers[lab.id]?.[question.id] || ""} onValueChange={(value) => setQuestionAnswer(setAfterAnswers, lab.id, question.id, value)}>{question.choices.map((choice) => <div key={choice.id} className={`flex items-center gap-2 rounded-xl border p-3 ${afterAnswers[lab.id]?.[question.id] === choice.id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-emerald-200"}`}><RadioGroupItem id={`${lab.id}-after-${question.id}-${choice.id}`} value={choice.id} /><Label className="flex-1 cursor-pointer font-bold" htmlFor={`${lab.id}-after-${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup></div>)}
              <Button disabled={busy[lab.id] || !!comparisons[lab.id]} onClick={() => void saveAfterSet(lab)}>{busy[lab.id] ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}احسبي نسبة التحسن</Button>
              {comparisons[lab.id] && <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="flex items-center gap-2 font-black text-emerald-900"><TrendingUp className="h-5 w-5" />نتيجة التجربة</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><p className="text-xs text-muted-foreground">قبل الفيديو</p><p className="text-xl font-black">{comparisons[lab.id].before_percent}٪</p></div><div><p className="text-xs text-muted-foreground">بعد الفيديو</p><p className="text-xl font-black text-emerald-700">{comparisons[lab.id].after_percent}٪</p></div><div><p className="text-xs text-muted-foreground">التحسن</p><p className="text-xl font-black text-indigo-700">{comparisons[lab.id].improvement_percent > 0 ? "+" : ""}{comparisons[lab.id].improvement_percent}٪</p></div></div></div>}
            </div>}
          </> : <>
            <p className="rounded-lg bg-indigo-50 p-3 font-bold">قبل التجربة — {lab.before_question}</p>
            <RadioGroup value={legacyAnswers[`${lab.id}-before`] || ""} onValueChange={(value) => setLegacyAnswers((current) => ({ ...current, [`${lab.id}-before`]: value }))}>{lab.before_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-legacy-before-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-legacy-before-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup>
            <Button variant="outline" onClick={() => void saveLegacyAnswer(lab, "before")}>حفظ التوقع</Button>
            <Button disabled={!attempts[lab.id] || !!labOpened[lab.id]} onClick={() => void openVideo(lab)}><Play className="ml-2 h-4 w-4" />{labOpened[lab.id] ? "الفيديو مفتوح" : "شاهد فيديو التجربة"}</Button>
            {labOpened[lab.id] && <iframe title={`فيديو ${lab.title}`} src={embedUrl(lab.simulation_url)} className="aspect-video w-full rounded-xl border bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
            <p className="rounded-lg bg-emerald-50 p-3 font-bold">بعد التجربة — {lab.after_question}</p>
            <RadioGroup value={legacyAnswers[`${lab.id}-after`] || ""} onValueChange={(value) => setLegacyAnswers((current) => ({ ...current, [`${lab.id}-after`]: value }))}>{lab.after_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-legacy-after-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-legacy-after-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup>
            <Button disabled={!labOpened[lab.id]} onClick={() => void saveLegacyAnswer(lab, "after")}>تحقق من استنتاجي</Button>
            {legacyResults[lab.id] !== undefined && <p className={`font-bold ${legacyResults[lab.id] ? "text-emerald-700" : "text-rose-700"}`}>{legacyResults[lab.id] ? "أحسنت! أتقنت النشاط." : "راجع التجربة وحاول فهم النتيجة مرة أخرى."}</p>}
          </>}
        </CardContent></Card>;
      })}
    </section>}
    </div>
    {showReading && <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 z-0 w-full overflow-hidden"><img src="/assets/reading/reading-footer.png" alt="" className="block h-auto max-h-[420px] w-full object-cover object-bottom sm:max-h-[520px]" /></div>}
  </main>;
}
