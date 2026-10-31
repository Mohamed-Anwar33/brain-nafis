import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookOpenCheck, LoaderCircle, Minus, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface SkillAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string | null;
}

interface AttemptRow {
  id: string;
  finished_at: string | null;
}

interface SkillAnswerRow {
  attempt_id: string;
  question_id: string;
  is_correct: boolean | null;
  is_practice: boolean | null;
  response_order: number | null;
  answered_at: string | null;
  scientific_skill?: string | null;
  questions: { scientific_skill: string | null } | null;
}

const getAnswerSkill = (answer: SkillAnswerRow) =>
  answer.scientific_skill?.trim() || answer.questions?.scientific_skill?.trim() || "";

interface SkillScore {
  skill: string;
  correct: number;
  total: number;
  percentage: number;
}

function summarizeAttemptAnswers(answers: SkillAnswerRow[]) {
  const latestPerQuestion = new Map<string, SkillAnswerRow>();
  for (const answer of answers) {
    if (answer.is_practice || !getAnswerSkill(answer)) continue;
    const previous = latestPerQuestion.get(answer.question_id);
    const order = answer.response_order ?? (Date.parse(answer.answered_at || "") || 0);
    const previousOrder = previous?.response_order ?? (Date.parse(previous?.answered_at || "") || 0);
    if (!previous || order >= previousOrder) latestPerQuestion.set(answer.question_id, answer);
  }

  const groups = new Map<string, { correct: number; total: number }>();
  for (const answer of latestPerQuestion.values()) {
    const skill = getAnswerSkill(answer);
    if (!skill) continue;
    const group = groups.get(skill) || { correct: 0, total: 0 };
    group.total += 1;
    if (answer.is_correct) group.correct += 1;
    groups.set(skill, group);
  }

  return Array.from(groups, ([skill, group]) => ({
    skill,
    correct: group.correct,
    total: group.total,
    percentage: Math.round((group.correct / group.total) * 100),
  }));
}

function summarizeSkillHistory(answers: SkillAnswerRow[]): SkillScore[] {
  const latestPerAttemptQuestion = new Map<string, SkillAnswerRow>();
  for (const answer of answers) {
    if (answer.is_practice || !getAnswerSkill(answer)) continue;
    const key = `${answer.attempt_id}:${answer.question_id}`;
    const previous = latestPerAttemptQuestion.get(key);
    const order = answer.response_order ?? (Date.parse(answer.answered_at || "") || 0);
    const previousOrder = previous?.response_order ?? (Date.parse(previous?.answered_at || "") || 0);
    if (!previous || order >= previousOrder) latestPerAttemptQuestion.set(key, answer);
  }
  const groups = new Map<string, { correct: number; total: number }>();
  for (const answer of latestPerAttemptQuestion.values()) {
    const skill = getAnswerSkill(answer);
    if (!skill) continue;
    const group = groups.get(skill) || { correct: 0, total: 0 };
    group.total += 1;
    if (answer.is_correct) group.correct += 1;
    groups.set(skill, group);
  }
  return Array.from(groups, ([skill, group]) => ({
    skill,
    correct: group.correct,
    total: group.total,
    percentage: Math.round((group.correct / group.total) * 100),
  })).sort((a, b) => a.percentage - b.percentage);
}

export function SkillAnalysisModal({ isOpen, onClose, studentName }: SkillAnalysisModalProps) {
  const [attempts, setAttempts] = useState<Array<{ id: string; skills: SkillScore[] }>>([]);
  const [skillHistory, setSkillHistory] = useState<SkillScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentName?.trim()) return;
    let cancelled = false;
    const loadAnalysis = async () => {
      setLoading(true);
      setAttempts([]);
      setSkillHistory([]);
      setHasError(false);
      try {
        const rows: AttemptRow[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data: attemptRows, error: attemptsError } = await supabase
            .from("attempts")
            .select("id,finished_at")
            .eq("student_name", studentName.trim())
            .not("finished_at", "is", null)
            .order("finished_at", { ascending: false })
            .range(offset, offset + 499);
          if (attemptsError) throw attemptsError;
          const page = (attemptRows || []) as AttemptRow[];
          rows.push(...page);
          if (page.length < 500) break;
        }
        if (!rows.length) {
          if (!cancelled) setAttempts([]);
          return;
        }

        const answerRows: SkillAnswerRow[] = [];
        for (let offset = 0; offset < rows.length; offset += 100) {
          const attemptIds = rows.slice(offset, offset + 100).map((row) => row.id);
          const { data: answerPage, error: answersError } = await supabase
            .from("attempt_answers")
            .select("attempt_id,question_id,is_correct,is_practice,response_order,answered_at,scientific_skill,questions(scientific_skill)")
            .in("attempt_id", attemptIds)
            .order("response_order", { ascending: true });
          if (answersError) throw answersError;
          answerRows.push(...((answerPage || []) as unknown as SkillAnswerRow[]));
        }

        const byAttempt = new Map<string, SkillAnswerRow[]>();
        for (const answer of answerRows) {
          const list = byAttempt.get(answer.attempt_id) || [];
          list.push(answer);
          byAttempt.set(answer.attempt_id, list);
        }
        if (!cancelled) {
          setAttempts(rows.slice(0, 2).map((row) => ({ id: row.id, skills: summarizeAttemptAnswers(byAttempt.get(row.id) || []) })));
          setSkillHistory(summarizeSkillHistory(answerRows));
        }
      } catch (error) {
        console.error("Could not load student skill analysis:", error);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadAnalysis();
    return () => { cancelled = true; };
  }, [isOpen, studentName]);

  const latest = attempts[0]?.skills || [];
  const previous = attempts[1]?.skills || [];
  const previousBySkill = useMemo(() => new Map(previous.map((item) => [item.skill, item])), [previous]);
  const strengths = skillHistory.filter((item) => item.percentage >= 80).sort((a, b) => b.percentage - a.percentage);
  const needsPractice = skillHistory.filter((item) => item.percentage < 60);
  const improving = latest
    .map((item) => ({ ...item, change: item.percentage - (previousBySkill.get(item.skill)?.percentage ?? item.percentage) }))
    .filter((item) => previousBySkill.has(item.skill))
    .sort((a, b) => b.change - a.change);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-2xl sm:p-8" dir="rtl">
        <DialogHeader className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900">الإخفاق والارتفاع • تحليل المهارات</DialogTitle>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">تابعي نقاط التميز والمهارات التي تحتاج إلى تدريب، ولاحظي تطور أدائك بين المحاولات.</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 font-bold text-indigo-700"><LoaderCircle className="h-5 w-5 animate-spin" /> جارٍ تحليل إجاباتك...</div>
        ) : hasError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center font-bold text-rose-800">تعذر تحميل تحليل المهارات الآن. حاولي مرة أخرى لاحقًا.</div>
        ) : !skillHistory.length ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6 text-center">
            <Target className="mx-auto mb-2 h-8 w-8 text-indigo-500" />
            <p className="font-black text-slate-800">سيظهر تحليل مهاراتك بعد إكمال اختبار مرتبط بمهارات علمية.</p>
            <p className="mt-1 text-sm font-bold text-slate-500">ابدئي الاختبار، وسنعرض لكِ نقاط القوة وما يحتاج إلى مراجعة.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-indigo-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-indigo-950">نسبك التراكمية في كل مهارة</h3>
                <span className="text-[11px] font-bold text-slate-500">محفوظة من محاولاتك المكتملة</span>
              </div>
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillHistory} margin={{ top: 8, right: 8, bottom: 34, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="skill" angle={-22} textAnchor="end" interval={0} height={52} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`${Number(value)}%`, "نسبة الإجابات الصحيحة"]} />
                    <Bar dataKey="percentage" name="نسبة الإتقان" fill="#4f46e5" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-black text-emerald-900"><TrendingUp className="h-5 w-5" /> مهارات أتقنتِها عبر محاولاتك</h3>
              {strengths.length ? <div className="space-y-2">{strengths.map((item) => <SkillRow key={item.skill} item={item} tone="green" />)}</div> : <p className="text-sm font-bold text-emerald-800">واصلي التدريب؛ ستظهر المهارات المتقنة عند بلوغ دقتها 80٪.</p>}
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-black text-amber-900"><Target className="h-5 w-5" /> مهارات تحتاج إلى مراجعة</h3>
              {needsPractice.length ? <div className="space-y-2">{needsPractice.map((item) => <SkillRow key={item.skill} item={item} tone="amber" />)}</div> : <p className="text-sm font-bold text-amber-800">أداء رائع! لا توجد مهارات أقل من 60٪ في إجاباتك المحفوظة.</p>}
            </section>

            <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-black text-sky-900"><TrendingUp className="h-5 w-5" /> الإخفاق والارتفاع</h3>
              {attempts.length < 2 ? <p className="text-sm font-bold text-sky-800">أكملي اختبارًا آخر لنقارن أداءك بالمحاولة السابقة.</p> : improving.length ? (
                <div className="space-y-2">{improving.map((item) => <div key={item.skill} className="flex items-center justify-between gap-3 rounded-xl bg-white/80 p-3"><span className="font-black text-slate-800">{item.skill}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${item.change > 0 ? "bg-emerald-100 text-emerald-800" : item.change < 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>{item.change > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : item.change < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}{item.change > 0 ? `تحسن ${item.change}%` : item.change < 0 ? `تراجع ${Math.abs(item.change)}%` : "ثابتة"}</span></div>)}</div>
              ) : <p className="text-sm font-bold text-sky-800">لا توجد مهارات مشتركة بين آخر اختبارين للمقارنة.</p>}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SkillRow({ item, tone }: { item: SkillScore; tone: "green" | "amber" }) {
  const styles = tone === "green"
    ? { text: "text-emerald-700", bar: "bg-emerald-500" }
    : { text: "text-amber-700", bar: "bg-amber-500" };
  return (
    <div className="rounded-xl bg-white/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-3"><span className="font-black text-slate-800">{item.skill}</span><span className={`text-sm font-black ${styles.text}`}>{item.percentage}% <span className="text-xs font-bold text-slate-500">({item.correct}/{item.total})</span></span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${styles.bar}`} style={{ width: `${item.percentage}%` }} /></div>
    </div>
  );
}
