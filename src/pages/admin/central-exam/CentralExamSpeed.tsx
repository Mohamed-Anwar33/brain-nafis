import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Timer, Edit, RotateCcw, Save, CheckCircle2 } from "lucide-react";
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

interface SpeedQuestion {
  id: string;
  question_text: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correct_choice_index: number;
  is_active: boolean;
  created_at: string;
}

export default function CentralExamSpeed() {
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const defaultQuestionState = {
    id: undefined as string | undefined,
    question_text: "",
    choice1: "",
    choice2: "",
    choice3: "",
    choice4: "",
    correct_choice_index: 1,
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
        .from("speed_challenge_questions")
        .select("*")
        .eq('track_type', 'central')
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.question_text.trim()) {
      toast.error("يجب إدخال نص السؤال");
      return;
    }

    // Validate at least 2 choices have text
    const filledChoices = [questionForm.choice1, questionForm.choice2, questionForm.choice3, questionForm.choice4]
      .filter(c => c.trim() !== "");
    if (filledChoices.length < 2) {
      toast.error("يجب إدخال خيارين على الأقل");
      return;
    }

    // Validate correct choice has text
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
        choice1: questionForm.choice1.trim() || "-",
        choice2: questionForm.choice2.trim() || "-",
        choice3: questionForm.choice3.trim() || "-",
        choice4: questionForm.choice4.trim() || "-",
        correct_choice_index: questionForm.correct_choice_index,
        is_active: true,
        track_type: "central",
        stage: "central",
        grade_subject_id: scope.gradeSubjectId,
        domain_id: scope.domainId
      };

      if (questionForm.id) {
        const { error } = await supabase.from("speed_challenge_questions").update(payload).eq("id", questionForm.id);
        if (error) throw error;
        toast.success("تم التحديث بنجاح");
      } else {
        const { error } = await supabase.from("speed_challenge_questions").insert(payload);
        if (error) throw error;
        toast.success("تمت الإضافة بنجاح");
      }

      setQuestionForm(defaultQuestionState);
      fetchQuestions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      question_text: q.question_text,
      choice1: q.choice1 || "",
      choice2: q.choice2 || "",
      choice3: q.choice3 || "",
      choice4: q.choice4 || "",
      correct_choice_index: q.correct_choice_index || 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        .from("speed_challenge_questions")
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Timer className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">تحدي السرعة</h1>
            <p className="text-slate-500 font-medium mt-1">إعداد أسئلة اختيار من متعدد بأسلوب سريع ضمن وقت محدد</p>
          </div>
       </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 shadow-sm overflow-hidden relative">
           <div className="absolute left-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <CardContent className="p-6 relative z-10 flex flex-col items-center">
            <div className="text-4xl font-black text-amber-600 mb-1">{questions.length}</div>
            <div className="text-sm font-bold text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 shadow-sm overflow-hidden relative">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="text-4xl font-black text-orange-600 mb-1">{questions.filter((q) => q.is_active).length}</div>
            <div className="text-sm font-bold text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <Card className="shadow-md border-slate-200 bg-white">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
              {questionForm.id ? <Edit className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-amber-500" />} 
              {questionForm.id ? "تعديل السؤال" : "إضافة سؤال سرعة جديد"}
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
             <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm mb-4 border border-amber-100 flex gap-3">
               <Timer className="w-5 h-5 shrink-0 mt-0.5" />
               <p>أدخل السؤال وأربعة خيارات ثم حدد الإجابة الصحيحة بالضغط على الدائرة بجانبها. تحدي السرعة يعتمد على الاختيار من متعدد.</p>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
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

            {/* Choices */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                خيارات الإجابة 
                <span className="text-xs text-slate-400 font-normal">(حدد علامة صح بجانب الإجابة الصحيحة)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((idx) => {
                  const choiceKey = `choice${idx}` as keyof typeof questionForm;
                  const isCorrect = questionForm.correct_choice_index === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                    >
                      <button 
                        type="button" 
                        onClick={() => setQuestionForm({ ...questionForm, correct_choice_index: idx })} 
                        className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center transition-colors shadow-sm ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white border text-slate-300 hover:text-slate-400'}`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <Input 
                        value={questionForm[choiceKey] as string} 
                        onChange={(e) => setQuestionForm({ ...questionForm, [choiceKey]: e.target.value })} 
                        placeholder={`الخيار ${idx}`} 
                        className={`h-10 text-sm border-0 focus-visible:ring-1 bg-transparent ${isCorrect ? 'focus-visible:ring-emerald-400' : 'focus-visible:ring-slate-300'}`} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className={`h-12 px-10 text-base font-bold rounded-xl shadow-md ${questionForm.id ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20"} gap-2`}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : questionForm.id ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {questionForm.id ? "حفظ التعديلات" : "إضافة السؤال"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           قائمة أسئلة تحدي السرعة
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
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
                       className={`cursor-pointer ${q.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                       onClick={() => toggleActive(q.id, q.is_active)}
                     >
                       {q.is_active ? "نشط" : "مخفي"}
                     </Badge>
                   </div>
                   
                   <div className="p-4 space-y-3">
                      <div className="font-bold text-slate-800 text-base">{q.question_text}</div>
                      
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        {[1, 2, 3, 4].map(i => {
                          const text = q[`choice${i}` as keyof SpeedQuestion] as string;
                          if (!text || text === "-") return null;
                          const isCorrect = q.correct_choice_index === i;
                          return (
                            <div key={i} className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${isCorrect ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-50 text-slate-600'}`}>
                              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
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
