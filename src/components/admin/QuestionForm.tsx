import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Choice {
  id?: string;
  text: string;
  is_correct: boolean;
}

interface QuestionFormProps {
  question?: { id: string; text: string; active: boolean } | null;
  onComplete: () => void;
}

export function QuestionForm({ question, onComplete }: QuestionFormProps) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(true);
  const [choices, setChoices] = useState<Choice[]>([
    { text: "", is_correct: true },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (question) {
      setText(question.text);
      setActive(question.active);
      fetchChoices(question.id);
    }
  }, [question]);

  const fetchChoices = async (questionId: string) => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("choices")
        .select("*")
        .eq("question_id", questionId)
        .order("created_at");

      if (error) throw error;

      if (data && data.length > 0) {
        setChoices(data.map(c => ({
          id: c.id,
          text: c.text,
          is_correct: c.is_correct ?? false,
        })));
      }
    } catch (err) {
      console.error("Error fetching choices:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddChoice = () => {
    if (choices.length >= 6) {
      toast.error("الحد الأقصى 6 خيارات");
      return;
    }
    setChoices([...choices, { text: "", is_correct: false }]);
  };

  const handleRemoveChoice = (index: number) => {
    if (choices.length <= 2) {
      toast.error("يجب أن يكون هناك خياران على الأقل");
      return;
    }
    const newChoices = choices.filter((_, i) => i !== index);
    // Ensure at least one is correct
    if (choices[index].is_correct && newChoices.length > 0) {
      newChoices[0].is_correct = true;
    }
    setChoices(newChoices);
  };

  const handleChoiceTextChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index].text = value;
    setChoices(newChoices);
  };

  const handleCorrectChange = (index: number) => {
    const newChoices = choices.map((c, i) => ({
      ...c,
      is_correct: i === index,
    }));
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!text.trim()) {
      toast.error("يرجى إدخال نص السؤال");
      return;
    }

    const filledChoices = choices.filter(c => c.text.trim());
    if (filledChoices.length < 2) {
      toast.error("يجب إدخال خيارين على الأقل");
      return;
    }

    const correctCount = filledChoices.filter(c => c.is_correct).length;
    if (correctCount !== 1) {
      toast.error("يجب تحديد إجابة صحيحة واحدة فقط");
      return;
    }

    setIsLoading(true);

    try {
      if (question) {
        // Update existing question
        const { error: questionError } = await supabase
          .from("questions")
          .update({ text, active })
          .eq("id", question.id);

        if (questionError) throw questionError;

        // Delete old choices and insert new ones
        await supabase.from("choices").delete().eq("question_id", question.id);

        const { error: choicesError } = await supabase.from("choices").insert(
          filledChoices.map(c => ({
            question_id: question.id,
            text: c.text,
            is_correct: c.is_correct,
          }))
        );

        if (choicesError) throw choicesError;

        toast.success("تم تحديث السؤال بنجاح");
      } else {
        // Create new question
        const { data: newQuestion, error: questionError } = await supabase
          .from("questions")
          .insert({ text, active })
          .select()
          .single();

        if (questionError) throw questionError;

        const { error: choicesError } = await supabase.from("choices").insert(
          filledChoices.map(c => ({
            question_id: newQuestion.id,
            text: c.text,
            is_correct: c.is_correct,
          }))
        );

        if (choicesError) throw choicesError;

        toast.success("تم إضافة السؤال بنجاح");
      }

      onComplete();
    } catch (err) {
      console.error("Error saving question:", err);
      toast.error("حدث خطأ أثناء حفظ السؤال");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question Text */}
      <div className="space-y-2">
        <Label htmlFor="question-text" className="text-base font-medium">
          نص السؤال
        </Label>
        <Textarea
          id="question-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="أدخل نص السؤال هنا..."
          className="min-h-24 resize-none"
          required
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
        <div>
          <Label htmlFor="active-status" className="text-base font-medium">
            السؤال نشط
          </Label>
          <p className="text-sm text-muted-foreground">
            الأسئلة النشطة تظهر في الاختبارات
          </p>
        </div>
        <Switch
          id="active-status"
          checked={active}
          onCheckedChange={setActive}
        />
      </div>

      {/* Choices */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">الخيارات</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddChoice}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            إضافة خيار
          </Button>
        </div>

        <RadioGroup
          value={choices.findIndex(c => c.is_correct).toString()}
          onValueChange={(v) => handleCorrectChange(parseInt(v))}
        >
          <div className="space-y-3">
            {choices.map((choice, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl border border-border"
              >
                <RadioGroupItem value={index.toString()} id={`choice-${index}`} />
                <Input
                  value={choice.text}
                  onChange={(e) => handleChoiceTextChange(index, e.target.value)}
                  placeholder={`الخيار ${index + 1}`}
                  className="flex-1"
                />
                {choices.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChoice(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          حدد الإجابة الصحيحة بالنقر على الدائرة بجوار الخيار
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 text-base font-semibold rounded-xl btn-primary-gradient"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            جاري الحفظ...
          </>
        ) : question ? (
          "تحديث السؤال"
        ) : (
          "إضافة السؤال"
        )}
      </Button>
    </form>
  );
}
