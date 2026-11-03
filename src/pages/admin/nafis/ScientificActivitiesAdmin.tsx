import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

type Domain = { id: string; name: string; grade_subject_id: string };
type ChoiceDraft = { id: string; text: string; correct: boolean };
type ReadingQuestionDraft = { id: string; text: string; choices: ChoiceDraft[] };
type LabQuestionDraft = { id: string; text: string; choices: ChoiceDraft[] };
type ReadingAdminRow = { id: string; title: string; questions?: Array<{ id: string }> };
type LabAdminRow = {
  id: string; title: string; display_mode: "iframe" | "external"; question_set?: LabQuestionDraft[];
  domain_id?: string | null; scientific_concept?: string | null; instructions?: string;
  simulation_url?: string; before_question?: string; before_choices?: ChoiceDraft[];
  after_question?: string; after_choices?: ChoiceDraft[];
  answer_keys?: { question_answer_keys?: Record<string, string>; before_correct_answer?: string; after_correct_answer?: string } | null;
};

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
  const [readingImageUrl, setReadingImageUrl] = useState("");
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
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [savingLab, setSavingLab] = useState(false);

  const refresh = async () => {
    const [{ data: readingData, error: readingError }, { data: labData, error: labError }] = await Promise.all([
      supabase.from("scientific_readings").select("*,questions:scientific_reading_questions(*)").order("created_at", { ascending: false }),
      supabase.from("virtual_lab_activities").select("id,title,display_mode,question_set,domain_id,scientific_concept,instructions,simulation_url,before_question,before_choices,after_question,after_choices,answer_keys:virtual_lab_answer_keys(question_answer_keys,before_correct_answer,after_correct_answer)").order("created_at", { ascending: false }),
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

  const resetLabForm = () => {
    setEditingLabId(null); setLabTitle(""); setLabDomain(""); setConcept(""); setInstructions(""); setVideoUrl("");
    setLabQuestions(Array.from({ length: 4 }, makeLabQuestion));
  };

  const editLab = (lab: LabAdminRow) => {
    const answerKeyMap = lab.answer_keys?.question_answer_keys || {};
    const questions = lab.question_set?.length ? lab.question_set : [{
      id: "legacy-before", text: lab.before_question || "", choices: (lab.before_choices || []).map((choice) => ({ ...choice, correct: choice.id === (lab.answer_keys?.before_correct_answer || answerKeyMap["legacy-before"]) })),
    }, {
      id: "legacy-after", text: lab.after_question || "", choices: (lab.after_choices || []).map((choice) => ({ ...choice, correct: choice.id === (lab.answer_keys?.after_correct_answer || answerKeyMap["legacy-after"]) })),
    }];
    setEditingLabId(lab.id);
    setLabTitle(lab.title);
    setLabDomain(lab.domain_id || "");
    setConcept(lab.scientific_concept || "");
    setInstructions(lab.instructions || "");
    setVideoUrl(lab.simulation_url || "");
    setLabQuestions(questions.map((question) => ({
      ...question,
      choices: question.choices.map((choice) => ({ ...choice, correct: choice.id === answerKeyMap[question.id] || choice.correct })),
    })));
    document.getElementById("virtual-lab-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveReading = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = readingQuestions.filter((question) => question.text.trim()
      && question.choices.filter((choice) => choice.text.trim()).length >= 2
      && question.choices.some((choice) => choice.correct && choice.text.trim()));
    if (!title.trim() || !passage.trim() || valid.length < 4 || valid.length > 6) {
      toast.error("أدخلي النص ومعه من ٤ إلى ٦ أسئلة مكتملة");
      return;
    }
    let imageUrl: string | null = null;
    if (readingImageUrl.trim()) {
      try {
        const parsed = new URL(readingImageUrl.trim());
        if (parsed.protocol !== "https:") throw new Error();
        imageUrl = parsed.toString();
      } catch {
        toast.error("رابط الصورة يجب أن يكون رابط HTTPS صالحًا");
        return;
      }
    }
    const { data: reading, error } = await supabase.from("scientific_readings").insert({
      title: title.trim(), passage: passage.trim(), image_url: imageUrl, domain_id: readingDomain || null,
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
    setTitle(""); setPassage(""); setReadingImageUrl(""); setReadingQuestions(Array.from({ length: 4 }, makeReadingQuestion));
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
    setSavingLab(true);
    const activityPayload = {
      title: labTitle.trim(), domain_id: labDomain || null,
      grade_subject_id: domains.find((domain) => domain.id === labDomain)?.grade_subject_id || null,
      scientific_concept: concept.trim() || null, instructions: instructions.trim(),
      simulation_url: parsedUrl.toString(), display_mode: "iframe",
      question_set: questionSet,
      // Keep these legacy columns populated for compatibility with existing readers.
      before_question: first.text, before_choices: first.choices,
      after_question: first.text, after_choices: first.choices,
    };
    const { data: activity, error } = editingLabId
      ? await supabase.from("virtual_lab_activities").update(activityPayload).eq("id", editingLabId).select("id").single()
      : await supabase.from("virtual_lab_activities").insert(activityPayload).select("id").single();
    if (error || !activity) { setSavingLab(false); toast.error(editingLabId ? "تعذر تعديل التجربة" : "تعذر حفظ تجربة الفيديو"); return; }
    const { error: keysError } = await supabase.from("virtual_lab_answer_keys").upsert({
      activity_id: activity.id,
      before_correct_answer: answerKeys[first.id],
      after_correct_answer: answerKeys[first.id],
      question_answer_keys: answerKeys,
    });
    if (keysError) {
      setSavingLab(false);
      toast.error("حُفظت بيانات التجربة لكن تعذر تحديث مفاتيح الإجابات؛ أعد المحاولة أو تواصل مع الدعم."); return;
    }
    setSavingLab(false);
    toast.success(editingLabId ? "تم تعديل التجربة وأسئلتها" : "تمت إضافة التجربة وأسئلتها");
    resetLabForm();
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
        <Input type="url" value={readingImageUrl} onChange={(event) => setReadingImageUrl(event.target.value)} placeholder="رابط صورة توضيحية للقطعة (اختياري — HTTPS)" dir="ltr" />
        {readingQuestions.map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><Label>السؤال {index + 1}</Label><Input value={question.text} onChange={(event) => updateReadingQuestion(question.id, { text: event.target.value })} placeholder="نص السؤال" />{renderChoiceEditor(question.choices, (choices) => updateReadingQuestion(question.id, { choices }), `reading-${question.id}`)}{readingQuestions.length > 4 && <Button type="button" variant="ghost" onClick={() => setReadingQuestions(readingQuestions.filter((item) => item.id !== question.id))}>حذف السؤال</Button>}</div>)}
        {readingQuestions.length < 6 && <Button type="button" variant="outline" onClick={() => setReadingQuestions([...readingQuestions, makeReadingQuestion()])}>إضافة سؤال للنص</Button>}
        <Button type="submit">حفظ النص وأسئلته</Button>
      </form>
    </CardContent></Card>

    <Card id="virtual-lab-form"><CardHeader><CardTitle>{editingLabId ? "تعديل التجربة" : "إضافة تجربة «استكشفي وجربي»"}</CardTitle></CardHeader><CardContent>
      <form onSubmit={(event) => void saveLab(event)} className="space-y-4">
        <Input required value={labTitle} onChange={(event) => setLabTitle(event.target.value)} placeholder="عنوان التجربة" />
        <Select value={labDomain || "none"} onValueChange={(value) => setLabDomain(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="المجال العلمي" /></SelectTrigger><SelectContent><SelectItem value="none">اختياري — كل المجالات</SelectItem>{domains.map((domain) => <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>)}</SelectContent></Select>
        <Input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="المفهوم العلمي" />
        <Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="تعليمات الطالبة قبل مشاهدة الفيديو" />
        <Input required type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="رابط الفيديو (يُعرض داخل الموقع)" dir="ltr" />
        <p className="text-sm text-muted-foreground">الطالبة تجيب عن ٤ أو ٥ أسئلة، تشاهد الفيديو، ثم تجيب عن الأسئلة نفسها لقياس التحسن.</p>
        {labQuestions.map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><Label>السؤال {index + 1} — يظهر قبل الفيديو وبعده</Label><Input required value={question.text} onChange={(event) => updateLabQuestion(question.id, { text: event.target.value })} placeholder="نص السؤال" />{renderChoiceEditor(question.choices, (choices) => updateLabQuestion(question.id, { choices }), `lab-${question.id}`)}{labQuestions.length > 4 && <Button type="button" variant="ghost" onClick={() => setLabQuestions(labQuestions.filter((item) => item.id !== question.id))}>حذف السؤال</Button>}</div>)}
        {labQuestions.length < 5 && <Button type="button" variant="outline" onClick={() => setLabQuestions([...labQuestions, makeLabQuestion()])}>إضافة سؤال</Button>}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={savingLab}>{savingLab ? "جارٍ الحفظ…" : editingLabId ? "حفظ التعديلات" : "حفظ التجربة"}</Button>{editingLabId && <Button type="button" variant="outline" onClick={resetLabForm}><X className="ml-2 h-4 w-4" />إلغاء التعديل</Button>}</div>
      </form>
    </CardContent></Card>

    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardHeader><CardTitle>النصوص المضافة ({readings.length})</CardTitle></CardHeader><CardContent>{readings.map((reading) => <div key={reading.id} className="border-b py-2"><b>{reading.title}</b><p className="text-xs text-muted-foreground">{reading.questions?.length || 0} أسئلة</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>التجارب المضافة ({labs.length})</CardTitle></CardHeader><CardContent>{labs.map((lab) => <div key={lab.id} className="flex items-center justify-between gap-3 border-b py-3"><div><b>{lab.title}</b><p className="text-xs text-muted-foreground">{lab.question_set?.length || 2} أسئلة، والفيديو داخل الموقع</p></div><Button type="button" variant="outline" size="sm" onClick={() => editLab(lab)} aria-label={`تعديل تجربة ${lab.title}`}><Pencil className="ml-2 h-4 w-4" />تعديل</Button></div>)}</CardContent></Card>
    </div>
  </main>;
}
