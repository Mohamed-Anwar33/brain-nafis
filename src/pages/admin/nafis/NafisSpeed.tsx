import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Image as ImageIcon, Loader2, Plus, Timer, Trash2, X } from "lucide-react";
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
  correct_choice_index: 1,
};

export default function NafisSpeed() {
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<ImageField | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState(emptyQuestionForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<ImageField | null>(null);

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
    const imageUrl = newQuestion[field];

    return (
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-500">{label}</Label>
        {imageUrl ? (
          <div className="relative h-24 overflow-hidden rounded-xl border bg-white">
            <img src={imageUrl} alt={label} className="h-full w-full object-contain p-2" />
            <button
              type="button"
              onClick={() => setNewQuestion((prev) => ({ ...prev, [field]: "" }))}
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
            className="h-10 w-full rounded-xl border-dashed bg-white gap-2"
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question_text.trim() || !newQuestion.choice1.trim() || !newQuestion.choice2.trim()) {
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
      const { error } = await supabase.from("speed_challenge_questions").insert({
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
        correct_choice_index: newQuestion.correct_choice_index,
        is_active: true,
        track_type: "nafis",
      });

      if (error) throw error;
      toast.success("تمت الإضافة بنجاح");
      setNewQuestion(emptyQuestionForm);
      fetchQuestions();
    } catch (err) {
      console.error(err);
      toast.error("فشل إضافة السؤال");
    } finally {
      setIsSubmitting(false);
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
          <p className="text-slate-500">إدارة أسئلة السرعة في النظام العام مع الصور وشرح الخطأ</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{questions.length}</div>
            <div className="text-sm text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {questions.filter((q) => q.is_active).length}
            </div>
            <div className="text-sm text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> إضافة سؤال جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-5">
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
              <Label className="text-sm font-bold text-slate-700">شرح الخطأ</Label>
              <Textarea
                placeholder="اكتب سبب الخطأ أو تلميح التصحيح..."
                value={newQuestion.answer_explanation}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer_explanation: e.target.value })}
                className="min-h-24"
              />
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
                        className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${
                          isCorrect ? "bg-emerald-500 text-white" : "bg-white border text-slate-300"
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <Input
                        placeholder={`الخيار ${idx}`}
                        value={newQuestion[choiceKey] as string}
                        onChange={(e) => setNewQuestion({ ...newQuestion, [choiceKey]: e.target.value })}
                        className={isCorrect ? "border-green-500" : ""}
                      />
                    </div>
                    {renderImageControl(imageKey, `صورة الخيار ${idx}`)}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="btn-primary-gradient gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة السؤال
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>قائمة الأسئلة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <Timer className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد أسئلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السؤال</TableHead>
                    <TableHead>الإجابة الصحيحة</TableHead>
                    <TableHead className="w-24">الحالة</TableHead>
                    <TableHead className="w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => {
                    const choices = [q.choice1, q.choice2, q.choice3, q.choice4];
                    const correctIndex = q.correct_choice_index > 0 ? q.correct_choice_index - 1 : 0;
                    const correctChoice = choices[correctIndex] || q.choice1;

                    return (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-2">
                            {q.question_image_url && (
                              <img src={q.question_image_url} alt="" className="h-9 w-9 rounded object-cover bg-slate-50" />
                            )}
                            <span className="truncate">{q.question_text}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {correctChoice}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={q.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => toggleActive(q.id, q.is_active)}
                          >
                            {q.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(q.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا السؤال؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
