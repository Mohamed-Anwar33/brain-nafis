import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, ListOrdered, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
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

interface StageItem {
  id: string;
  text: string;
  order: number;
}

interface StageQuestion {
  id: string;
  title: string;
  items: StageItem[];
  is_active: boolean;
}

export default function NafisStages() {
  const [questions, setQuestions] = useState<StageQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState({
    title: "",
  });
  const [items, setItems] = useState<StageItem[]>([
    { id: "1", text: "", order: 1 },
    { id: "2", text: "", order: 2 },
    { id: "3", text: "", order: 3 },
  ]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("stages_game_questions")
        .select("*")
        .or('track_type.eq.nafis,track_type.is.null')
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions((data as StageQuestion[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.text.trim());
    if (validItems.length < 2) {
      toast.error("يجب إدخال مرحلتين على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("stages_game_questions").insert({
        title: newQuestion.title || "ترتيب المراحل",
        items: validItems.map((item, idx) => ({ ...item, order: idx + 1 })),
        is_active: true,
        track_type: "nafis"
      });

      if (error) throw error;
      toast.success("تمت الإضافة بنجاح");
      setNewQuestion({ title: "" });
      setItems([
        { id: "1", text: "", order: 1 },
        { id: "2", text: "", order: 2 },
        { id: "3", text: "", order: 3 },
      ]);
      fetchQuestions();
    } catch (err) {
      console.error(err);
      toast.error("فشل إضافة السؤال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: String(items.length + 1), text: "", order: items.length + 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 2) {
      toast.error("يجب الاحتفاظ بمرحلتين على الأقل");
      return;
    }
    setItems(items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 })));
  };

  const updateItem = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    setItems(newItems);
  };

  const moveItem = (index: number, direction: number) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === items.length - 1)) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from("stages_game_questions").delete().eq("id", itemToDelete);
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
        .from("stages_game_questions")
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <ListOrdered className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">لعبة المراحل - براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة المراحل في النظام العام</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-sky-600">{questions.length}</div>
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
              placeholder="عنوان السؤال (مثال: مراحل نمو النبات)..."
              value={newQuestion.title}
              onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">المراحل بالترتيب الصحيح:</label>
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <Input
                    placeholder={`المرحلة ${index + 1}`}
                    value={item.text}
                    onChange={(e) => updateItem(index, e.target.value)}
                  />
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}>
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addItem} className="w-full gap-2">
                <Plus className="w-4 h-4" /> إضافة مرحلة
              </Button>
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
              <ListOrdered className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد أسئلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المراحل</TableHead>
                    <TableHead className="w-24">الحالة</TableHead>
                    <TableHead className="w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {q.items?.slice(0, 4).map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {i + 1}. {item.text}
                            </Badge>
                          ))}
                          {(q.items?.length || 0) > 4 && <Badge variant="outline" className="text-xs">+{(q.items?.length || 0) - 4}</Badge>}
                        </div>
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
