import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SelectionScopeFields } from "@/components/admin/SelectionScopeFields";
import { validateSelectionScope } from "@/lib/selection-scope-validation";
import { SelectionScopeValue } from "@/types/selection";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

interface Choice {
  id?: string;
  text: string;
  is_correct: boolean;
  image_url?: string;
  file?: File;
}

interface QuestionFormProps {
  question?: {
    id: string;
    text: string;
    active: boolean;
    image_url?: string;
    stage_number?: number;
    grade_subject_id?: string | null;
    wrong_reason?: string | null;
    explanation_url?: string | null;
  } | null;
  onComplete: () => void;
  defaultStage?: number;
}

export function QuestionForm({ question, onComplete, defaultStage }: QuestionFormProps) {
  const { data: catalog } = useAcademicCatalog();
  const [text, setText] = useState("");
  const [active, setActive] = useState(true);
  const [stageNumber, setStageNumber] = useState<number>(defaultStage || 1);
  const [wrongReason, setWrongReason] = useState("");
  const [explanationUrl, setExplanationUrl] = useState("");
  const [stagesList, setStagesList] = useState<{ stage_number: number; title: string }[]>([]);
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);
  const [scope, setScope] = useState<SelectionScopeValue>(() => ({
    trackType: "nafis",
    gradeId: "",
    subjectId: "",
    gradeSubjectId: question?.grade_subject_id || "",
    domainId: "",
  }));

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
      setStageNumber(question.stage_number || defaultStage || 1);
      setQuestionImageUrl(question.image_url || null);
      setWrongReason(question.wrong_reason || "");
      setExplanationUrl(question.explanation_url || "");

      let targetGsId = question.grade_subject_id || "";
      let derivedGradeId = "";
      let derivedSubjectId = "";
      if (targetGsId && catalog?.gradeSubjects) {
        const match = catalog.gradeSubjects.find((gs) => gs.id === targetGsId);
        if (match) {
          derivedGradeId = match.grade_id;
          derivedSubjectId = match.subject_id;
        }
      } else if (!targetGsId && catalog?.grades?.length === 1) {
        const onlyGrade = catalog.grades[0];
        derivedGradeId = onlyGrade.id;
        const gsList = (catalog.gradeSubjects || []).filter((gs) => gs.grade_id === onlyGrade.id);
        if (gsList.length === 1) {
          derivedSubjectId = gsList[0].subject_id;
          targetGsId = gsList[0].id;
        }
      }

      setScope((prev) => ({
        trackType: "nafis",
        gradeSubjectId: targetGsId || prev.gradeSubjectId,
        domainId: "",
        gradeId: derivedGradeId || prev.gradeId,
        subjectId: derivedSubjectId || prev.subjectId,
      }));
      fetchChoices(question.id);
    }
  }, [defaultStage, question, catalog]);

  // Fetch stages from stage_titles table
  useEffect(() => {
    const fetchStages = async () => {
      const { data } = await supabase
        .from("stage_titles")
        .select("stage_number, title")
        .order("stage_number");
      if (data && data.length > 0) {
        setStagesList(data);
      } else {
        // Fallback if no stages exist
        setStagesList([{ stage_number: 1, title: "المرحلة 1" }]);
      }
    };
    fetchStages();
  }, []);

  const fetchChoices = async (questionId: string) => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("choices")
        .select("*")
        .eq("question_id", questionId)
        .order("created_at");

      if (error) throw error;

      if (data && (data as any[]).length > 0) {
        setChoices((data as any[]).map((c: any) => ({
          id: c.id,
          text: c.text,
          is_correct: c.is_correct ?? false,
          image_url: c.image_url || undefined
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

  const handleChoiceFileChange = (index: number, file: File) => {
    const newChoices = [...choices];
    newChoices[index].file = file;
    setChoices(newChoices);
  };

  const handleCorrectChange = (index: number) => {
    const newChoices = choices.map((c, i) => ({
      ...c,
      is_correct: i === index,
    }));
    setChoices(newChoices);
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    console.log("🚀 Starting upload to Supabase Storage:", filePath);

    const { error: uploadError } = await supabase.storage
      .from("game-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Storage Upload Error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("game-images")
      .getPublicUrl(filePath);

    console.log("🔗 Generated Public URL:", publicUrl);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const filledChoices = choices.filter(c => c.text.trim() || c.file || c.image_url);
    if (filledChoices.length < 2) {
      toast.error("يجب ملء خيارين على الأقل");
      return;
    }

    const hasCorrect = choices.some(c => c.is_correct);
    if (!hasCorrect) {
      toast.error("يجب تحديد إجابة صحيحة واحدة على الأقل");
      return;
    }

    const scopeError = validateSelectionScope(scope);
    if (scopeError) {
      toast.error(scopeError);
      return;
    }

    setIsLoading(true);

    try {
      let finalQuestionImageUrl = questionImageUrl;
      if (questionImage) {
        console.log("📤 Uploading Question Image...");
        finalQuestionImageUrl = await uploadFile(questionImage);
        console.log("✅ Question Image Uploaded:", finalQuestionImageUrl);
      }

      let qId = question?.id;

      if (question) {
        // Update existing question
        let updatePayload: any = {
          text,
          active,
          image_url: finalQuestionImageUrl,
          stage_number: stageNumber,
          grade_subject_id: scope.gradeSubjectId,
          track_type: "nafis",
          wrong_reason: wrongReason || null,
          explanation_url: explanationUrl || null,
        };

        let { error: questionError } = await supabase
          .from("questions")
          .update(updatePayload)
          .eq("id", question.id);

        if (questionError && (questionError.code === "42703" || questionError.message?.includes("explanation_url"))) {
          const fallbackReason = explanationUrl
            ? (wrongReason ? `${wrongReason}\n${explanationUrl}` : explanationUrl)
            : wrongReason || null;
          delete updatePayload.explanation_url;
          updatePayload.wrong_reason = fallbackReason;
          const retry = await supabase.from("questions").update(updatePayload).eq("id", question.id);
          questionError = retry.error;
        }

        if (questionError) throw questionError;

        // Delete old choices to replace with new ones
        await supabase.from("choices").delete().eq("question_id", question.id);

      } else {
        // Create new question
        let insertPayload: any = {
          text,
          active,
          image_url: finalQuestionImageUrl,
          stage_number: stageNumber,
          grade_subject_id: scope.gradeSubjectId,
          track_type: "nafis",
          wrong_reason: wrongReason || null,
          explanation_url: explanationUrl || null,
        };

        let { data: newQuestion, error: questionError } = await supabase
          .from("questions")
          .insert(insertPayload)
          .select()
          .single();

        if (questionError && (questionError.code === "42703" || questionError.message?.includes("explanation_url"))) {
          const fallbackReason = explanationUrl
            ? (wrongReason ? `${wrongReason}\n${explanationUrl}` : explanationUrl)
            : wrongReason || null;
          delete insertPayload.explanation_url;
          insertPayload.wrong_reason = fallbackReason;
          const retry = await supabase
            .from("questions")
            .insert(insertPayload)
            .select()
            .single();
          newQuestion = retry.data;
          questionError = retry.error;
        }

        if (questionError) throw questionError;
        qId = (newQuestion as any)?.id;
      }

      // Upload Choice Images & Insert Choices
      const choicesToInsert = await Promise.all(filledChoices.map(async (c, i) => {
        let cImageUrl = c.image_url;
        if (c.file) {
          console.log(`📤 Uploading image for choice ${i}:`, c.file.name);
          cImageUrl = await uploadFile(c.file);
          console.log(`✅ Choice ${i} image uploaded:`, cImageUrl);
        }
        return {
          question_id: qId,
          text: c.text,
          is_correct: c.is_correct,
          image_url: cImageUrl
        };
      }));

      const { error: choicesError } = await supabase.from("choices").insert(choicesToInsert);

      if (choicesError) throw choicesError;

      toast.success(question ? "تم تحديث السؤال بنجاح" : "تم إضافة السؤال بنجاح");
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
      {/* Question Text & Image */}
      <div className="space-y-4">
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
            required={!questionImage && !questionImageUrl}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="q-image-upload"
              onChange={(e) => {
                if (e.target.files?.[0]) setQuestionImage(e.target.files[0]);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("q-image-upload")?.click()}
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              {questionImage || questionImageUrl ? "تغيير الصورة" : "إضافة صورة توضيحية"}
            </Button>
          </div>

          {(questionImage || questionImageUrl) && (
            <div className="relative w-16 h-16 border rounded-lg bg-slate-50 overflow-hidden">
              <img
                src={questionImage ? URL.createObjectURL(questionImage) : questionImageUrl!}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setQuestionImage(null);
                  setQuestionImageUrl(null);
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stage Number */}
      <div className="space-y-2">
        <Label className="text-base font-medium">رقم المرحلة</Label>
        <Select value={stageNumber.toString()} onValueChange={(v) => setStageNumber(parseInt(v))}>
          <SelectTrigger>
            <SelectValue placeholder="اختر المرحلة" />
          </SelectTrigger>
          <SelectContent>
            {stagesList.map(stage => (
              <SelectItem key={stage.stage_number} value={stage.stage_number.toString()}>
                {stage.title} (م{stage.stage_number})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">حدد المرحلة التي ينتمي لها السؤال</p>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">السياق الدراسي</Label>
        <SelectionScopeFields
          value={scope}
          onChange={setScope}
          trackMode="nafis"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">سبب الخطأ</Label>
        <Textarea
          value={wrongReason}
          onChange={(e) => setWrongReason(e.target.value)}
          placeholder="اكتب التفسير الذي يظهر للطالب عند الإجابة الخاطئة"
          className="min-h-24 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">رابط شرح السؤال (المنصة التعليمية / يوتيوب / فيديو)</Label>
        <Input
          value={explanationUrl}
          onChange={(e) => setExplanationUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... أو رابط المنصة التعليمية أو مقطع فيديو"
          dir="ltr"
          className="text-left font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          يظهر للطالب عند الإجابة الخاطئة لمشاهدة فيديو أو درس الشرح مباشرة
        </p>
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
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div className="pt-3">
                  <RadioGroupItem value={index.toString()} id={`choice-${index}`} />
                </div>

                <div className="flex-1 space-y-2">
                  <Input
                    value={choice.text}
                    onChange={(e) => handleChoiceTextChange(index, e.target.value)}
                    placeholder={`الخيار ${index + 1}`}
                    className="flex-1"
                  />

                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`choice-img-${index}`}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleChoiceFileChange(index, e.target.files[0]);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById(`choice-img-${index}`)?.click()}
                      className="text-muted-foreground h-8"
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {choice.file || choice.image_url ? "تغيير الصورة" : "صورة"}
                    </Button>

                    {(choice.file || choice.image_url) && (
                      <div className="relative w-8 h-8 border rounded overflow-hidden bg-white">
                        <img
                          src={choice.file ? URL.createObjectURL(choice.file) : choice.image_url}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {choices.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChoice(index)}
                    className="text-destructive hover:text-destructive mt-1"
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
