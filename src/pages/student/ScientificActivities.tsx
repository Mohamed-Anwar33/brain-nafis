import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, FlaskConical, Play, TrendingUp, Atom, Leaf, Lightbulb, Trophy, Microscope, Sparkles, ClipboardCheck, CircleHelp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getStoredSelectionContext } from "@/lib/selection-context";
import { isScientificActivityInScope } from "@/lib/scientific-activity-scope";
import { parseExplanationUrl } from "@/lib/video-parser";
import { getVideoButtonLabel, isInteractiveSimulationUrl } from "@/lib/virtual-lab-video";
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
  return parseExplanationUrl(input)?.embedUrl || input;
};

const externalVideoUrl = (input: string) => {
  try {
    const url = new URL(input);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
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
  const [openingVideo, setOpeningVideo] = useState<Record<string, boolean>>({});
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
    setOpeningVideo((current) => ({ ...current, [lab.id]: true }));
    try {
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
    } catch {
      toast.error("تعذر فتح الفيديو الآن. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setOpeningVideo((current) => ({ ...current, [lab.id]: false }));
    }
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
    {showReading && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden 2xl:block">
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M7 0 C2 8, 11 13, 6 21 S10 33, 5 41 S11 52, 6 61 S10 73, 5 82 S9 94, 6 100" fill="none" stroke="#a78bfa" strokeWidth=".16" strokeDasharray=".7 1.1" />
        <path d="M93 0 C98 9, 89 14, 94 23 S90 34, 95 44 S89 56, 94 65 S90 78, 95 87 S91 96, 94 100" fill="none" stroke="#5eead4" strokeWidth=".16" strokeDasharray=".7 1.1" />
      </svg>
      <img
        src={currentReadingIndex === 1 ? "/assets/reading/reading-side-boy.png" : "/assets/reading/reading-side-girl.png"}
        alt=""
        className="absolute left-[2.5%] top-[12%] w-[clamp(135px,11vw,200px)] drop-shadow-[0_14px_20px_rgba(89,65,156,0.12)]"
      />
      <img
        src="/assets/reading/reading-bookbulb.png"
        alt=""
        className="absolute right-[3%] top-[34%] w-[clamp(125px,10vw,185px)] drop-shadow-[0_14px_20px_rgba(89,65,156,0.1)]"
      />
      <img
        src="/assets/reading/reading-microscope.png"
        alt=""
        className="absolute left-[2.5%] top-[59%] w-[clamp(135px,11vw,195px)] drop-shadow-[0_14px_20px_rgba(30,120,125,0.12)]"
      />
      <img
        src="/assets/reading/reading-plant-books.png"
        alt=""
        className="absolute right-[2.5%] top-[77%] w-[clamp(145px,12vw,220px)] drop-shadow-[0_14px_20px_rgba(30,120,90,0.14)]"
      />
      <span className="absolute left-[4%] top-[29%] flex h-14 w-14 rotate-[-9deg] items-center justify-center rounded-[1.2rem] border border-white/90 bg-white/90 text-sky-600 shadow-lg shadow-sky-950/10"><Atom className="h-7 w-7" /></span>
      <span className="absolute right-[4%] top-[17%] flex h-12 w-12 rotate-[8deg] items-center justify-center rounded-2xl border border-white/90 bg-white/90 text-amber-500 shadow-lg shadow-amber-950/10"><Lightbulb className="h-6 w-6" /></span>
      <span className="absolute right-[4%] top-[58%] flex h-14 w-14 rotate-[7deg] items-center justify-center rounded-[1.2rem] border border-white/90 bg-white/90 text-emerald-600 shadow-lg shadow-emerald-950/10"><Leaf className="h-7 w-7" /></span>
      <span className="absolute left-[4%] top-[82%] flex h-12 w-12 rotate-[-8deg] items-center justify-center rounded-2xl border border-white/90 bg-white/90 text-violet-600 shadow-lg shadow-violet-950/10"><Trophy className="h-6 w-6" /></span>
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
    {!showReading && <header className="relative isolate min-h-[260px] overflow-hidden rounded-[2rem] border border-cyan-100 bg-[radial-gradient(circle_at_16%_24%,rgba(255,255,255,0.86),transparent_22%),linear-gradient(115deg,#d8e8ff_0%,#e9e2ff_42%,#d6fbef_100%)] px-5 py-6 shadow-xl shadow-indigo-900/10 sm:min-h-[310px] sm:px-9 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 h-56 w-56 rounded-full border-2 border-white/60" />
      <div aria-hidden="true" className="pointer-events-none absolute left-[24%] top-8 h-32 w-32 rounded-full border border-dashed border-indigo-300/70" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-[30%] h-52 w-52 rounded-full bg-white/45 blur-2xl" />
      <img src="/assets/reading/reading-side-boy.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-3 left-2 z-0 hidden h-[235px] w-[235px] object-contain drop-shadow-[0_12px_16px_rgba(59,53,124,0.14)] sm:block" />
      <div className="relative z-10 flex min-h-[210px] items-center sm:min-h-[245px] sm:pl-[210px]">
        <div className="max-w-3xl space-y-4 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/85 px-4 py-2 text-sm font-black text-indigo-800 shadow-sm"><Microscope className="h-4 w-4 text-teal-600" /> مساحة التجارب والاستكشاف</div>
          <h1 className="text-3xl font-black leading-tight text-indigo-950 sm:text-5xl">المختبر <span className="text-violet-700">الافتراضي</span></h1>
          <p className="max-w-2xl text-sm font-bold leading-7 text-slate-700 sm:text-base">استكشف التجارب العلمية، توقّع ما سيحدث، ثم شاهد التجربة واكتشف النتيجة بنفسك.</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-3 py-2 text-xs font-black text-indigo-900 shadow-sm sm:text-sm"><ClipboardCheck className="h-4 w-4 text-violet-600" /> توقّع قبل المشاهدة</span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-3 py-2 text-xs font-black text-teal-900 shadow-sm sm:text-sm"><Play className="h-4 w-4 text-teal-600" /> شاهد التجربة</span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-3 py-2 text-xs font-black text-amber-900 shadow-sm sm:text-sm"><Sparkles className="h-4 w-4 text-amber-500" /> قارن فهمك بعدها</span>
          </div>
          {selectedDomainName && <p className="inline-flex rounded-full border border-indigo-100 bg-indigo-50/90 px-4 py-2 text-sm font-black text-indigo-800">المجال المحدد: {selectedDomainName}</p>}
        </div>
      </div>
      <span className="absolute right-7 top-7 hidden h-14 w-14 rotate-6 items-center justify-center rounded-2xl border border-white bg-white/90 text-amber-500 shadow-lg sm:flex"><Lightbulb className="h-7 w-7" /></span>
    </header>}
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

    {showLab && <section className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3 px-1"><div><h2 className="flex items-center gap-2 text-2xl font-black text-indigo-950 sm:text-3xl"><FlaskConical className="h-7 w-7 text-emerald-600" />استكشف وجرّب</h2><p className="mt-2 text-sm font-bold text-slate-600">ابدأ بتوقعك، ثم اختبر فهمك بعد مشاهدة التجربة.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/85 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm"><Atom className="h-4 w-4" /> {labs.length} {labs.length === 1 ? "تجربة علمية" : "تجارب علمية"}</span></div>
      {labs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">لا توجد تجارب افتراضية متاحة حاليًا.</p>}
      {labs.map((lab) => {
        const questions = lab.question_set || [];
        const usesQuestionSet = questions.length >= 4;
        return <Card key={lab.id} className="relative overflow-hidden rounded-[2rem] border-2 border-emerald-100 bg-white shadow-xl shadow-emerald-950/10"><CardHeader className="relative overflow-hidden border-b border-emerald-100 bg-[radial-gradient(circle_at_8%_50%,rgba(255,255,255,0.8),transparent_25%),linear-gradient(110deg,#d9f8ee,#f0fbff_50%,#eeebff)] px-5 py-5 sm:px-8 sm:py-7"><div aria-hidden="true" className="pointer-events-none absolute -left-6 -top-10 h-36 w-36 rounded-full border border-emerald-300/40" /><CardTitle className="relative z-10 flex items-center gap-3 text-xl leading-relaxed text-emerald-950 sm:text-2xl"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-700/20"><FlaskConical className="h-6 w-6" /></span><span className="flex-1">{lab.title}</span><span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/80 text-violet-600 shadow-sm sm:flex"><Atom className="h-6 w-6" /></span></CardTitle></CardHeader><CardContent className="relative space-y-6 p-4 sm:p-7">
          {lab.instructions && <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-gradient-to-l from-sky-50 to-white p-4 text-right shadow-sm sm:p-5"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><CircleHelp className="h-5 w-5" /></span><p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700 sm:text-base">{lab.instructions}</p></div>}
          {usesQuestionSet ? <>
            <div className="space-y-4 rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/80 p-4 shadow-inner sm:p-6"><div className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/85 p-3 shadow-sm sm:p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><ClipboardCheck className="h-5 w-5" /></span><div><p className="font-black text-indigo-950">قبل المشاهدة</p><p className="text-xs font-bold text-slate-500 sm:text-sm">أجب عن الأسئلة لقياس فهمك الأولي</p></div></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-800">{questions.length} أسئلة</span></div>
              {questions.map((question, index) => <div key={question.id} className="space-y-3 rounded-2xl border border-indigo-100/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"><p className="flex items-start gap-3 text-right text-base font-black leading-7 text-indigo-950 sm:text-lg"><span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm text-white shadow-sm">{index + 1}</span><span className="flex-1">{question.text}</span></p><RadioGroup dir="rtl" value={beforeAnswers[lab.id]?.[question.id] || ""} onValueChange={(value) => setQuestionAnswer(setBeforeAnswers, lab.id, question.id, value)} className="space-y-2">{question.choices.map((choice) => <div key={choice.id} className={`flex flex-row items-center gap-3 rounded-2xl border p-3.5 text-right transition-all sm:p-4 ${beforeAnswers[lab.id]?.[question.id] === choice.id ? "border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-100" : "border-slate-200 bg-slate-50/90 hover:border-indigo-200 hover:bg-white"}`}><RadioGroupItem id={`${lab.id}-before-${question.id}-${choice.id}`} value={choice.id} className="h-5 w-5 shrink-0 border-2 border-indigo-400 text-indigo-700" /><Label className="flex-1 cursor-pointer text-right text-sm font-bold leading-relaxed text-slate-800 sm:text-base" htmlFor={`${lab.id}-before-${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup></div>)}
              <Button className="h-auto min-h-12 rounded-2xl bg-gradient-to-l from-indigo-700 to-violet-700 px-6 py-3 text-base font-black shadow-lg shadow-indigo-900/15 hover:from-indigo-800 hover:to-violet-800" disabled={busy[lab.id] || !!attempts[lab.id]} onClick={() => void saveBeforeSet(lab)}>{busy[lab.id] ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : attempts[lab.id] ? <CheckCircle2 className="ml-2 h-5 w-5" /> : <Play className="ml-2 h-5 w-5" />}{attempts[lab.id] ? `نتيجتك قبل التجربة: ${beforeScores[lab.id]}٪` : "حفظ الإجابات وابدأ التجربة"}</Button>
            </div>
            <div className="rounded-3xl border border-violet-100 bg-gradient-to-l from-violet-50 via-white to-cyan-50 p-4 shadow-sm sm:p-6"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Microscope className="h-5 w-5" /></span><div><p className="font-black text-violet-950">حان وقت الاستكشاف</p><p className="text-xs font-bold text-slate-500 sm:text-sm">شاهد التجربة ولاحظ ما يحدث</p></div></div><div className="space-y-3">
              <Button className="h-auto min-h-12 rounded-2xl bg-gradient-to-l from-teal-600 to-emerald-600 px-6 py-3 text-base font-black shadow-lg shadow-emerald-900/15 hover:from-teal-700 hover:to-emerald-700" disabled={!attempts[lab.id] || !!labOpened[lab.id] || !!openingVideo[lab.id]} onClick={() => void openVideo(lab)}>
                {openingVideo[lab.id] ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
                {getVideoButtonLabel({ hasAttempt: !!attempts[lab.id], isOpening: !!openingVideo[lab.id], isOpened: !!labOpened[lab.id], isSimulation: isInteractiveSimulationUrl(lab.simulation_url) })}
              </Button>
              {!attempts[lab.id] && <p className="text-sm font-bold text-slate-500">أجب عن الأسئلة واحفظها أولًا حتى يتاح فتح التجربة.</p>}
            </div>
            </div>
            {labOpened[lab.id] && <div className="space-y-2">
              <div className="overflow-hidden rounded-3xl border-4 border-white bg-slate-950 shadow-xl shadow-indigo-950/15 ring-1 ring-indigo-100"><iframe title={`${isInteractiveSimulationUrl(lab.simulation_url) ? "محاكاة" : "فيديو"} ${lab.title}`} src={embedUrl(lab.simulation_url)} className="aspect-video w-full bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
              {externalVideoUrl(lab.simulation_url) && <a className="inline-flex text-sm font-bold text-indigo-700 underline underline-offset-4" href={externalVideoUrl(lab.simulation_url)!} target="_blank" rel="noopener noreferrer">إذا لم تظهر التجربة، افتحها في صفحة جديدة</a>}
            </div>}
            {labOpened[lab.id] && <div className="space-y-4 rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 p-4 shadow-inner sm:p-6"><div className="flex items-center gap-3 rounded-2xl border border-white bg-white/85 p-3 shadow-sm sm:p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><div><p className="font-black text-emerald-950">بعد المشاهدة</p><p className="text-xs font-bold text-slate-500 sm:text-sm">أجب مجددًا، ثم قارن النتيجتين</p></div></div>
              {questions.map((question, index) => <div key={question.id} className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"><p className="flex items-start gap-3 text-right text-base font-black leading-7 text-emerald-950 sm:text-lg"><span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm text-white shadow-sm">{index + 1}</span><span className="flex-1">{question.text}</span></p><RadioGroup dir="rtl" value={afterAnswers[lab.id]?.[question.id] || ""} onValueChange={(value) => setQuestionAnswer(setAfterAnswers, lab.id, question.id, value)} className="space-y-2">{question.choices.map((choice) => <div key={choice.id} className={`flex flex-row items-center gap-3 rounded-2xl border p-3.5 text-right transition-all sm:p-4 ${afterAnswers[lab.id]?.[question.id] === choice.id ? "border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-100" : "border-slate-200 bg-slate-50/90 hover:border-emerald-200 hover:bg-white"}`}><RadioGroupItem id={`${lab.id}-after-${question.id}-${choice.id}`} value={choice.id} className="h-5 w-5 shrink-0 border-2 border-emerald-400 text-emerald-700" /><Label className="flex-1 cursor-pointer text-right text-sm font-bold leading-relaxed text-slate-800 sm:text-base" htmlFor={`${lab.id}-after-${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup></div>)}
              <Button className="h-auto min-h-12 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-600 px-6 py-3 text-base font-black shadow-lg shadow-emerald-900/15 hover:from-emerald-700 hover:to-teal-700" disabled={busy[lab.id] || !!comparisons[lab.id]} onClick={() => void saveAfterSet(lab)}>{busy[lab.id] ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <TrendingUp className="ml-2 h-5 w-5" />}احسب نسبة التحسن</Button>
              {comparisons[lab.id] && <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-lg shadow-emerald-900/5"><p className="flex items-center gap-2 font-black text-emerald-900"><TrendingUp className="h-5 w-5" />نتيجة التجربة</p><div className="mt-4 grid grid-cols-1 gap-3 text-center sm:grid-cols-3"><div className="rounded-2xl bg-indigo-50 p-4"><p className="text-xs font-bold text-slate-600">قبل التجربة</p><p className="mt-1 text-2xl font-black text-indigo-800">{comparisons[lab.id].before_percent}٪</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-slate-600">بعد التجربة</p><p className="mt-1 text-2xl font-black text-emerald-700">{comparisons[lab.id].after_percent}٪</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs font-bold text-slate-600">مقدار التحسن</p><p className="mt-1 text-2xl font-black text-violet-700">{comparisons[lab.id].improvement_percent > 0 ? "+" : ""}{comparisons[lab.id].improvement_percent}٪</p></div></div></div>}
            </div>}
          </> : <>
            <p className="rounded-lg bg-indigo-50 p-3 font-bold">قبل التجربة — {lab.before_question}</p>
            <RadioGroup value={legacyAnswers[`${lab.id}-before`] || ""} onValueChange={(value) => setLegacyAnswers((current) => ({ ...current, [`${lab.id}-before`]: value }))}>{lab.before_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-legacy-before-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-legacy-before-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup>
            <Button variant="outline" onClick={() => void saveLegacyAnswer(lab, "before")}>حفظ التوقع</Button>
            <div className="space-y-2">
              <Button disabled={!attempts[lab.id] || !!labOpened[lab.id] || !!openingVideo[lab.id]} onClick={() => void openVideo(lab)}>
                {openingVideo[lab.id] ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
                {getVideoButtonLabel({ hasAttempt: !!attempts[lab.id], isOpening: !!openingVideo[lab.id], isOpened: !!labOpened[lab.id], isSimulation: isInteractiveSimulationUrl(lab.simulation_url) })}
              </Button>
              {!attempts[lab.id] && <p className="text-sm font-bold text-slate-500">احفظ إجابتك أولًا حتى يتاح فتح التجربة.</p>}
            </div>
            {labOpened[lab.id] && <div className="space-y-2">
              <iframe title={`${isInteractiveSimulationUrl(lab.simulation_url) ? "محاكاة" : "فيديو"} ${lab.title}`} src={embedUrl(lab.simulation_url)} className="aspect-video w-full rounded-xl border bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              {externalVideoUrl(lab.simulation_url) && <a className="inline-flex text-sm font-bold text-indigo-700 underline underline-offset-4" href={externalVideoUrl(lab.simulation_url)!} target="_blank" rel="noopener noreferrer">إذا لم تظهر التجربة، افتحها في صفحة جديدة</a>}
            </div>}
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
    {showLab && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden 2xl:block"><span className="absolute left-[max(1.5rem,calc((100vw-1500px)/2))] top-[440px] flex h-16 w-16 -rotate-6 items-center justify-center rounded-[1.4rem] border border-white/90 bg-white/90 text-sky-600 shadow-xl shadow-indigo-950/10"><Atom className="h-8 w-8" /></span><img src="/assets/reading/reading-microscope.png" alt="" className="absolute right-[max(1rem,calc((100vw-1510px)/2))] top-[480px] w-[clamp(145px,12vw,205px)] drop-shadow-[0_14px_20px_rgba(89,65,156,0.14)]" /><img src="/assets/reading/reading-plant-books.png" alt="" className="absolute bottom-[130px] left-[max(1rem,calc((100vw-1510px)/2))] w-[clamp(145px,12vw,205px)] drop-shadow-[0_14px_20px_rgba(30,120,90,0.14)]" /><span className="absolute right-[max(2rem,calc((100vw-1460px)/2))] bottom-[300px] flex h-14 w-14 rotate-6 items-center justify-center rounded-2xl border border-white/90 bg-white/90 text-amber-500 shadow-xl shadow-amber-950/10"><Lightbulb className="h-7 w-7" /></span></div>}
  </main>;
}
