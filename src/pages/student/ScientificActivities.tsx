import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { getStoredSelectionContext } from "@/lib/selection-context";

type Reading = { id: string; title: string; passage: string; domain_id?: string | null; grade_subject_id?: string | null; questions: { id: string; text: string; question_order: number; choices: { id: string; text: string }[] }[] };
type Lab = { id: string; title: string; domain_id?: string | null; grade_subject_id?: string | null; instructions: string; simulation_url: string; display_mode: "external" | "iframe"; before_question: string; before_choices: { id: string; text: string }[]; after_question: string; after_choices: { id: string; text: string }[] };

export default function ScientificActivities() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [labAttempts, setLabAttempts] = useState<Record<string, string>>({});
  const [labOpened, setLabOpened] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [readingResults, setReadingResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const [{ data: readingData, error: readingError }, { data: labData, error: labError }] = await Promise.all([
        supabase.from("scientific_readings").select("*,questions:scientific_reading_questions(*)").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("virtual_lab_activities").select("*").eq("active", true).order("created_at", { ascending: false }),
      ]);
      if (readingError) console.error("Could not load readings:", readingError);
      if (labError) console.error("Could not load virtual labs:", labError);
      const context = getStoredSelectionContext();
      setReadings(((readingData || []) as unknown as Reading[]).filter((item) =>
        (!context?.domainId || !item.domain_id || item.domain_id === context.domainId) &&
        (!context?.gradeSubjectId || !item.grade_subject_id || item.grade_subject_id === context.gradeSubjectId),
      ));
      setLabs(((labData || []) as unknown as Lab[]).filter((item) =>
        (!context?.domainId || !item.domain_id || item.domain_id === context.domainId) &&
        (!context?.gradeSubjectId || !item.grade_subject_id || item.grade_subject_id === context.gradeSubjectId),
      ));
      setLoading(false);
    };
    void load();
  }, []);

  const select = (id: string, value: string) => setAnswers((previous) => ({ ...previous, [id]: value }));

  const saveReadingAnswer = async (question: Reading["questions"][number]) => {
    const answer = answers[question.id];
    if (!answer) { toast.error("اختاري إجابة أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ إجاباتك"); return; }
    const { data, error } = await supabase.rpc("submit_scientific_reading_answer", { p_question_id: question.id, p_choice_id: answer });
    if (error) { toast.error("تعذر حفظ إجابتك"); return; }
    setReadingResults((previous) => ({ ...previous, [question.id]: data === true }));
  };

  const openSimulation = async (lab: Lab) => {
    const beforeAnswer = answers[`${lab.id}-before`];
    if (!beforeAnswer) { toast.error("أجيبي عن سؤال التوقع أولًا"); return; }
    const externalWindow = lab.display_mode === "external" ? window.open("about:blank", "_blank") : null;
    if (lab.display_mode === "external" && !externalWindow) { toast.error("اسمحي بفتح النوافذ المنبثقة لعرض المحاكاة"); return; }
    if (externalWindow) externalWindow.opener = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { externalWindow?.close(); toast.error("سجّلي الدخول لحفظ تقدمك في المختبر"); return; }
    let attemptId = labAttempts[lab.id];
    if (!attemptId) {
      const { data, error } = await supabase.rpc("start_virtual_lab_attempt", { p_activity_id: lab.id, p_before_answer: beforeAnswer });
      if (error || !data) { externalWindow?.close(); toast.error("تعذر بدء تسجيل نشاط المختبر"); return; }
      attemptId = data as string;
      setLabAttempts((previous) => ({ ...previous, [lab.id]: attemptId! }));
    } else if (!labOpened[lab.id]) {
      const { error: predictionError } = await supabase.rpc("update_virtual_lab_prediction", { p_attempt_id: attemptId, p_before_answer: beforeAnswer });
      if (predictionError) { externalWindow?.close(); toast.error("تعذر حفظ توقعك قبل فتح المحاكاة"); return; }
    }
    setLabOpened((previous) => ({ ...previous, [lab.id]: true }));
    const { error: openedError } = await supabase.rpc("mark_virtual_lab_opened", { p_attempt_id: attemptId });
    if (openedError) { externalWindow?.close(); setLabOpened((previous) => ({ ...previous, [lab.id]: false })); toast.error("تعذر تسجيل فتح المحاكاة"); return; }
    if (externalWindow) externalWindow.location.href = lab.simulation_url;
  };

  const saveLabAnswer = async (lab: Lab, phase: "before" | "after") => {
    const key = `${lab.id}-${phase}`;
    const answer = answers[key];
    if (!answer) { toast.error("اختاري إجابة أولًا"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجّلي الدخول لحفظ تقدمك في المختبر"); return; }
    let attemptId = labAttempts[lab.id];
    if (!attemptId) {
      if (phase === "after") { toast.error("أجيبي عن سؤال التوقع وافتحي المحاكاة أولًا"); return; }
      const { data, error } = await supabase.rpc("start_virtual_lab_attempt", { p_activity_id: lab.id, p_before_answer: answer });
      if (error || !data) { toast.error("تعذر حفظ الإجابة"); return; }
      attemptId = data as string;
      setLabAttempts((previous) => ({ ...previous, [lab.id]: attemptId! }));
    }
    if (phase === "before") {
      const { error } = await supabase.rpc("update_virtual_lab_prediction", { p_attempt_id: attemptId, p_before_answer: answer });
      if (error) { toast.error("تعذر حفظ التوقع"); return; }
      toast.success("تم حفظ توقعك. افتحي المحاكاة ثم أجيبي عن سؤال الاستنتاج.");
      return;
    }
    if (!labOpened[lab.id]) { toast.error("افتحي المحاكاة أولًا ثم أجيبي عن سؤال الاستنتاج"); return; }
    const { data, error } = await supabase.rpc("submit_virtual_lab_answer", { p_attempt_id: attemptId, p_after_answer: answer });
    if (error) { toast.error("تعذر حفظ الإجابة"); return; }
    setResults((previous) => ({ ...previous, [lab.id]: data === true }));
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return <main dir="rtl" className="mx-auto max-w-5xl space-y-10 px-4 py-8">
    <header><h1 className="text-3xl font-black">أنشطة العلوم</h1><p className="mt-2 text-muted-foreground">اقرئي النصوص العلمية واستكشفي التجارب الافتراضية.</p></header>
    <section className="space-y-4"><h2 className="flex items-center gap-2 text-2xl font-black"><BookOpen className="h-6 w-6 text-indigo-600" />اقرئي واستنتجي</h2>
      {readings.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">لا توجد نصوص علمية متاحة حاليًا.</p>}
      {readings.map((reading) => <Card key={reading.id}><CardHeader><CardTitle>{reading.title}</CardTitle></CardHeader><CardContent className="space-y-5"><div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-5 leading-8">{reading.passage}</div>
        {reading.questions.slice().sort((a, b) => a.question_order - b.question_order).map((question) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><p className="font-bold">{question.text}</p><RadioGroup value={answers[question.id] || ""} onValueChange={(value) => select(question.id, value)}>{(question.choices || []).map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${question.id}-${choice.id}`} value={choice.id} /><Label htmlFor={`${question.id}-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup><Button variant="outline" onClick={() => void saveReadingAnswer(question)}>حفظ الإجابة</Button>{readingResults[question.id] !== undefined && <p className={`font-bold ${readingResults[question.id] ? "text-emerald-700" : "text-rose-700"}`}>{readingResults[question.id] ? "إجابة صحيحة" : "إجابة غير صحيحة، أعيدي قراءة القطعة."}</p>}</div>)}
      </CardContent></Card>)}
    </section>
    <section className="space-y-4"><h2 className="flex items-center gap-2 text-2xl font-black"><FlaskConical className="h-6 w-6 text-emerald-600" />استكشفي وجرّبي</h2>
      {labs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">لا توجد تجارب افتراضية متاحة حاليًا.</p>}
      {labs.map((lab) => <Card key={lab.id}><CardHeader><CardTitle>{lab.title}</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><p className="font-bold">قبل التجربة — توقعي</p><p className="my-3">{lab.before_question}</p><RadioGroup value={answers[`${lab.id}-before`] || ""} onValueChange={(value) => select(`${lab.id}-before`, value)}>{lab.before_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-before-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-before-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup><Button className="mt-3" variant="outline" onClick={() => void saveLabAnswer(lab, "before")}>حفظ التوقع</Button>{labOpened[lab.id] && <p className="mt-2 text-sm font-bold text-emerald-700">تم حفظ التوقع وفتح المحاكاة.</p>}</div>
        <p className="whitespace-pre-wrap text-sm leading-7">{lab.instructions}</p>
        <Button onClick={() => void openSimulation(lab)}>افتحي المحاكاة التفاعلية</Button>
        {lab.display_mode === "iframe" && labOpened[lab.id] && <iframe title={lab.title} src={lab.simulation_url} sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" className="h-[480px] w-full rounded-xl border" allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><p className="font-bold">بعد التجربة — استنتجي</p><p className="my-3">{lab.after_question}</p><RadioGroup value={answers[`${lab.id}-after`] || ""} onValueChange={(value) => select(`${lab.id}-after`, value)}>{lab.after_choices.map((choice) => <div key={choice.id} className="flex items-center gap-2"><RadioGroupItem id={`${lab.id}-after-${choice.id}`} value={choice.id} /><Label htmlFor={`${lab.id}-after-${choice.id}`}>{choice.text}</Label></div>)}</RadioGroup><Button className="mt-3" onClick={() => void saveLabAnswer(lab, "after")}>تحققي من استنتاجي</Button>{results[lab.id] !== undefined && <p className={`mt-3 font-bold ${results[lab.id] ? "text-emerald-700" : "text-rose-700"}`}>{results[lab.id] ? "أحسنتِ! أتقنتِ النشاط." : "راجعي التجربة وحاولي فهم النتيجة مرة أخرى."}</p>}</div>
        <p className="text-xs text-slate-500">فتح المحاكاة وحده لا يُحتسب إتقانًا؛ يلزم حل سؤال ما بعد التجربة بشكل صحيح.</p>
      </CardContent></Card>)}
    </section>
  </main>;
}
