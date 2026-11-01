import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleHelp, ClipboardCheck, Leaf, Sparkles, Trophy, XCircle } from "lucide-react";
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
  passageCount: number;
  selectedAnswers: Record<string, string>;
  results: Record<string, boolean>;
  onAnswerChange: (questionId: string, choiceId: string) => void;
  onCheckAnswer: (question: ReadingQuestionItem) => void;
  hasPreviousPassage?: boolean;
  hasNextPassage?: boolean;
  onPreviousPassage?: () => void;
  onNextPassage?: () => void;
}

const choiceTones = [
  "border-emerald-200 bg-emerald-50/75 hover:border-emerald-300 hover:bg-emerald-50",
  "border-sky-200 bg-sky-50/75 hover:border-sky-300 hover:bg-sky-50",
  "border-amber-200 bg-amber-50/75 hover:border-amber-300 hover:bg-amber-50",
  "border-violet-200 bg-violet-50/75 hover:border-violet-300 hover:bg-violet-50",
];

function renderPassage(text: string) {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map((paragraph, index) => (
    <p key={`passage-paragraph-${index}`} className="whitespace-pre-wrap text-right text-[18px] font-medium leading-[2.05] text-slate-800 sm:text-[20px] sm:leading-[2.15]">
      {paragraph}
    </p>
  ));
}

export function ReadingPassageDesignSystem({
  reading,
  passageNumber,
  passageCount,
  selectedAnswers,
  results,
  onAnswerChange,
  onCheckAnswer,
  hasPreviousPassage = false,
  hasNextPassage = false,
  onPreviousPassage,
  onNextPassage,
}: ReadingPassageDesignSystemProps) {
  const questions = (reading.questions || []).slice().sort((a, b) => a.question_order - b.question_order);
  const isSecondPassage = passageNumber === 2;
  const theme = isSecondPassage
    ? { banner: "from-teal-100 via-cyan-50 to-sky-100", icon: "from-teal-600 to-cyan-600", eyebrow: "text-teal-800", question: "border-r-teal-500", number: "from-teal-600 to-cyan-600", button: "bg-teal-700 hover:bg-teal-800 shadow-teal-700/15" }
    : { banner: "from-violet-100 via-sky-50 to-indigo-100", icon: "from-violet-600 to-indigo-600", eyebrow: "text-indigo-700", question: "border-r-violet-500", number: "from-violet-600 to-indigo-600", button: "bg-violet-700 hover:bg-violet-800 shadow-violet-700/15" };

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-xl shadow-indigo-950/5">
      <CardHeader className={`relative overflow-hidden border-b border-violet-100 bg-gradient-to-l ${theme.banner} px-5 py-5 sm:px-7 sm:py-6`}>
        <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full border border-violet-300/40" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-5 -top-7 h-24 w-24 rounded-full border border-dashed border-sky-300/50" />
        <div className="relative flex items-center justify-between gap-2 sm:gap-5">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3.5 py-2 text-sm font-black text-indigo-800 shadow-sm"><Sparkles className="h-4 w-4" /> وقت القراءة والاستكشاف</div>
              <p className={`mb-1 text-xs font-extrabold ${theme.eyebrow}`}>الاختبار {passageNumber} · الفهم القرائي العلمي</p>
              <h2 className="text-2xl font-black leading-relaxed text-slate-950 sm:text-3xl">{reading.title}</h2>
              <p className="mt-1 text-sm font-bold leading-7 text-slate-600">اقرأ النص، واكتشف الأفكار، ثم اختر الإجابة الأدق.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-xl border border-white bg-white/80 px-3 py-2 text-sm font-black text-indigo-900">📚 قطعة قرائية</span>
                <span className="rounded-xl border border-white bg-white/80 px-3 py-2 text-sm font-black text-violet-900">✨ {questions.length} أسئلة</span>
              </div>
            </div>
            <div className={`mt-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.icon} text-white shadow-lg sm:flex`}>
              {isSecondPassage ? <ClipboardCheck className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-7 p-4 sm:p-7">
        {reading.image_url && (
          <img src={reading.image_url} alt={`صورة توضيحية: ${reading.title}`} className="max-h-80 w-full rounded-2xl border border-indigo-100 bg-white object-contain" />
        )}

        <article aria-label={`النص القرائي: ${reading.title}`} className="relative overflow-hidden rounded-[1.75rem] border-2 border-indigo-100 bg-white p-5 shadow-[0_12px_35px_rgba(64,76,150,0.08)] sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-l from-violet-400 via-sky-400 to-teal-300" />
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-indigo-100 pb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-3.5 py-2 text-sm font-black text-indigo-800">
              <BookOpen className="h-4 w-4" /> النص القرائي · معلومات علمية
            </div>
            <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5 text-violet-500/70"><Sparkles className="h-4 w-4" /><Leaf className="h-4 w-4" /></div>
          </div>
          <div className="space-y-5">{renderPassage(reading.passage)}</div>
          <div aria-hidden="true" className="mt-6 flex items-center justify-between border-t border-indigo-100 pt-4"><div className="flex items-center gap-2 text-amber-500"><Sparkles className="h-4 w-4" /><span className="text-xs font-bold text-slate-500">رحلة المعرفة مستمرة</span></div><div className="flex items-center gap-2 text-indigo-500"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" /><span className="h-1.5 w-8 rounded-full bg-sky-300" /><span className="h-1.5 w-1.5 rounded-full bg-teal-400" /></div></div>
        </article>

        <section aria-label={`أسئلة قطعة ${reading.title}`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gradient-to-l from-violet-100 via-white to-sky-100 px-4 py-3">
            <h3 className="flex items-center gap-2 text-lg font-black text-indigo-950 sm:text-xl"><Trophy className="h-5 w-5 text-amber-500" />أسئلة الفهم والاستيعاب</h3>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700">اختر إجابة واحدة لكل سؤال</span>
          </div>

          {questions.map((question, questionIndex) => {
            const result = results[question.id];
            return (
              <div key={question.id} className={`relative rounded-3xl border border-indigo-100 border-r-[5px] ${theme.question} bg-white p-4 shadow-[0_8px_22px_rgba(64,76,150,0.07)] sm:p-5`}>
                <p className="mb-4 flex items-start gap-3 rounded-2xl bg-gradient-to-l from-indigo-50 via-white to-sky-50 px-3 py-3 text-right text-lg font-black leading-relaxed text-slate-900 sm:px-4 sm:text-xl">
                  <span className={`flex h-9 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.number} px-2 text-sm text-white shadow-md`}>س{questionIndex + 1}</span>
                  <span className="flex-1">{question.text}</span>
                </p>
                <RadioGroup dir="rtl" value={selectedAnswers[question.id] || ""} onValueChange={(choiceId) => onAnswerChange(question.id, choiceId)} className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {(question.choices || []).map((choice, choiceIndex) => {
                    const isSelected = selectedAnswers[question.id] === choice.id;
                    return (
                      <Label key={choice.id} htmlFor={`${question.id}-${choice.id}`} className={`grid min-h-[62px] cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border p-3.5 text-right text-base font-bold leading-relaxed text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 sm:p-4 sm:text-lg ${isSelected ? (isSecondPassage ? "border-teal-400 bg-teal-50 ring-2 ring-teal-100" : "border-violet-400 bg-violet-50 ring-2 ring-violet-100") : choiceTones[choiceIndex % choiceTones.length]}`}>
                        <RadioGroupItem id={`${question.id}-${choice.id}`} value={choice.id} className="h-5 w-5 border-2 border-indigo-800" />
                        <span>{choice.text}</span>
                      </Label>
                    );
                  })}
                </RadioGroup>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" onClick={() => onCheckAnswer(question)} className={`h-12 rounded-xl px-6 text-base font-black text-white shadow-md ${theme.button}`}>تحقق من الإجابة</Button>
                  {result !== undefined && (
                    <p role="status" className={`flex items-center gap-2 font-black ${result ? "text-emerald-700" : "text-rose-700"}`}>
                      {result ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      {result ? "إجابة صحيحة، أحسنت!" : "إجابة غير صحيحة، أعد قراءة القطعة وحاول مجددًا."}
                    </p>
                  )}
                  {result === undefined && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><CircleHelp className="h-4 w-4" />لن تظهر النتيجة حتى تتحقق من إجابتك</span>}
                </div>
              </div>
            );
          })}
        </section>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm font-bold leading-relaxed text-violet-900">
          🌈 خذ وقتك في القراءة؛ فهم الفكرة يساعدك على اختيار الإجابة بثقة.
        </div>
        <nav aria-label="التنقل بين القطع القرائية" className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50 via-white to-sky-50 p-4 sm:p-5">
          <Button type="button" variant="outline" disabled={!hasPreviousPassage} onClick={onPreviousPassage} className="h-12 rounded-xl border-indigo-200 bg-white px-5 font-black text-indigo-800 disabled:opacity-40">
            <ArrowRight className="ml-2 h-4 w-4" /> القطعة السابقة
          </Button>
          <span className="text-sm font-black text-slate-600">القطعة {passageNumber} من {passageCount}</span>
          <Button type="button" disabled={!hasNextPassage} onClick={onNextPassage} className="h-12 rounded-xl bg-gradient-to-l from-violet-700 to-indigo-700 px-6 font-black text-white shadow-md shadow-indigo-700/20 disabled:opacity-40">
            {hasNextPassage ? "انتقل إلى القطعة التالية" : "أتممت القطعتين"}<ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </nav>
      </CardContent>
    </Card>
  );
}
