import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  Edit,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SelectionScopeFields } from "@/components/admin/SelectionScopeFields";
import { validateSelectionScope } from "@/lib/selection-scope-validation";
import { SelectionScopeValue } from "@/types/selection";

type ImageField =
  | "question_image_url"
  | "choice1_image_url"
  | "choice2_image_url"
  | "choice3_image_url"
  | "choice4_image_url";

interface SpeedQuestion {
  id: string;
  question_text: string;
  question_image_url?: string | null;
  choice1: string;
  choice1_image_url?: string | null;
  choice2: string;
  choice2_image_url?: string | null;
  choice3: string;
  choice3_image_url?: string | null;
  choice4: string;
  choice4_image_url?: string | null;
  answer_explanation?: string | null;
  correct_choice_index: number;
  is_active: boolean;
  created_at: string;
}

const emptyQuestionForm = {
  id: undefined as string | undefined,
  question_text: "",
  question_image_url: "",
  choice1: "",
  choice1_image_url: "",
  choice2: "",
  choice2_image_url: "",
  choice3: "",
  choice3_image_url: "",
  choice4: "",
  choice4_image_url: "",
  answer_explanation: "",
  correct_choice_index: 1,
};

export default function CentralExamSpeed() {
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<ImageField | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<ImageField | null>(null);

  const [scope, setScope] = useState<SelectionScopeValue>({
    trackType: "central",
    gradeId: "",
    subjectId: "",
    gradeSubjectId: "",
    domainId: "",
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("speed_challenge_questions")
        .select("*")
        .eq("track_type", "central")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions((data as SpeedQuestion[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `speed-challenge/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("game-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("game-images").getPublicUrl(filePath);
      return publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("فشل رفع الصورة");
      return null;
    }
  };

  const openUploadDialog = (field: ImageField) => {
    uploadTargetRef.current = field;
    fileInputRef.current?.click();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current;
    if (!file || !target) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يجب اختيار ملف صورة");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }

    setIsUploading(target);
    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setQuestionForm((prev) => ({ ...prev, [target]: imageUrl }));
      toast.success("تم رفع الصورة بنجاح");
    }

    setIsUploading(null);
    uploadTargetRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderImageControl = (field: ImageField, label: string) => {
    const imageUrl = questionForm[field];

    return (
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500">{label}</Label>
        {imageUrl ? (
          <div className="relative h-28 overflow-hidden rounded-xl border bg-white">
            <img src={imageUrl} alt={label} className="h-full w-full object-contain p-2" />
            <button
              type="button"
              onClick={() => setQuestionForm((prev) => ({ ...prev, [field]: "" }))}
              className="absolute left-2 top-2 rounded-full bg-red-500 p-1 text-white shadow"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => openUploadDialog(field)}
            disabled={isUploading === field}
            className="h-11 w-full rounded-xl border-dashed bg-white gap-2"
          >
            {isUploading === field ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            إضافة صورة
          </Button>
        )}
      </div>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.question_text.trim()) {
      toast.error("يجب إدخال نص السؤال");
      return;
    }

    const filledChoices = [
      questionForm.choice1,
      questionForm.choice2,
      questionForm.choice3,
      questionForm.choice4,
    ].filter((choice) => choice.trim() !== "");
    if (filledChoices.length < 2) {
      toast.error("يجب إدخال خيارين على الأقل");
      return;
    }

    const correctKey = `choice${questionForm.correct_choice_index}` as keyof typeof questionForm;
    if (!(questionForm[correctKey] as string).trim()) {
      toast.error("الإجابة الصحيحة المحددة فارغة");
      return;
    }

    const scopeError = validateSelectionScope(scope);
    if (scopeError) {
      toast.error(scopeError);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        question_text: questionForm.question_text.trim(),
        question_image_url: questionForm.question_image_url || null,
        choice1: questionForm.choice1.trim() || "-",
        choice1_image_url: questionForm.choice1_image_url || null,
        choice2: questionForm.choice2.trim() || "-",
        choice2_image_url: questionForm.choice2_image_url || null,
        choice3: questionForm.choice3.trim() || "-",
        choice3_image_url: questionForm.choice3_image_url || null,
        choice4: questionForm.choice4.trim() || "-",
        choice4_image_url: questionForm.choice4_image_url || null,
        answer_explanation: questionForm.answer_explanation.trim() || null,
        correct_choice_index: questionForm.correct_choice_index,
        is_active: true,
        track_type: "central",
        stage: "central",
        grade_subject_id: scope.gradeSubjectId,
        domain_id: scope.domainId,
      };

      if (questionForm.id) {
        const { error } = await supabase
          .from("speed_challenge_questions")
          .update(payload)
          .eq("id", questionForm.id);
        if (error) throw error;
        toast.success("تم التحديث بنجاح");
      } else {
        const { error } = await supabase.from("speed_challenge_questions").insert(payload);
        if (error) throw error;
        toast.success("تمت الإضافة بنجاح");
      }

      setQuestionForm(emptyQuestionForm);
      fetchQuestions();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("فشل حفظ السؤال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (q: SpeedQuestion) => {
    setQuestionForm({
      id: q.id,
      question_text: q.question_text || "",
      question_image_url: q.question_image_url || "",
      choice1: q.choice1 || "",
      choice1_image_url: q.choice1_image_url || "",
      choice2: q.choice2 || "",
      choice2_image_url: q.choice2_image_url || "",
      choice3: q.choice3 || "",
      choice3_image_url: q.choice3_image_url || "",
      choice4: q.choice4 || "",
      choice4_image_url: q.choice4_image_url || "",
      answer_explanation: q.answer_explanation || "",
      correct_choice_index: q.correct_choice_index || 1,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from("speed_challenge_questions")
        .delete()
        .eq("id", itemToDelete);
      if (error) throw error;
      toast.success("تم الحذف بنجاح");
      if (questionForm.id === itemToDelete) {
        setQuestionForm(emptyQuestionForm);
      }
      fetchQuestions();
    } catch (err) {
      toast.error("فشل الحذف");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("speed_challenge_questions")
        .update({ is_active: !currentState })
        .eq("id", id);
      if (error) throw error;
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_active: !currentState } : q)),
      );
      toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
    } catch (err) {
      toast.error("فشل التحديث");
    }
  };

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Timer className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">تحدي السرعة</h1>
            <p className="text-slate-500 font-medium mt-1">
              إعداد أسئلة اختيار من متعدد مع صور وتغذية راجعة عند الخطأ.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="text-4xl font-black text-amber-600 mb-1">{questions.length}</div>
            <div className="text-sm font-bold text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="text-4xl font-black text-orange-600 mb-1">
              {questions.filter((q) => q.is_active).length}
            </div>
            <div className="text-sm font-bold text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-slate-200 bg-white">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
              {questionForm.id ? <Edit className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-amber-500" />}
              {questionForm.id ? "تعديل السؤال" : "إضافة سؤال سرعة جديد"}
            </CardTitle>
            {questionForm.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuestionForm(emptyQuestionForm)}
                className="text-slate-500"
              >
                <RotateCcw className="w-4 h-4 ml-1" /> إضافة بدلاً من التعديل
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <SelectionScopeFields value={scope} onChange={setScope} trackMode="central" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">نص السؤال</Label>
              <Input
                placeholder="مثال: كم عدد كواكب النظام الشمسي؟"
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                className="h-12 rounded-xl border-slate-300 focus-visible:ring-amber-500 font-medium"
              />
            </div>

            {renderImageControl("question_image_url", "صورة السؤال")}

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">شرح الخطأ</Label>
              <Textarea
                placeholder="اكتب سبب الخطأ أو تلميح التصحيح الذي سيظهر للطالب عند اختيار إجابة خاطئة..."
                value={questionForm.answer_explanation}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, answer_explanation: e.target.value })
                }
                className="min-h-24 rounded-xl border-slate-300 focus-visible:ring-amber-500 font-medium"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700">
                خيارات الإجابة
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((idx) => {
                  const choiceKey = `choice${idx}` as keyof typeof questionForm;
                  const imageKey = `choice${idx}_image_url` as ImageField;
                  const isCorrect = questionForm.correct_choice_index === idx;

                  return (
                    <div
                      key={idx}
                      className={`space-y-3 rounded-xl border p-3 transition-colors ${
                        isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuestionForm({ ...questionForm, correct_choice_index: idx })}
                          className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center transition-colors shadow-sm ${
                            isCorrect ? "bg-emerald-500 text-white" : "bg-white border text-slate-300 hover:text-slate-400"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <Input
                          value={questionForm[choiceKey] as string}
                          onChange={(e) => setQuestionForm({ ...questionForm, [choiceKey]: e.target.value })}
                          placeholder={`الخيار ${idx}`}
                          className="h-10 text-sm border-0 focus-visible:ring-1 bg-transparent"
                        />
                      </div>
                      {renderImageControl(imageKey, `صورة الخيار ${idx}`)}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-10 text-base font-bold rounded-xl shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20 gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : questionForm.id ? (
                  <Save className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {questionForm.id ? "حفظ التعديلات" : "إضافة السؤال"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">قائمة أسئلة تحدي السرعة</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Timer className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">لا توجد أسئلة مضافة حتى الآن</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((q, idx) => (
              <Card key={q.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-slate-200">
                <div className="bg-slate-50 border-b p-3 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-500">سؤال #{questions.length - idx}</span>
                  <Badge
                    variant={q.is_active ? "default" : "secondary"}
                    className={`cursor-pointer ${q.is_active ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                    onClick={() => toggleActive(q.id, q.is_active)}
                  >
                    {q.is_active ? "نشط" : "مخفي"}
                  </Badge>
                </div>

                <div className="p-4 space-y-3">
                  {q.question_image_url && (
                    <img src={q.question_image_url} alt="question" className="h-28 w-full rounded-lg object-contain bg-slate-50" />
                  )}
                  <div className="font-bold text-slate-800 text-base">{q.question_text}</div>
                  {q.answer_explanation && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      {q.answer_explanation}
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {[1, 2, 3, 4].map((i) => {
                      const text = q[`choice${i}` as keyof SpeedQuestion] as string;
                      const imageUrl = q[`choice${i}_image_url` as keyof SpeedQuestion] as string | null;
                      if ((!text || text === "-") && !imageUrl) return null;
                      const isCorrect = q.correct_choice_index === i;

                      return (
                        <div
                          key={i}
                          className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                            isCorrect ? "bg-emerald-50 text-emerald-700 font-bold" : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          {imageUrl && <img src={imageUrl} alt="" className="h-8 w-8 rounded object-cover bg-white" />}
                          <span>{text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-50 border-t p-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white border-slate-200 font-bold text-blue-600 hover:text-blue-700 rounded-xl"
                    onClick={() => handleEdit(q)}
                  >
                    <Edit className="w-4 h-4 ml-2" /> تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white text-red-500 hover:text-red-700 hover:bg-red-50 border-slate-200 rounded-xl"
                    onClick={() => confirmDelete(q.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              هل أنت متأكد من حذف هذا السؤال النهائي؟ لن يمكنك التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-3 sm:gap-0">
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="rounded-xl h-11">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 rounded-xl h-11 font-bold">
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
