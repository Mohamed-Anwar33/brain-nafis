import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, Puzzle } from "lucide-react";
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

interface OrderingQuestion {
  id: string;
  title: string;
  items: string[];
  is_active: boolean;
}

export default function NafisOrdering() {
  const [questions, setQuestions] = useState<OrderingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState({
    title: "",
    item1: "", item2: "", item3: "", item4: ""
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ordering_game_questions")
        .select("*")
        .or('track_type.eq.nafis,track_type.is.null')
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions((data as OrderingQuestion[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = [newQuestion.item1, newQuestion.item2, newQuestion.item3, newQuestion.item4]
      .filter(s => s && s.trim());

    if (items.length < 2) {
      toast.error("يجب إدخال عنصرين على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("ordering_game_questions").insert({
        title: newQuestion.title || "ترتيب العناصر",
        items: items,
        correct_order: items,
        is_active: true,
        track_type: "nafis"
      });

      if (error) throw error;
      toast.success("تمت الإضافة بنجاح");
      setNewQuestion({ title: "", item1: "", item2: "", item3: "", item4: "" });
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
      const { error } = await supabase.from("ordering_game_questions").delete().eq("id", itemToDelete);
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
        .from("ordering_game_questions")
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Puzzle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">لعبة الترتيب - براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة الترتيب في النظام العام</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-600">{questions.length}</div>
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
              placeholder="عنوان السؤال..."
              value={newQuestion.title}
              onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="العنصر 1" value={newQuestion.item1} onChange={(e) => setNewQuestion({ ...newQuestion, item1: e.target.value })} />
              <Input placeholder="العنصر 2" value={newQuestion.item2} onChange={(e) => setNewQuestion({ ...newQuestion, item2: e.target.value })} />
              <Input placeholder="العنصر 3 (اختياري)" value={newQuestion.item3} onChange={(e) => setNewQuestion({ ...newQuestion, item3: e.target.value })} />
              <Input placeholder="العنصر 4 (اختياري)" value={newQuestion.item4} onChange={(e) => setNewQuestion({ ...newQuestion, item4: e.target.value })} />
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
              <Puzzle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد أسئلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>العناصر</TableHead>
                    <TableHead className="w-24">الحالة</TableHead>
                    <TableHead className="w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">{question.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {question.items?.slice(0, 3).map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                          ))}
                          {(question.items?.length || 0) > 3 && <Badge variant="outline" className="text-xs">+{(question.items?.length || 0) - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={question.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(question.id, question.is_active)}>
                          {question.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(question.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
