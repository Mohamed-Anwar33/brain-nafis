import { BookOpen, CheckCircle2, CircleHelp, Leaf, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface ReadingChoice {
  id: string;
  text: string;
}

export interface ReadingQuestionItem {
  id: string;
  text: string;
  question_order: number;
  choices: ReadingChoice[];
}

export interface ReadingPassageItem {
  id: string;
  title: string;
  passage: string;
  image_url?: string | null;
  questions: ReadingQuestionItem[];
}

interface ReadingPassageDesignSystemProps {
  reading: ReadingPassageItem;
  passageNumber: number;
  selectedAnswers: Record<string, string>;
  results: Record<string, boolean>;
  onAnswerChange: (questionId: string, choiceId: string) => void;
  onCheckAnswer: (question: ReadingQuestionItem) => void;
}

const choiceTones = [
  "border-emerald-200 bg-emerald-50/75 hover:border-emerald-300 hover:bg-emerald-50",
  "border-sky-200 bg-sky-50/75 hover:border-sky-300 hover:bg-sky-50",
  "border-amber-200 bg-amber-50/75 hover:border-amber-300 hover:bg-amber-50",
  "border-violet-200 bg-violet-50/75 hover:border-violet-300 hover:bg-violet-50",
];

const scienceTerms = [
  "التنفس الخلوي", "البناء الضوئي", "الغدد الصماء", "ثاني أكسيد الكربون", "الكلوروفيل",
  "الغدة النخامية", "هرمون النمو", "الهرمونات", "الجلوكوز", "الأكسجين", "الخلية", "الطاقة", "الهرمون",
];
const escapedTerms = scienceTerms
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const scienceTermPattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
const scienceTermSet = new Set(scienceTerms.map((term) => term.toLocaleLowerCase("ar")));

function renderHighlightedParagraph(text: string, key: string) {
  return text.split(scienceTermPattern).map((part, index) => scienceTermSet.has(part.toLocaleLowerCase("ar"))
    ? <mark key={`${key}-${index}`} className="rounded-md bg-amber-100 px-1 font-bold text-indigo-950 decoration-amber-400">{part}</mark>
    : <span key={`${key}-${index}`}>{part}</span>);
}

function renderPassage(text: string) {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map((paragraph, index) => (
    <p key={`passage-paragraph-${index}`} className="whitespace-pre-wrap text-right text-[18px] font-medium leading-[2.05] text-slate-800 sm:text-[20px] sm:leading-[2.15]">
      {renderHighlightedParagraph(paragraph, `passage-${index}`)}
    </p>
  ));
}

export function ReadingPassageDesignSystem({
  reading,
  passageNumber,
  selectedAnswers,
  results,
  onAnswerChange,
  onCheckAnswer,
}: ReadingPassageDesignSystemProps) {
  const questions = (reading.questions || []).slice().sort((a, b) => a.question_order - b.question_order);

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-xl shadow-indigo-950/5">
      <CardHeader className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-l from-violet-100 via-sky-50 to-emerald-50 px-5 py-6 sm:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full border border-violet-300/40" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-5 -top-7 h-24 w-24 rounded-full border border-dashed border-sky-300/50" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-800/20">
              {passageNumber % 2 === 0 ? <Sparkles className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
            </span>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-extrabold text-indigo-700">قطعة القراءة {passageNumber} · الفهم القرائي العلمي</p>
              <h2 className="text-xl font-black leading-relaxed text-slate-950 sm:text-2xl">{reading.title}</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">اقرئي النص، واكتشفي الأفكار، ثم اختاري الإجابة الأدق.</p>
            </div>
          </div>
          <span className="rounded-full border border-white/90 bg-white/85 px-3.5 py-2 text-sm font-black text-violet-800 shadow-sm">
            {questions.length} {questions.length === 2 ? "سؤالان" : "أسئلة"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-7 p-4 sm:p-7">
        {reading.image_url && (
          <img src={reading.image_url} alt={`صورة توضيحية: ${reading.title}`} className="max-h-80 w-full rounded-2xl border border-indigo-100 bg-white object-contain" />
        )}

        <article aria-label={`النص القرائي: ${reading.title}`} className="overflow-hidden rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-[#fffdf6] via-white to-[#f1fbf7] p-5 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3.5 py-2 text-sm font-black text-emerald-800">
              <BookOpen className="h-4 w-4" /> النص القرائي · معلومات علمية
            </div>
            <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5 text-amber-600/70"><Sparkles className="h-4 w-4" /><Leaf className="h-4 w-4" /></div>
          </div>
          <div className="space-y-5">{renderPassage(reading.passage)}</div>
          <div aria-hidden="true" className="mt-6 flex justify-center gap-2 text-emerald-600/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="h-1.5 w-8 rounded-full bg-amber-300" /><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /></div>
        </article>

        <section aria-label={`أسئلة قطعة ${reading.title}`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-black text-indigo-950 sm:text-xl"><Sparkles className="h-5 w-5 text-amber-500" />أسئلة الفهم والاستيعاب</h3>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700">اختاري إجابة واحدة لكل سؤال</span>
          </div>

          {questions.map((question, questionIndex) => {
            const result = results[question.id];
            return (
              <div key={question.id} className="rounded-3xl border border-indigo-100 border-r-4 border-r-violet-400 bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-4 flex items-start gap-3 text-right text-lg font-black leading-relaxed text-slate-900 sm:text-xl">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm text-white shadow-md">{questionIndex + 1}</span>
                  <span>{question.text}</span>
                </p>
                <RadioGroup dir="rtl" value={selectedAnswers[question.id] || ""} onValueChange={(choiceId) => onAnswerChange(question.id, choiceId)} className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {(question.choices || []).map((choice, choiceIndex) => {
                    const isSelected = selectedAnswers[question.id] === choice.id;
                    return (
                      <Label key={choice.id} htmlFor={`${question.id}-${choice.id}`} className={`grid min-h-[58px] cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border p-3.5 text-right text-base font-bold leading-relaxed text-slate-800 transition-all sm:p-4 sm:text-lg ${isSelected ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100" : choiceTones[choiceIndex % choiceTones.length]}`}>
                        <RadioGroupItem id={`${question.id}-${choice.id}`} value={choice.id} className="h-5 w-5 border-2 border-indigo-800" />
                        <span>{choice.text}</span>
                      </Label>
                    );
                  })}
                </RadioGroup>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" onClick={() => onCheckAnswer(question)} className="h-12 rounded-xl bg-violet-700 px-6 text-base font-black shadow-md shadow-violet-700/15 hover:bg-violet-800">تحققي من الإجابة</Button>
                  {result !== undefined && (
                    <p role="status" className={`flex items-center gap-2 font-black ${result ? "text-emerald-700" : "text-rose-700"}`}>
                      {result ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      {result ? "إجابة صحيحة، أحسنتِ!" : "إجابة غير صحيحة، أعيدي قراءة القطعة وحاولي مجددًا."}
                    </p>
                  )}
                  {result === undefined && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><CircleHelp className="h-4 w-4" />لن تظهر النتيجة حتى تتحققي من إجابتك</span>}
                </div>
              </div>
            );
          })}
        </section>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm font-bold leading-relaxed text-violet-900">
          🌈 خذي وقتك في القراءة؛ فهم الفكرة يساعدك على اختيار الإجابة بثقة.
        </div>
      </CardContent>
    </Card>
  );
}
