import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trash2,
  X,
  Tag,
  Pencil,
  ExternalLink,
  Video,
  HelpCircle,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

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
  explanation_url?: string | null;
  correct_choice_index: number;
  is_active: boolean;
  domain_id?: string | null;
  grade_subject_id?: string | null;
}

const emptyQuestionForm = {
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
  explanation_url: "",
  correct_choice_index: 1,
};

export default function NafisSpeed() {
  const { data: catalog } = useAcademicCatalog();
  const rawDomains = catalog?.domains || [];
  const domains = useMemo(() => {
    return rawDomains
      .filter((d) => {
        const s = (d.slug || "").toLowerCase();
        const n = d.name || "";
        return !(s.includes("nature") || n.includes("طبيعة") || n.includes("طبيعه"));
      })
      .map((d) => {
        let name = d.name;
        const s = (d.slug || "").toLowerCase();
        if (
          (name.includes("الأرض") || name.includes("الارض") || s.includes("earth") || s.includes("space")) &&
          !name.includes("البيئة") &&
          !name.includes("البيئه")
        ) {
          name = "علم الأرض والفضاء والبيئة";
        }
        return { ...d, name };
      });
  }, [rawDomains]);

  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<ImageField | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState(emptyQuestionForm);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<ImageField | null>(null);

  // Edit Question Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SpeedQuestion | null>(null);
  const [editForm, setEditForm] = useState(emptyQuestionForm);
  const [editDomainId, setEditDomainId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("speed_challenge_questions")
        .select("*")
        .or("track_type.eq.nafis,track_type.is.null")
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
      setNewQuestion((prev) => ({ ...prev, [target]: imageUrl }));
      toast.success("تم رفع الصورة بنجاح");
    }

    setIsUploading(null);
    uploadTargetRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderImageControl = (field: ImageField, label: string) => {
    const currentUrl = newQuestion[field];
    const isBusy = isUploading === field;

    return (
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-600">{label}</Label>
        {currentUrl ? (
          <div className="relative inline-block border rounded-xl overflow-hidden bg-slate-50 p-1">
            <img src={currentUrl} alt="" className="h-20 w-20 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => setNewQuestion((prev) => ({ ...prev, [field]: "" }))}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              title="حذف الصورة"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openUploadDialog(field)}
            disabled={isBusy}
            className="w-full h-9 border-dashed text-xs gap-2"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            {isBusy ? "جاري الرفع..." : "إضافة صورة (اختياري)"}
          </Button>
        )}
      </div>
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question_text.trim()) {
      toast.error("يجب كتابة نص السؤال");
      return;
    }

    const filledChoices = [
      newQuestion.choice1,
      newQuestion.choice2,
      newQuestion.choice3,
      newQuestion.choice4,
    ].filter((c) => c.trim() !== "");

    if (filledChoices.length < 2) {
      toast.error("يجب ملء السؤال وخيارين على الأقل");
      return;
    }

    const correctKey = `choice${newQuestion.correct_choice_index}` as keyof typeof newQuestion;
    if (!(newQuestion[correctKey] as string).trim()) {
      toast.error("الإجابة الصحيحة المحددة فارغة");
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

      const insertPayload: Record<string, any> = {
        question_text: newQuestion.question_text.trim(),
        question_image_url: newQuestion.question_image_url || null,
        choice1: newQuestion.choice1.trim(),
        choice1_image_url: newQuestion.choice1_image_url || null,
        choice2: newQuestion.choice2.trim(),
        choice2_image_url: newQuestion.choice2_image_url || null,
        choice3: newQuestion.choice3.trim() || "",
        choice3_image_url: newQuestion.choice3_image_url || null,
        choice4: newQuestion.choice4.trim() || "",
        choice4_image_url: newQuestion.choice4_image_url || null,
        answer_explanation: newQuestion.answer_explanation.trim() || null,
        explanation_url: newQuestion.explanation_url.trim() || null,
        correct_choice_index: newQuestion.correct_choice_index,
        is_active: true,
        track_type: "nafis",
        stage: "default",
        grade_subject_id: defaultGradeSubjectId,
        domain_id: selectedDomainId && selectedDomainId !== "none" ? selectedDomainId : null,
      };

      let { error } = await supabase.from("speed_challenge_questions").insert(insertPayload);

      // Fallback if explanation_url column does not exist yet on remote
      if (error && (error.code === "42703" || error.message?.includes("explanation_url"))) {
        const fallbackExplanation = newQuestion.explanation_url.trim()
          ? (newQuestion.answer_explanation.trim()
              ? `${newQuestion.answer_explanation.trim()}\n${newQuestion.explanation_url.trim()}`
              : newQuestion.explanation_url.trim())
          : newQuestion.answer_explanation.trim() || null;
        delete insertPayload.explanation_url;
        insertPayload.answer_explanation = fallbackExplanation;
        const retry = await supabase.from("speed_challenge_questions").insert(insertPayload);
        error = retry.error;
      }

      if (error) throw error;
      toast.success("تمت إضافة السؤال بنجاح");
      setNewQuestion(emptyQuestionForm);
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "فشل إضافة السؤال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (q: SpeedQuestion) => {
    setEditingQuestion(q);
    setEditForm({
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
      explanation_url: q.explanation_url || "",
      correct_choice_index: q.correct_choice_index || 1,
    });
    setEditDomainId(q.domain_id || "none");
    setEditModalOpen(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (!editForm.question_text.trim()) {
      toast.error("يجب كتابة نص السؤال");
      return;
    }

    const filledChoices = [
      editForm.choice1,
      editForm.choice2,
      editForm.choice3,
      editForm.choice4,
    ].filter((c) => c.trim() !== "");

    if (filledChoices.length < 2) {
      toast.error("يجب ملء السؤال وخيارين على الأقل");
      return;
    }

    setIsUpdating(true);
    try {
      const updatePayload: Record<string, any> = {
        question_text: editForm.question_text.trim(),
        question_image_url: editForm.question_image_url || null,
        choice1: editForm.choice1.trim(),
        choice1_image_url: editForm.choice1_image_url || null,
        choice2: editForm.choice2.trim(),
        choice2_image_url: editForm.choice2_image_url || null,
        choice3: editForm.choice3.trim() || "",
        choice3_image_url: editForm.choice3_image_url || null,
        choice4: editForm.choice4.trim() || "",
        choice4_image_url: editForm.choice4_image_url || null,
        answer_explanation: editForm.answer_explanation.trim() || null,
        explanation_url: editForm.explanation_url.trim() || null,
        correct_choice_index: editForm.correct_choice_index,
        domain_id: editDomainId && editDomainId !== "none" ? editDomainId : null,
      };

      let { error } = await supabase
        .from("speed_challenge_questions")
        .update(updatePayload)
        .eq("id", editingQuestion.id);

      // Fallback if explanation_url column does not exist yet on remote
      if (error && (error.code === "42703" || error.message?.includes("explanation_url"))) {
        const fallbackExplanation = editForm.explanation_url.trim()
          ? (editForm.answer_explanation.trim()
              ? `${editForm.answer_explanation.trim()}\n${editForm.explanation_url.trim()}`
              : editForm.explanation_url.trim())
          : editForm.answer_explanation.trim() || null;
        delete updatePayload.explanation_url;
        updatePayload.answer_explanation = fallbackExplanation;
        const retry = await supabase
          .from("speed_challenge_questions")
          .update(updatePayload)
          .eq("id", editingQuestion.id);
        error = retry.error;
      }

      if (error) throw error;
      toast.success("تم تحديث السؤال بنجاح");
      setEditModalOpen(false);
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "فشل تحديث السؤال");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDomain = async (questionId: string, domainId: string) => {
    try {
      const targetDomain = domainId === "none" ? null : domainId;
      const { error } = await supabase
        .from("speed_challenge_questions")
        .update({ domain_id: targetDomain })
        .eq("id", questionId);

      if (error) throw error;
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, domain_id: targetDomain } : q))
      );
      toast.success("تم تحديث مجال السؤال");
    } catch (err: any) {
      toast.error("فشل تحديث المجال");
    }
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

  // Filter questions based on selected domain and search query
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Domain filter
      if (filterDomain === "unassigned") {
        if (q.domain_id) return false;
      } else if (filterDomain !== "all") {
        if (q.domain_id !== filterDomain) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.question_text.toLowerCase().includes(query) ||
          q.choice1.toLowerCase().includes(query) ||
          q.choice2.toLowerCase().includes(query) ||
          q.choice3?.toLowerCase().includes(query) ||
          q.choice4?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, filterDomain, searchQuery]);

  const getDomainName = (domainId?: string | null) => {
    if (!domainId) return "غير مصنف";
    const found = domains.find((d) => d.id === domainId);
    return found ? found.name : "غير مصنف";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Timer className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">تحدي السرعة - براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة تحدي السرعة وربطها بالمجالات العلمية التخصصية</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{questions.length}</div>
            <div className="text-sm text-slate-600 font-bold">إجمالي أسئلة السرعة (نافس)</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {questions.filter((q) => q.is_active).length}
            </div>
            <div className="text-sm text-slate-600 font-bold">الأسئلة النشطة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">
              {questions.filter((q) => q.domain_id).length}
            </div>
            <div className="text-sm text-slate-600 font-bold">أسئلة مرتبطة بمجال علمي</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Question Card */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-500" /> إضافة سؤال جديد لتحدي السرعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-5">
            {/* Domain Selection Field */}
            <div className="space-y-2 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>المجال العلمي التخصصي</span>
                <span className="text-xs text-amber-700 font-medium">(يربط السؤال بمجال الطالب)</span>
              </Label>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="w-full bg-white border-amber-200 font-bold">
                  <SelectValue placeholder="-- اختر المجال العلمي لهذا السؤال --" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون مجال محدد (عام)</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">نص السؤال</Label>
              <Input
                placeholder="نص السؤال..."
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              />
            </div>

            {renderImageControl("question_image_url", "صورة السؤال")}

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">شرح الخطأ أو تلميح تعليمي</Label>
              <Textarea
                placeholder="اكتب سبب الخطأ أو تلميح التصحيح..."
                value={newQuestion.answer_explanation}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer_explanation: e.target.value })}
                className="min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-amber-600" />
                <span>رابط شرح السؤال (المنصة التعليمية / يوتيوب / فيديو)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newQuestion.explanation_url}
                  onChange={(e) => setNewQuestion({ ...newQuestion, explanation_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... أو رابط المنصة التعليمية أو فيديو"
                  dir="ltr"
                  className="text-left font-mono text-xs flex-1 h-10"
                />
                {newQuestion.explanation_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(newQuestion.explanation_url, "_blank")}
                    className="gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 shrink-0 h-10 px-3 border-amber-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>اختبار الرابط</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((idx) => {
                const choiceKey = `choice${idx}` as keyof typeof newQuestion;
                const imageKey = `choice${idx}_image_url` as ImageField;
                const isCorrect = newQuestion.correct_choice_index === idx;

                return (
                  <div
                    key={choiceKey}
                    className={`space-y-3 rounded-xl border p-3 ${
                      isCorrect ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewQuestion({ ...newQuestion, correct_choice_index: idx })}
                        className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center transition-all ${
                          isCorrect ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-white border text-slate-300 hover:text-slate-500"
                        }`}
                        title="انقر لتحديد هذه الإجابة كصحيحة"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <Input
                        placeholder={`الخيار ${idx} ${isCorrect ? "(الإجابة الصحيحة)" : ""}`}
                        value={newQuestion[choiceKey] as string}
                        onChange={(e) => setNewQuestion({ ...newQuestion, [choiceKey]: e.target.value })}
                        className={isCorrect ? "border-emerald-500 font-bold" : ""}
                      />
                    </div>
                    {renderImageControl(imageKey, `صورة الخيار ${idx}`)}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold h-11 px-6 shadow-md shadow-amber-500/20 gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة السؤال الآن
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Questions List Card */}
      <Card className="card-elevated">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-slate-800">
                أسئلة تحدي السرعة ({filteredQuestions.length} من {questions.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">تصفية وتصنيف الأسئلة حسب المجال العلمي</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Domain Filter Dropdown */}
              <div className="w-48">
                <Select value={filterDomain} onValueChange={setFilterDomain}>
                  <SelectTrigger className="w-full bg-white font-bold text-xs h-10 border-slate-200">
                    <SelectValue placeholder="فلترة حسب المجال" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع المجالات ({questions.length})</SelectItem>
                    {domains.map((d) => {
                      const count = questions.filter((q) => q.domain_id === d.id).length;
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({count})
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="unassigned">
                      غير مصنف ({questions.filter((q) => !q.domain_id).length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="relative w-56">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث في الأسئلة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-16">
              <Timer className="w-16 h-16 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">لا توجد أسئلة تطابق الفلتر الحالي</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold">السؤال</TableHead>
                    <TableHead className="w-48 font-bold">المجال العلمي</TableHead>
                    <TableHead className="font-bold">الإجابة الصحيحة</TableHead>
                    <TableHead className="w-24 text-center font-bold">الحالة</TableHead>
                    <TableHead className="w-24 text-center font-bold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((q, idx) => {
                    const choices = [q.choice1, q.choice2, q.choice3, q.choice4];
                    const correctIndex = q.correct_choice_index > 0 ? q.correct_choice_index - 1 : 0;
                    const correctChoice = choices[correctIndex] || q.choice1;

                    return (
                      <TableRow key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-bold text-xs text-slate-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {q.question_image_url && (
                                <img src={q.question_image_url} alt="" className="h-9 w-9 rounded-lg object-cover bg-slate-100 border shrink-0" />
                              )}
                              <span className="font-medium text-slate-800 text-sm line-clamp-2">{q.question_text}</span>
                            </div>
                            {(q.answer_explanation || q.explanation_url) && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                {q.answer_explanation && (
                                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    <HelpCircle className="w-3 h-3 text-amber-600" />
                                    <span className="truncate max-w-[180px]">{q.answer_explanation}</span>
                                  </span>
                                )}
                                {q.explanation_url && (
                                  <a
                                    href={q.explanation_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 font-bold"
                                  >
                                    <Video className="w-3 h-3 text-indigo-600" />
                                    <span>فيديو شرح</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={q.domain_id || "none"}
                            onValueChange={(val) => handleUpdateDomain(q.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold bg-white border-slate-200 shadow-xs">
                              <SelectValue placeholder="اختر المجال" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="none">⚠️ غير مصنف</SelectItem>
                              {domains.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                            {correctChoice}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={q.is_active ? "default" : "secondary"}
                            className="cursor-pointer select-none"
                            onClick={() => toggleActive(q.id, q.is_active)}
                          >
                            {q.is_active ? "نشط" : "مخفي"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(q)}
                              className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600 text-slate-500"
                              title="تعديل السؤال"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(q.id)}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600 text-red-500"
                              title="حذف السؤال"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Question Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" />
              <span>تعديل سؤال تحدي السرعة</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateQuestion} className="space-y-4 pt-2">
            <div className="space-y-2 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
              <Label className="text-xs font-bold text-slate-800">المجال العلمي</Label>
              <Select value={editDomainId} onValueChange={setEditDomainId}>
                <SelectTrigger className="w-full bg-white border-amber-200 font-bold h-9 text-xs">
                  <SelectValue placeholder="-- اختر المجال العلمي --" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون مجال محدد (عام)</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">نص السؤال</Label>
              <Input
                value={editForm.question_text}
                onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">شرح الخطأ أو تلميح تعليمي</Label>
              <Textarea
                value={editForm.answer_explanation}
                onChange={(e) => setEditForm({ ...editForm, answer_explanation: e.target.value })}
                className="min-h-16"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-amber-600" />
                <span>رابط شرح السؤال (المنصة التعليمية / يوتيوب / فيديو)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={editForm.explanation_url}
                  onChange={(e) => setEditForm({ ...editForm, explanation_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... أو رابط المنصة التعليمية أو فيديو"
                  dir="ltr"
                  className="text-left font-mono text-xs flex-1 h-10"
                />
                {editForm.explanation_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(editForm.explanation_url, "_blank")}
                    className="gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 shrink-0 h-10 px-3 border-amber-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>اختبار الرابط</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
              {[1, 2, 3, 4].map((idx) => {
                const choiceKey = `choice${idx}` as keyof typeof editForm;
                const isCorrect = editForm.correct_choice_index === idx;

                return (
                  <div
                    key={choiceKey}
                    className={`space-y-2 rounded-xl border p-3 ${
                      isCorrect ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, correct_choice_index: idx })}
                        className={`w-7 h-7 rounded-full flex shrink-0 items-center justify-center transition-all ${
                          isCorrect ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-white border text-slate-300 hover:text-slate-500"
                        }`}
                        title="انقر لتحديد هذه الإجابة كصحيحة"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <Input
                        placeholder={`الخيار ${idx} ${isCorrect ? "(الإجابة الصحيحة)" : ""}`}
                        value={editForm[choiceKey] as string}
                        onChange={(e) => setEditForm({ ...editForm, [choiceKey]: e.target.value })}
                        className={isCorrect ? "border-emerald-500 font-bold" : ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="gap-2 pt-3 sm:justify-start">
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold h-11 px-6 rounded-xl"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                حفظ التعديلات
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="h-11 rounded-xl font-bold"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا السؤال نهائياً؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 font-bold">
              حذف السؤال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
