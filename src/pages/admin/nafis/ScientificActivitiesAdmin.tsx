import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Domain = { id: string; name: string; grade_subject_id: string };
type ChoiceDraft = { id: string; text: string; correct: boolean };
type ReadingQuestionDraft = { id: string; text: string; choices: ChoiceDraft[] };
type LabQuestionDraft = { id: string; text: string; choices: ChoiceDraft[] };
type ReadingAdminRow = { id: string; title: string; questions?: Array<{ id: string }> };
type LabAdminRow = { id: string; title: string; display_mode: "iframe" | "external"; question_set?: LabQuestionDraft[] };

const makeChoices = (): ChoiceDraft[] => [
  { id: crypto.randomUUID(), text: "", correct: true },
  { id: crypto.randomUUID(), text: "", correct: false },
  { id: crypto.randomUUID(), text: "", correct: false },
  { id: crypto.randomUUID(), text: "", correct: false },
];
const makeReadingQuestion = (): ReadingQuestionDraft => ({ id: crypto.randomUUID(), text: "", choices: makeChoices() });
const makeLabQuestion = (): LabQuestionDraft => ({ id: crypto.randomUUID(), text: "", choices: makeChoices() });

export default function ScientificActivitiesAdmin() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [readings, setReadings] = useState<ReadingAdminRow[]>([]);
  const [labs, setLabs] = useState<LabAdminRow[]>([]);
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [readingDomain, setReadingDomain] = useState("");
  const [readingQuestions, setReadingQuestions] = useState<ReadingQuestionDraft[]>([
    makeReadingQuestion(), makeReadingQuestion(), makeReadingQuestion(), makeReadingQuestion(),
  ]);
  const [labTitle, setLabTitle] = useState("");
  const [labDomain, setLabDomain] = useState("");
  const [concept, setConcept] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [labQuestions, setLabQuestions] = useState<LabQuestionDraft[]>([
    makeLabQuestion(), makeLabQuestion(), makeLabQuestion(), makeLabQuestion(),
  ]);

  const refresh = async () => {
    const [{ data: readingData, error: readingError }, { data: labData, error: labError }] = await Promise.all([
      supabase.from("scientific_readings").select("*,questions:scientific_reading_questions(*)").order("created_at", { ascending: false }),
      supabase.from("virtual_lab_activities").select("id,title,display_mode,question_set").order("created_at", { ascending: false }),
    ]);
    if (readingError || labError) toast.error("تعذر تحميل الأنشطة العلمية");
    setReadings((readingData || []) as unknown as ReadingAdminRow[]);
    setLabs((labData || []) as unknown as LabAdminRow[]);
  };

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from("central_domains").select("id,name,grade_subject_id").order("sort_order");
      if (error) toast.error("تعذر تحميل المجالات العلمية");
      setDomains((data || []) as Domain[]);
      await refresh();
    })();
  }, []);

  const updateReadingQuestion = (id: string, update: Partial<ReadingQuestionDraft>) =>
    setReadingQuestions((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  const updateLabQuestion = (id: string, update: Partial<LabQuestionDraft>) =>
    setLabQuestions((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));

  const saveReading = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = readingQuestions.filter((question) => question.text.trim()
      && question.choices.filter((choice) => choice.text.trim()).length >= 2
      && question.choices.some((choice) => choice.correct && choice.text.trim()));
    if (!title.trim() || !passage.trim() || valid.length < 4 || valid.length > 6) {
      toast.error("أدخلي النص ومعه من ٤ إلى ٦ أسئلة مكتملة");
      return;
    }
    const { data: reading, error } = await supabase.from("scientific_readings").insert({
      title: title.trim(), passage: passage.trim(), domain_id: readingDomain || null,
      grade_subject_id: domains.find((domain) => domain.id === readingDomain)?.grade_subject_id || null,
    }).select("id").single();
    if (error || !reading) { toast.error("تعذر حفظ النص العلمي"); return; }

    for (const [index, question] of valid.entries()) {
      const choices = question.choices.filter((choice) => choice.text.trim());
      const { data: inserted, error: questionError } = await supabase.from("scientific_reading_questions").insert({
        reading_id: reading.id, text: question.text.trim(), question_order: index + 1,
        choices: choices.map(({ id, text }) => ({ id, text: text.trim() })),
      }).select("id").single();
      if (questionError || !inserted) {
        await supabase.from("scientific_readings").delete().eq("id", reading.id);
        toast.error("تعذر حفظ أسئلة النص"); return;
      }
      const correct = choices.find((choice) => choice.correct)!;
      const { error: keyError } = await supabase.from("scientific_reading_answer_keys").insert({ question_id: inserted.id, correct_choice_id: correct.id });
      if (keyError) {
        await supabase.from("scientific_readings").delete().eq("id", reading.id);
        toast.error("تعذر حفظ مفتاح الإجابة"); return;
      }
    }
    toast.success("تمت إضافة النص وأسئلته");
    setTitle(""); setPassage(""); setReadingQuestions(Array.from({ length: 4 }, makeReadingQuestion));
    await refresh();
  };

  const saveLab = async (event: React.FormEvent) => {
    event.preventDefault();
    let parsedUrl: URL;
    try { parsedUrl = new URL(videoUrl); } catch { toast.error("أدخلي رابط فيديو صالحًا"); return; }
    if (parsedUrl.protocol !== "https:") { toast.error("يجب أن يبدأ رابط الفيديو بـ HTTPS"); return; }
    if (!labTitle.trim() || labQuestions.length < 4 || labQuestions.length > 5
      || labQuestions.some((question) => !question.text.trim()
        || question.choices.filter((choice) => choice.text.trim()).length < 2
        || !question.choices.some((choice) => choice.correct && choice.text.trim()))) {
      toast.error("أكملي ٤ أو ٥ أسئلة وحددي الإجابة الصحيحة لكل سؤال"); return;
    }

    const questionSet = labQuestions.map((question) => ({
      id: question.id,
      text: question.text.trim(),
      choices: question.choices.filter((choice) => choice.text.trim()).map(({ id, text }) => ({ id, text: text.trim() })),
    }));
    const answerKeys = Object.fromEntries(labQuestions.map((question) => [
      question.id, question.choices.find((choice) => choice.correct && choice.text.trim())!.id,
    ]));
    const first = questionSet[0];
    const { data: activity, error } = await supabase.from("virtual_lab_activities").insert({
      title: labTitle.trim(), domain_id: labDomain || null,
      grade_subject_id: domains.find((domain) => domain.id === labDomain)?.grade_subject_id || null,
      scientific_concept: concept.trim() || null, instructions: instructions.trim(),
      simulation_url: parsedUrl.toString(), display_mode: "iframe",
      question_set: questionSet,
      // Keep these legacy columns populated for compatibility with existing readers.
      before_question: first.text, before_choices: first.choices,
      after_question: first.text, after_choices: first.choices,
    }).select("id").single();
    if (error || !activity) { toast.error("تعذر حفظ تجربة الفيديو"); return; }
    const { error: keysError } = await supabase.from("virtual_lab_answer_keys").insert({
      activity_id: activity.id,
      before_correct_answer: answerKeys[first.id],
      after_correct_answer: answerKeys[first.id],
      question_answer_keys: answerKeys,
    });
    if (keysError) {
      await supabase.from("virtual_lab_activities").delete().eq("id", activity.id);
      toast.error("تعذر حفظ مفاتيح إجابات التجربة"); return;
    }
    toast.success("تمت إضافة التجربة وأسئلتها");
    setLabTitle(""); setConcept(""); setInstructions(""); setVideoUrl("");
    setLabQuestions(Array.from({ length: 4 }, makeLabQuestion));
    await refresh();
  };

  const renderChoiceEditor = (
    choices: ChoiceDraft[],
    setChoices: (choices: ChoiceDraft[]) => void,
    name: string,
  ) => <div className="space-y-2">
    {choices.map((choice, index) => <div className="flex items-center gap-2" key={choice.id}>
      <input type="radio" name={name} checked={choice.correct} onChange={() => setChoices(choices.map((item) => ({ ...item, correct: item.id === choice.id })))} aria-label="الإجابة الصحيحة" />
      <Input value={choice.text} onChange={(event) => setChoices(choices.map((item) => item.id === choice.id ? { ...item, text: event.target.value } : item))} placeholder={`الخيار ${index + 1}`} />
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => setChoices([...choices, { id: crypto.randomUUID(), text: "", correct: false }])}>إضافة خيار</Button>
  </div>;

  return <main dir="rtl" className="mx-auto max-w-5xl space-y-8 p-4 pb-12">
    <header><h1 className="text-3xl font-black">الفهم القرائي والمختبر الافتراضي</h1><p className="mt-2 text-muted-foreground">أضيفي نصوصًا وأسئلة لكل مجال، أو تجربة بفيديو ومجموعة الأسئلة نفسها قبل المشاهدة وبعدها.</p></header>
    <Card><CardHeader><CardTitle>إضافة نص «اقرئي واستنتجي»</CardTitle></CardHeader><CardContent>
      <form onSubmit={(event) => void saveReading(event)} className="space-y-4">
        <Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان النص" />
        <Select value={readingDomain || "none"} onValueChange={(value) => setReadingDomain(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="المجال العلمي" /></SelectTrigger><SelectContent><SelectItem value="none">اختياري — كل المجالات</SelectItem>{domains.map((domain) => <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>)}</SelectContent></Select>
        <Textarea required value={passage} onChange={(event) => setPassage(event.target.value)} placeholder="محتوى القطعة العلمية" className="min-h-40" />
        {readingQuestions.map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><Label>السؤال {index + 1}</Label><Input value={question.text} onChange={(event) => updateReadingQuestion(question.id, { text: event.target.value })} placeholder="نص السؤال" />{renderChoiceEditor(question.choices, (choices) => updateReadingQuestion(question.id, { choices }), `reading-${question.id}`)}{readingQuestions.length > 4 && <Button type="button" variant="ghost" onClick={() => setReadingQuestions(readingQuestions.filter((item) => item.id !== question.id))}>حذف السؤال</Button>}</div>)}
        {readingQuestions.length < 6 && <Button type="button" variant="outline" onClick={() => setReadingQuestions([...readingQuestions, makeReadingQuestion()])}>إضافة سؤال للنص</Button>}
        <Button type="submit">حفظ النص وأسئلته</Button>
      </form>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>إضافة تجربة «استكشفي وجربي»</CardTitle></CardHeader><CardContent>
      <form onSubmit={(event) => void saveLab(event)} className="space-y-4">
        <Input required value={labTitle} onChange={(event) => setLabTitle(event.target.value)} placeholder="عنوان التجربة" />
        <Select value={labDomain || "none"} onValueChange={(value) => setLabDomain(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="المجال العلمي" /></SelectTrigger><SelectContent><SelectItem value="none">اختياري — كل المجالات</SelectItem>{domains.map((domain) => <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>)}</SelectContent></Select>
        <Input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="المفهوم العلمي" />
        <Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="تعليمات الطالبة قبل مشاهدة الفيديو" />
        <Input required type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="رابط الفيديو (يُعرض داخل الموقع)" dir="ltr" />
        <p className="text-sm text-muted-foreground">الطالبة تجيب عن ٤ أو ٥ أسئلة، تشاهد الفيديو، ثم تجيب عن الأسئلة نفسها لقياس التحسن.</p>
        {labQuestions.map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><Label>السؤال {index + 1} — يظهر قبل الفيديو وبعده</Label><Input required value={question.text} onChange={(event) => updateLabQuestion(question.id, { text: event.target.value })} placeholder="نص السؤال" />{renderChoiceEditor(question.choices, (choices) => updateLabQuestion(question.id, { choices }), `lab-${question.id}`)}{labQuestions.length > 4 && <Button type="button" variant="ghost" onClick={() => setLabQuestions(labQuestions.filter((item) => item.id !== question.id))}>حذف السؤال</Button>}</div>)}
        {labQuestions.length < 5 && <Button type="button" variant="outline" onClick={() => setLabQuestions([...labQuestions, makeLabQuestion()])}>إضافة سؤال</Button>}
        <Button type="submit">حفظ التجربة</Button>
      </form>
    </CardContent></Card>

    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardHeader><CardTitle>النصوص المضافة ({readings.length})</CardTitle></CardHeader><CardContent>{readings.map((reading) => <div key={reading.id} className="border-b py-2"><b>{reading.title}</b><p className="text-xs text-muted-foreground">{reading.questions?.length || 0} أسئلة</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>التجارب المضافة ({labs.length})</CardTitle></CardHeader><CardContent>{labs.map((lab) => <div key={lab.id} className="border-b py-2"><b>{lab.title}</b><p className="text-xs text-muted-foreground">{lab.question_set?.length || 2} أسئلة، والفيديو داخل الموقع</p></div>)}</CardContent></Card>
    </div>
  </main>;
}
