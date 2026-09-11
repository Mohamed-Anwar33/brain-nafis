import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Upload, X, Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createCentralExamQuestion,
  updateCentralExamQuestion,
  CentralExamQuestion,
  CentralExamChoice,
  CentralExamChoiceInput,
} from "@/services/centralExamService";
import {
  SelectionScopeFields,
} from "@/components/admin/SelectionScopeFields";
import { validateSelectionScope } from "@/lib/selection-scope-validation";
import { SelectionScopeValue } from "@/types/selection";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

interface Props {
  question: CentralExamQuestion | null;
  onComplete: () => void;
  defaultDomainId?: string;
}

export function CentralExamQuestionForm({ question, onComplete, defaultDomainId }: Props) {
  const { data: catalog } = useAcademicCatalog();
  const [text, setText] = useState(question?.text || "");
  const [imageUrl, setImageUrl] = useState(question?.image_url || "");
  const [active, setActive] = useState(question?.active ?? true);
  const [orderIndex, setOrderIndex] = useState(question?.order_index || 0);
  const [stageNumber, setStageNumber] = useState<number>(question?.stage_number || 1);
  const [wrongReason, setWrongReason] = useState(question?.wrong_reason || "");
  const [explanationUrl, setExplanationUrl] = useState(question?.explanation_url || "");
  const [scope, setScope] = useState<SelectionScopeValue>(() => ({
    trackType: "central",
    gradeId: "",
    subjectId: "",
    gradeSubjectId: question?.grade_subject_id || "",
    domainId: question?.domain_id || (defaultDomainId && defaultDomainId !== "all" ? defaultDomainId : "") || "",
  }));
  
  const [choices, setChoices] = useState<Partial<CentralExamChoice>[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingChoiceIdx, setUploadingChoiceIdx] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(question?.image_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (question && question.choices) {
      setChoices(question.choices);
    } else {
      setChoices([
        { text: "", is_correct: true, image_url: null },
        { text: "", is_correct: false, image_url: null },
        { text: "", is_correct: false, image_url: null },
        { text: "", is_correct: false, image_url: null },
      ]);
    }
    setText(question?.text || "");
    setImageUrl(question?.image_url || "");
    setImagePreview(question?.image_url || null);
    setActive(question?.active ?? true);
    setOrderIndex(question?.order_index || 0);
    setStageNumber(question?.stage_number || 1);
    setWrongReason(question?.wrong_reason || "");
    setExplanationUrl(question?.explanation_url || "");

    let targetGsId = question?.grade_subject_id || "";
    let derivedGradeId = "";
    let derivedSubjectId = "";
    let derivedDomainId = question?.domain_id || "";

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
      trackType: "central",
      gradeSubjectId: targetGsId || prev.gradeSubjectId,
      domainId: prev.domainId || derivedDomainId || (defaultDomainId && defaultDomainId !== "all" ? defaultDomainId : "") || "",
      gradeId: derivedGradeId || prev.gradeId,
      subjectId: derivedSubjectId || prev.subjectId,
    }));
  }, [question, catalog, defaultDomainId]);

  const addChoice = () => {
    setChoices([...choices, { text: "", is_correct: false }]);
  };

  const removeChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  const updateChoice = (
    index: number,
    field: keyof CentralExamChoice,
    value: string | boolean,
  ) => {
    const newChoices = [...choices];
    if (field === "is_correct" && value === true) {
      // Only one correct choice
      newChoices.forEach(c => c.is_correct = false);
    }
    newChoices[index] = { ...newChoices[index], [field]: value };
    setChoices(newChoices);
  };

  // Image upload function
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `central-exam/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('فشل رفع الصورة');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(filePath);
      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('فشل رفع الصورة');
      return null;
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يجب اختيار ملف صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setUploadingImage(true);
    
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    const url = await uploadImage(file);
    if (url) {
      setImageUrl(url);
      toast.success('تم رفع الصورة بنجاح');
    }
    
    setUploadingImage(false);
  };

  const handleChoiceImageUpload = async (idx: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يجب اختيار ملف صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setUploadingChoiceIdx(idx);
    try {
      const url = await uploadImage(file);
      if (url) {
        updateChoice(idx, "image_url", url);
        toast.success('تم رفع صورة الخيار بنجاح');
      }
    } finally {
      setUploadingChoiceIdx(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("يرجى إدخال نص السؤال");
      return;
    }
    
    const validChoices = choices.filter(c => c.text?.trim() || c.image_url);
    if (validChoices.length < 2) {
      toast.error("يرجى إدخال خيارين على الأقل");
      return;
    }
    
    if (!validChoices.some(c => c.is_correct)) {
      toast.error("يرجى تحديد الإجابة الصحيحة");
      return;
    }

    const scopeError = validateSelectionScope(scope);
    if (scopeError) {
      toast.error(scopeError);
      return;
    }

    setLoading(true);
    try {
      if (question?.id) {
        await updateCentralExamQuestion(question.id, {
          text,
          image_url: imageUrl || null,
          active,
          order_index: orderIndex,
          stage_number: stageNumber,
          track_type: "central",
          grade_subject_id: scope.gradeSubjectId,
          domain_id: scope.domainId,
          wrong_reason: wrongReason || null,
          explanation_url: explanationUrl || null,
        }, validChoices);
        toast.success("تم تحديث السؤال بنجاح");
      } else {
        await createCentralExamQuestion({
          text,
          image_url: imageUrl || null,
          active,
          order_index: orderIndex,
          stage_number: stageNumber,
          track_type: "central",
          grade_subject_id: scope.gradeSubjectId,
          domain_id: scope.domainId,
          wrong_reason: wrongReason || null,
          explanation_url: explanationUrl || null,
        }, validChoices as CentralExamChoiceInput[]);
        toast.success("تم إضافة السؤال بنجاح");
      }
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حفظ السؤال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>التفعيل</Label>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm text-slate-600">{active ? 'السؤال نشط ومتاح للطلاب' : 'السؤال مخفي'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>نص السؤال</Label>
          <Textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="اكتب نص السؤال هنا..."
            className="min-h-[100px] resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label>السياق الدراسي</Label>
          <SelectionScopeFields
            value={scope}
            onChange={setScope}
            trackMode="central"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 sm:col-span-1">
            <Label>صورة السؤال (اختياري)</Label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex-1 text-xs"
              >
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-1" />
                )}
                {imagePreview || imageUrl ? 'تغيير الصورة' : 'رفع صورة'}
              </Button>
              {(imagePreview || imageUrl) && (
                <div className="relative w-10 h-10 shrink-0">
                  <img
                    src={imagePreview || imageUrl || ''}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl('');
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-1">
            <Label>رقم المرحلة</Label>
            <Input 
              type="number"
              min={1}
              max={10}
              value={stageNumber} 
              onChange={(e) => setStageNumber(parseInt(e.target.value) || 1)} 
            />
          </div>

          <div className="space-y-2 sm:col-span-1">
            <Label>ترتيب الظهور (اختياري)</Label>
            <Input 
              type="number"
              value={orderIndex} 
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>سبب الخطأ / التفسير العلمي</Label>
        <Textarea
          value={wrongReason}
          onChange={(e) => setWrongReason(e.target.value)}
          placeholder="اكتب التفسير أو التوضيح الذي سيظهر للطالب عند الإجابة الخاطئة"
          className="min-h-[85px] resize-y"
        />
      </div>

      <div className="space-y-2">
        <Label>رابط شرح السؤال (المنصة التعليمية / يوتيوب / فيديو)</Label>
        <div className="flex gap-2">
          <Input
            value={explanationUrl}
            onChange={(e) => setExplanationUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... أو رابط المنصة التعليمية أو مقطع فيديو"
            dir="ltr"
            className="text-left font-mono text-sm flex-1"
          />
          {explanationUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(explanationUrl, "_blank")}
              className="gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 shrink-0 h-10 px-3 border-indigo-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>اختبار الرابط</span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          يظهر للطالب عند الإجابة الخاطئة لمشاهدة فيديو أو درس الشرح مباشرة
        </p>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-bold">الخيارات</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChoice} className="gap-1">
            <Plus className="w-4 h-4" /> إضافة خيار
          </Button>
        </div>

        <div className="space-y-3">
          {choices.map((choice, idx) => (
            <div key={idx} className={`flex flex-col gap-2 p-3 rounded-xl border ${choice.is_correct ? 'border-green-500 bg-green-50/70' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="pt-1">
                  <Switch 
                    checked={choice.is_correct} 
                    onCheckedChange={(v) => updateChoice(idx, "is_correct", v)} 
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                <div className="flex-1">
                  <Input 
                    value={choice.text || ""} 
                    onChange={(e) => updateChoice(idx, "text", e.target.value)} 
                    placeholder={`الخيار ${idx + 1}`}
                    className={choice.is_correct ? 'border-green-300 focus-visible:ring-green-500' : ''}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(idx)} className="text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Choice Image Attachment */}
              <div className="flex items-center gap-2 pr-12">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`choice-img-${idx}`}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleChoiceImageUpload(idx, e.target.files[0]);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`choice-img-${idx}`)?.click()}
                  disabled={uploadingChoiceIdx === idx}
                  className="text-slate-600 hover:text-slate-900 h-7 text-xs gap-1.5 border-dashed border-slate-300 bg-white"
                >
                  {uploadingChoiceIdx === idx ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-indigo-600" />
                  )}
                  <span>{choice.image_url ? "تغيير صورة الخيار" : "صورة للخيار (اختياري)"}</span>
                </Button>

                {choice.image_url && (
                  <div className="relative w-8 h-8 rounded border overflow-hidden bg-white shadow-2xs">
                    <img src={choice.image_url} alt="Choice preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => updateChoice(idx, "image_url", null as any)}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] hover:bg-red-600"
                      title="حذف صورة الخيار"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onComplete}>إلغاء</Button>
        <Button type="submit" disabled={loading} className="btn-primary-gradient px-8">
          {loading ? "جاري الحفظ..." : "حفظ السؤال"}
        </Button>
      </div>
    </form>
  );
}
