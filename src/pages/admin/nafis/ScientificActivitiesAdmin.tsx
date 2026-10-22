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
type ReadingAdminRow = { id: string; title: string; questions?: Array<{ id: string }> };
type LabAdminRow = { id: string; title: string; display_mode: "iframe" | "external" };
const makeChoices = (): ChoiceDraft[] => [{ id: crypto.randomUUID(), text: "", correct: true }, { id: crypto.randomUUID(), text: "", correct: false }, { id: crypto.randomUUID(), text: "", correct: false }, { id: crypto.randomUUID(), text: "", correct: false }];

export default function ScientificActivitiesAdmin() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [readings, setReadings] = useState<ReadingAdminRow[]>([]);
  const [labs, setLabs] = useState<LabAdminRow[]>([]);
  const [title, setTitle] = useState(""); const [passage, setPassage] = useState(""); const [readingDomain, setReadingDomain] = useState(""); const [readingQuestions, setReadingQuestions] = useState([{ id: crypto.randomUUID(), text: "", choices: makeChoices() }]);
  const [labTitle, setLabTitle] = useState(""); const [labDomain, setLabDomain] = useState(""); const [concept, setConcept] = useState(""); const [instructions, setInstructions] = useState(""); const [url, setUrl] = useState(""); const [mode, setMode] = useState("external"); const [beforeQuestion, setBeforeQuestion] = useState(""); const [beforeChoices, setBeforeChoices] = useState(makeChoices()); const [afterQuestion, setAfterQuestion] = useState(""); const [afterChoices, setAfterChoices] = useState(makeChoices());

  const refresh = async () => {
    const [{ data: r }, { data: l }] = await Promise.all([supabase.from("scientific_readings").select("*,questions:scientific_reading_questions(*)").order("created_at", { ascending: false }), supabase.from("virtual_lab_activities").select("*").order("created_at", { ascending: false })]);
    setReadings((r || []) as unknown as ReadingAdminRow[]); setLabs((l || []) as unknown as LabAdminRow[]);
  };
  useEffect(() => { void (async () => { const { data } = await supabase.from("central_domains").select("id,name,grade_subject_id").order("sort_order"); setDomains((data || []) as Domain[]); await refresh(); })(); }, []);

  const saveReading = async (event: React.FormEvent) => {
    event.preventDefault();
    const validQuestions = readingQuestions.filter((question) => question.text.trim() && question.choices.filter((choice) => choice.text.trim()).length >= 2 && question.choices.some((choice) => choice.correct && choice.text.trim()));
    if (!validQuestions.length) { toast.error("أضيفي سؤالًا واحدًا على الأقل بخيارين وإجابة صحيحة"); return; }
    const { data, error } = await supabase.from("scientific_readings").insert({ title, passage, domain_id: readingDomain || null, grade_subject_id: domains.find((domain) => domain.id === readingDomain)?.grade_subject_id || null }).select("id").single();
    if (error) { toast.error("تعذر حفظ النص العلمي"); return; }
    for (const [index, question] of validQuestions.entries()) {
      const choices = question.choices.filter((choice) => choice.text.trim());
      const { data: inserted, error: questionError } = await supabase.from("scientific_reading_questions").insert({ reading_id: data.id, text: question.text, question_order: index + 1, choices: choices.map(({ id, text }) => ({ id, text })) }).select("id").single();
      if (questionError || !inserted) { await supabase.from("scientific_readings").delete().eq("id", data.id); toast.error("تعذر حفظ أسئلة النص"); return; }
      const correct = choices.find((choice) => choice.correct)!;
      const { error: keyError } = await supabase.from("scientific_reading_answer_keys").insert({ question_id: inserted.id, correct_choice_id: correct.id });
      if (keyError) { await supabase.from("scientific_readings").delete().eq("id", data.id); toast.error("تعذر حفظ مفتاح الإجابة"); return; }
    }
    toast.success("تمت إضافة النص وأسئلته"); setTitle(""); setPassage(""); setReadingQuestions([{ id: crypto.randomUUID(), text: "", choices: makeChoices() }]); await refresh();
  };

  const saveLab = async (event: React.FormEvent) => {
    event.preventDefault();
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { toast.error("أدخلي رابط محاكاة صالحًا"); return; }
    if (parsedUrl.protocol !== "https:") { toast.error("يجب أن يبدأ رابط المحاكاة بـ HTTPS"); return; }
    const before = beforeChoices.find((choice) => choice.correct && choice.text.trim()); const after = afterChoices.find((choice) => choice.correct && choice.text.trim());
    if (!before || !after) { toast.error("حددي إجابة صحيحة للسؤالين القبلي والبعدي"); return; }
    const { data: inserted, error } = await supabase.from("virtual_lab_activities").insert({ title: labTitle, domain_id: labDomain || null, grade_subject_id: domains.find((domain) => domain.id === labDomain)?.grade_subject_id || null, scientific_concept: concept || null, instructions, simulation_url: parsedUrl.toString(), display_mode: mode, before_question: beforeQuestion, before_choices: beforeChoices.filter((choice) => choice.text.trim()).map(({ id, text }) => ({ id, text })), after_question: afterQuestion, after_choices: afterChoices.filter((choice) => choice.text.trim()).map(({ id, text }) => ({ id, text })) }).select("id").single();
    if (error || !inserted) { toast.error("تعذر حفظ التجربة الافتراضية"); return; }
    const { error: keyError } = await supabase.from("virtual_lab_answer_keys").insert({ activity_id: inserted.id, before_correct_answer: before.id, after_correct_answer: after.id });
    if (keyError) { await supabase.from("virtual_lab_activities").delete().eq("id", inserted.id); toast.error("تعذر حفظ مفتاح إجابة التجربة"); return; }
    toast.success("تمت إضافة التجربة الافتراضية"); setLabTitle(""); setInstructions(""); setUrl(""); setBeforeQuestion(""); setAfterQuestion(""); await refresh();
  };

  const renderChoiceEditor = (choices: ChoiceDraft[], setChoices: (value: ChoiceDraft[]) => void) => <div className="space-y-2">{choices.map((choice, index) => <div className="flex items-center gap-2" key={choice.id}><input type="radio" name={`correct-${choices[0]?.id}`} checked={choice.correct} onChange={() => setChoices(choices.map((item) => ({ ...item, correct: item.id === choice.id })))} aria-label="الإجابة الصحيحة" /><Input value={choice.text} onChange={(event) => setChoices(choices.map((item) => item.id === choice.id ? { ...item, text: event.target.value } : item))} placeholder={`الخيار ${index + 1}`} /></div>)}<Button type="button" variant="outline" size="sm" onClick={() => setChoices([...choices, { id: crypto.randomUUID(), text: "", correct: false }])}>إضافة خيار</Button></div>;

  return <div dir="rtl" className="mx-auto max-w-5xl space-y-8 p-4">
    <header><h1 className="text-3xl font-black">الفهم القرائي والمختبر الافتراضي</h1><p className="mt-2 text-muted-foreground">أضيفي نصًا علميًا مرتبطًا بعدة أسئلة أو تجربة مرتبطة بمحاكاة وسؤالين قبلي وبعدي.</p></header>
    <Card><CardHeader><CardTitle>إضافة نص علمي وأسئلته</CardTitle></CardHeader><CardContent><form onSubmit={(event) => void saveReading(event)} className="space-y-4"><Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان النص" /><Select value={readingDomain || "none"} onValueChange={(value) => setReadingDomain(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="المجال العلمي" /></SelectTrigger><SelectContent><SelectItem value="none">اختياري — كل المجالات</SelectItem>{domains.map((domain) => <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>)}</SelectContent></Select><Textarea required value={passage} onChange={(event) => setPassage(event.target.value)} placeholder="محتوى القطعة العلمية" className="min-h-40" />{readingQuestions.map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border p-4"><Label>السؤال {index + 1}</Label><Input value={question.text} onChange={(event) => setReadingQuestions(readingQuestions.map((item) => item.id === question.id ? { ...item, text: event.target.value } : item))} placeholder="نص السؤال" />{renderChoiceEditor(question.choices, (choices) => setReadingQuestions(readingQuestions.map((item) => item.id === question.id ? { ...item, choices } : item)))}</div>)}<Button type="button" variant="outline" onClick={() => setReadingQuestions([...readingQuestions, { id: crypto.randomUUID(), text: "", choices: makeChoices() }])}>إضافة سؤال للنص</Button><Button type="submit">حفظ النص وأسئلته</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>إضافة تجربة محاكاة</CardTitle></CardHeader><CardContent><form onSubmit={(event) => void saveLab(event)} className="space-y-4"><Input required value={labTitle} onChange={(event) => setLabTitle(event.target.value)} placeholder="عنوان التجربة" /><Select value={labDomain || "none"} onValueChange={(value) => setLabDomain(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="المجال العلمي" /></SelectTrigger><SelectContent><SelectItem value="none">اختياري — كل المجالات</SelectItem>{domains.map((domain) => <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>)}</SelectContent></Select><Input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="المفهوم العلمي" /><Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="تعليمات الطالبة داخل المحاكاة" /><Input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="رابط المحاكاة" dir="ltr" /><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="external">فتح في تبويب خارجي</SelectItem><SelectItem value="iframe">عرض داخل المنصة</SelectItem></SelectContent></Select><div className="space-y-2 rounded-xl border p-4"><Label>سؤال قبل التجربة (توقعي)</Label><Input required value={beforeQuestion} onChange={(event) => setBeforeQuestion(event.target.value)} placeholder="السؤال القبلي" />{renderChoiceEditor(beforeChoices, setBeforeChoices)}</div><div className="space-y-2 rounded-xl border p-4"><Label>سؤال بعد التجربة (استنتجي)</Label><Input required value={afterQuestion} onChange={(event) => setAfterQuestion(event.target.value)} placeholder="السؤال البعدي" />{renderChoiceEditor(afterChoices, setAfterChoices)}</div><Button type="submit">حفظ التجربة</Button></form></CardContent></Card>
    <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>النصوص المضافة ({readings.length})</CardTitle></CardHeader><CardContent>{readings.map((reading) => <div key={reading.id} className="border-b py-2"><b>{reading.title}</b><p className="text-xs text-muted-foreground">{reading.questions?.length || 0} أسئلة</p></div>)}</CardContent></Card><Card><CardHeader><CardTitle>التجارب المضافة ({labs.length})</CardTitle></CardHeader><CardContent>{labs.map((lab) => <div key={lab.id} className="border-b py-2"><b>{lab.title}</b><p className="text-xs text-muted-foreground">{lab.display_mode === "iframe" ? "داخل المنصة" : "رابط خارجي"}</p></div>)}</CardContent></Card></div>
  </div>;
}
