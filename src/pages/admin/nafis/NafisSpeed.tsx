import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Timer, Eye } from "lucide-react";
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

interface SpeedQuestion {
  id: string;
  question_text: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correct_choice_index: number;
  is_active: boolean;
}

export default function NafisSpeed() {
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    choice1: "", choice2: "", choice3: "", choice4: "",
    correct_choice_index: 0
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
        .or('track_type.eq.nafis,track_type.is.null')
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question_text || !newQuestion.choice1 || !newQuestion.choice2) {
      toast.error("يجب ملء السؤال وخيارين على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("speed_challenge_questions").insert({
        question_text: newQuestion.question_text,
        choice1: newQuestion.choice1,
        choice2: newQuestion.choice2,
        choice3: newQuestion.choice3 || "",
        choice4: newQuestion.choice4 || "",
        correct_choice_index: newQuestion.correct_choice_index,
        is_active: true,
        track_type: "nafis"
      });

      if (error) throw error;
      toast.success("تمت الإضافة بنجاح");
      setNewQuestion({ question_text: "", choice1: "", choice2: "", choice3: "", choice4: "", correct_choice_index: 0 });
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
      const { error } = await supabase.from("speed_challenge_questions").delete().eq("id", itemToDelete);
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
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !currentState } : q));
      toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
    } catch (err) {
      toast.error("فشل التحديث");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Timer className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">تحدي السرعة - براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة السرعة في النظام العام</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{questions.length}</div>
            <div className="text-sm text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{questions.filter(q => q.is_active).length}</div>
            <div className="text-sm text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> إضافة سؤال جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              placeholder="نص السؤال..."
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
            />
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { key: 'choice1', label: 'الاختيار 1 (الصح)' },
                { key: 'choice2', label: 'الاختيار 2' },
                { key: 'choice3', label: 'الاختيار 3' },
                { key: 'choice4', label: 'الاختيار 4' }
              ].map((opt, i) => (
                <div key={opt.key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={newQuestion.correct_choice_index === i}
                    onChange={() => setNewQuestion({ ...newQuestion, correct_choice_index: i })}
                    className="w-4 h-4 text-primary"
                  />
                  <Input
                    placeholder={opt.label}
                    value={(newQuestion as any)[opt.key]}
                    onChange={(e) => setNewQuestion({ ...newQuestion, [opt.key]: e.target.value })}
                    className={newQuestion.correct_choice_index === i ? 'border-green-500' : ''}
                  />
                </div>
              ))}
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
        <CardHeader><CardTitle>قائمة الأسئلة</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
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
                    const choices = [q.choice1, q.choice2, q.choice3, q.choice4].filter(Boolean);
                    const correctChoice = choices[q.correct_choice_index] || q.choice1;
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-xs truncate">{q.question_text}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {correctChoice}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(q.id, q.is_active)}>
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
