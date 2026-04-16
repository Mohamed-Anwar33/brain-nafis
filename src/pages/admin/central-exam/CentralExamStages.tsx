import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, ListOrdered, ArrowUp, ArrowDown, Edit, RotateCcw, Save, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { SelectionScopeFields } from "@/components/admin/SelectionScopeFields";
import { validateSelectionScope } from "@/lib/selection-scope-validation";
import { SelectionScopeValue } from "@/types/selection";

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
  created_at: string;
}

export default function CentralExamStages() {
  const [questions, setQuestions] = useState<StageQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const defaultQuestionState = {
    id: undefined as string | undefined,
    title: "",
    items: [
      { id: "1", text: "", order: 1 },
      { id: "2", text: "", order: 2 },
      { id: "3", text: "", order: 3 },
    ] as StageItem[]
  };

  const [questionForm, setQuestionForm] = useState(defaultQuestionState);

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
        .from("stages_game_questions")
        .select("*")
        .eq('track_type', 'central')
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.title.trim()) {
      toast.error("يجب إدخال عنوان السؤال (مثال: مراحل نمو النبات)");
      return;
    }

    const validItems = questionForm.items.filter((i) => i.text.trim());
    if (validItems.length < 2) {
      toast.error("يجب إدخال مرحلتين على الأقل");
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
        title: questionForm.title.trim(),
        items: validItems.map((item, idx) => ({ ...item, order: idx + 1 })),
        is_active: true,
        track_type: "central",
        grade_subject_id: scope.gradeSubjectId,
        domain_id: scope.domainId
      };

      if (questionForm.id) {
        const { error } = await supabase.from("stages_game_questions").update(payload).eq("id", questionForm.id);
        if (error) throw error;
        toast.success("تم التحديث بنجاح");
      } else {
        const { error } = await supabase.from("stages_game_questions").insert(payload);
        if (error) throw error;
        toast.success("تمت الإضافة بنجاح");
      }

      setQuestionForm(defaultQuestionState);
      fetchQuestions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      toast.error(questionForm.id ? "فشل التحديث" : "فشل الإضافة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (q: StageQuestion) => {
    const paddedItems = [...q.items];
    while (paddedItems.length < 3) {
      paddedItems.push({ id: Math.random().toString(), text: "", order: paddedItems.length + 1 });
    }
    setQuestionForm({
      id: q.id,
      title: q.title,
      items: paddedItems
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addItem = () => {
    setQuestionForm({
      ...questionForm,
      items: [...questionForm.items, { id: Math.random().toString(), text: "", order: questionForm.items.length + 1 }],
    });
  };

  const removeItem = (index: number) => {
    if (questionForm.items.length <= 2) {
      toast.error("يجب الاحتفاظ بمرحلتين على الأقل");
      return;
    }
    const newItems = questionForm.items.filter((_, i) => i !== index);
    setQuestionForm({
      ...questionForm,
      items: newItems.map((item, i) => ({ ...item, order: i + 1 })),
    });
  };

  const updateItem = (index: number, text: string) => {
    const newItems = [...questionForm.items];
    newItems[index] = { ...newItems[index], text };
    setQuestionForm({ ...questionForm, items: newItems });
  };

  const moveItem = (index: number, direction: number) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === questionForm.items.length - 1)) return;
    const newItems = [...questionForm.items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    
    setQuestionForm({
      ...questionForm,
      items: newItems.map((item, i) => ({ ...item, order: i + 1 })),
    });
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from("stages_game_questions")
        .delete()
        .eq("id", itemToDelete);
      if (error) throw error;
      toast.success("تم الحذف بنجاح");
      if (questionForm.id === itemToDelete) {
         setQuestionForm(defaultQuestionState);
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
        .from("stages_game_questions")
        .update({ is_active: !currentState })
        .eq("id", id);
      if (error) throw error;
      setQuestions(
        questions.map((q) =>
          q.id === id ? { ...q, is_active: !currentState } : q
        )
      );
      toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
    } catch (err) {
      toast.error("فشل التحديث");
    }
  };

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ListOrdered className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">لعبة المراحل</h1>
            <p className="text-slate-500 font-medium mt-1">إعداد أسئلة ترتيب المراحل (مثال: مراحل تطور، خطوات تجربة علمية)</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-sm overflow-hidden relative">
           <div className="absolute left-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <CardContent className="p-6 relative z-10 flex flex-col items-center">
            <div className="text-4xl font-black text-blue-600 mb-1">{questions.length}</div>
            <div className="text-sm font-bold text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 shadow-sm overflow-hidden relative">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="text-4xl font-black text-indigo-600 mb-1">{questions.filter((q) => q.is_active).length}</div>
            <div className="text-sm font-bold text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <Card className="shadow-md border-slate-200 bg-white">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
              {questionForm.id ? <Edit className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-blue-500" />} 
              {questionForm.id ? "تعديل السؤال" : "إضافة سؤال مراحل جديد"}
            </CardTitle>
            {questionForm.id && (
              <Button variant="ghost" size="sm" onClick={() => setQuestionForm(defaultQuestionState)} className="text-slate-500">
                <RotateCcw className="w-4 h-4 ml-1" /> إضافة بدلاً من التعديل
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
             <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4 border border-blue-100 flex gap-3">
               <ListOrdered className="w-5 h-5 shrink-0 mt-0.5" />
               <p>أدخل عنوان المرحلة (السؤال) أولاً، ثم أدخل المراحل <b>بالترتيب الصحيح 100%</b>. سيقوم النظام ببعثرتها ليقوم الطالب بجمعها وترتيبها في الاختبار.</p>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
               <SelectionScopeFields value={scope} onChange={setScope} trackMode="central" />
             </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">عنوان السؤال</Label>
              <Input
                placeholder="مثال: رتّب مراحل نمو النبات بالتسلسل الصحيح..."
                value={questionForm.title}
                onChange={(e) => setQuestionForm({...questionForm, title: e.target.value})}
                className="h-12 rounded-xl border-slate-300 focus-visible:ring-blue-500 font-bold"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-bold text-slate-700">قائمة المراحل (بالترتيب الصحيح):</Label>
              <div className="flex flex-col gap-3">
                {questionForm.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 relative group transition-colors hover:border-blue-300 hover:bg-blue-50/30">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-black shrink-0 shadow-inner">
                      {index + 1}
                    </div>
                    <Input
                      placeholder={`أدخل المرحلة رقم ${index + 1}`}
                      value={item.text}
                      onChange={(e) => updateItem(index, e.target.value)}
                      className="h-12 rounded-xl bg-white border-slate-300 focus-visible:ring-blue-500"
                    />
                    <div className="flex gap-1 shrink-0">
                      <Button type="button" variant="outline" className="h-12 w-10 p-0 rounded-xl bg-white border-slate-200 text-slate-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" className="h-12 w-10 p-0 rounded-xl bg-white border-slate-200 text-slate-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => moveItem(index, 1)} disabled={index === questionForm.items.length - 1}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" className="h-12 w-10 p-0 rounded-xl bg-white border-red-100 text-red-400 hover:text-red-700 hover:bg-red-50 hover:border-red-200" onClick={() => removeItem(index)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addItem} className="w-full h-12 border-dashed border-2 rounded-2xl gap-2 font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors mt-2">
                <Plus className="w-5 h-5" /> إضافة مرحلة جديدة للترتيب
              </Button>
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className={`h-12 px-10 text-base font-bold rounded-xl shadow-md ${questionForm.id ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20"} gap-2`}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : questionForm.id ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {questionForm.id ? "حفظ التعديلات" : "إضافة السؤال وبدء سؤال جديد"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           قائمة أسئلة المراحل المضافة
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <ListOrdered className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
                       className={`cursor-pointer ${q.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                       onClick={() => toggleActive(q.id, q.is_active)}
                     >
                       {q.is_active ? "نشط" : "غير نشط"}
                     </Badge>
                   </div>
                   
                   <div className="p-4 space-y-3">
                      <div className="font-bold text-slate-800 text-base">{q.title}</div>
                      
                      <div className="space-y-1.5 pt-1">
                          {q.items.slice(0, 4).map((item, i) => (
                             <div key={item.id} className="flex items-center gap-3 text-sm bg-slate-50/80 rounded-lg p-2 px-3 border border-slate-100">
                                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">{i + 1}</span>
                                <span className="truncate flex-1 text-slate-600" title={item.text}>{item.text}</span>
                             </div>
                          ))}
                          {q.items.length > 4 && (
                             <div className="text-center text-xs font-bold text-slate-400 py-1 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                + {q.items.length - 4} مراحل أخرى...
                             </div>
                          )}
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
            <AlertDialogDescription className="text-base text-slate-600">هل أنت متأكد من حذف هذا السؤال النهائي؟ لن يمكنك التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-3 sm:gap-0">
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="rounded-xl h-11">تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 rounded-xl h-11 font-bold">حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
