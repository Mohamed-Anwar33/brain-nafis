import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Puzzle, X, Edit, Upload, Image as ImageIcon, RotateCcw, Save } from "lucide-react";
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

interface MatchingItem {
  left_text: string;
  right_text: string;
  left_image_url?: string;
  right_image_url?: string;
}

interface MatchingQuestion {
  id: string;
  items: MatchingItem[];
  is_active: boolean;
  created_at: string;
}

export default function CentralExamMatching() {
  const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<{index: number, side: 'left'|'right'} | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{index: number, side: 'left'|'right'} | null>(null);

  const defaultQuestionState = {
    id: undefined as string | undefined,
    items: [
      { left_text: "", right_text: "", left_image_url: undefined, right_image_url: undefined },
      { left_text: "", right_text: "", left_image_url: undefined, right_image_url: undefined },
      { left_text: "", right_text: "", left_image_url: undefined, right_image_url: undefined },
    ] as MatchingItem[]
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
        .from("matching_game_questions")
        .select("*")
        .eq('track_type', 'central')
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions((data as MatchingQuestion[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

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
    if (!file || !uploadTarget) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يجب اختيار ملف صورة');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setIsUploading(uploadTarget);
    const imageUrl = await uploadImage(file, 'matching-game');
    
    if (imageUrl) {
      const newItems = [...questionForm.items];
      if (uploadTarget.side === 'left') {
        newItems[uploadTarget.index].left_image_url = imageUrl;
      } else {
        newItems[uploadTarget.index].right_image_url = imageUrl;
      }
      setQuestionForm({ ...questionForm, items: newItems });
      toast.success('تم رفع الصورة بنجاح');
    }
    
    setIsUploading(null);
    setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openUploadDialog = (index: number, side: 'left' | 'right') => {
    setUploadTarget({ index, side });
    fileInputRef.current?.click();
  };

  const removeImage = (index: number, side: 'left' | 'right') => {
    const newItems = [...questionForm.items];
    if (side === 'left') {
      newItems[index].left_image_url = undefined;
    } else {
      newItems[index].right_image_url = undefined;
    }
    setQuestionForm({ ...questionForm, items: newItems });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = questionForm.items.filter(
      (i) => (i.left_text.trim() || i.left_image_url) && (i.right_text.trim() || i.right_image_url)
    );
    
    if (validItems.length < 2) {
      toast.error("يجب إدخال زوجين (عنصر أيسر وعنصر أيمن) على الأقل بصورة صحيحة");
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
        items: validItems,
        is_active: true,
        track_type: "central",
        grade_subject_id: scope.gradeSubjectId,
        domain_id: scope.domainId
      };

      if (questionForm.id) {
        const { error } = await supabase.from("matching_game_questions").update(payload).eq("id", questionForm.id);
        if (error) throw error;
        toast.success("تم التحديث بنجاح");
      } else {
        const { error } = await supabase.from("matching_game_questions").insert(payload);
        if (error) throw error;
        toast.success("تمت الإضافة بنجاح");
      }

      setQuestionForm(defaultQuestionState);
      fetchQuestions();
      
      // Scroll to top to see feedback
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      toast.error(questionForm.id ? "فشل تحديث السؤال" : "فشل إضافة السؤال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (q: MatchingQuestion) => {
    const paddedItems = [...q.items];
    while (paddedItems.length < 3) {
       paddedItems.push({ left_text: "", right_text: "" });
    }
    
    setQuestionForm({
      id: q.id,
      items: paddedItems
    });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addItem = () => {
    setQuestionForm({
      ...questionForm,
      items: [...questionForm.items, { left_text: "", right_text: "" }],
    });
  };

  const removeItem = (index: number) => {
    if (questionForm.items.length <= 2) {
      toast.error("يجب الاحتفاظ بزوجين على الأقل");
      return;
    }
    setQuestionForm({
      ...questionForm,
      items: questionForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: "left_text" | "right_text", value: string) => {
    const newItems = [...questionForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuestionForm({ ...questionForm, items: newItems });
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from("matching_game_questions")
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
        .from("matching_game_questions")
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
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Puzzle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">لعبة المطابقة</h1>
            <p className="text-slate-500 font-medium mt-1">إعداد أسئلة لعبة التوصيل والمطابقة الخاصة بالاختبار المركزي</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 shadow-sm overflow-hidden relative">
           <div className="absolute left-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <CardContent className="p-6 relative z-10 flex flex-col items-center">
            <div className="text-4xl font-black text-purple-600 mb-1">{questions.length}</div>
            <div className="text-sm font-bold text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 shadow-sm overflow-hidden relative">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="text-4xl font-black text-emerald-600 mb-1">{questions.filter((q) => q.is_active).length}</div>
            <div className="text-sm font-bold text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <Card className="shadow-md border-slate-200 bg-white">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
              {questionForm.id ? <Edit className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-purple-500" />} 
              {questionForm.id ? "تعديل السؤال" : "إضافة سؤال مطابقة جديد"}
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
               <Puzzle className="w-5 h-5 shrink-0 mt-0.5" />
               <p>قم بتحديد العنصر (شكل أو نص) وما يطابقه (شكله أو نصه العكسي). سيقوم النظام بخلطها عشوائياً للطالب لكي يقوم بتوصيلها بشكل تفاعلي.</p>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
               <SelectionScopeFields value={scope} onChange={setScope} trackMode="central" />
             </div>

            <div className="space-y-4">
              {questionForm.items.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                  
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 hidden md:flex w-8 h-8 bg-slate-800 text-white rounded-full items-center justify-center font-bold text-sm shadow-md z-10 border-2 border-white">
                    {index + 1}
                  </div>
                  <div className="md:hidden w-full text-center font-bold text-slate-400 mb-[-10px]">الزوج رقم {index + 1}</div>

                  {/* Left Element Input */}
                  <div className="flex-1 space-y-2 w-full">
                    <Label className="text-xs font-bold text-slate-500">العنصر الأول</Label>
                    <div className="flex items-start gap-2 h-12">
                      <Input
                        placeholder="نص (مثال: عاصمة السعودية)"
                        value={item.left_text}
                        onChange={(e) => updateItem(index, "left_text", e.target.value)}
                        className="h-full rounded-xl bg-white border-slate-300"
                      />
                      {item.left_image_url ? (
                        <div className="relative shrink-0 w-12 h-12 rounded-xl group border bg-white flex items-center justify-center overflow-hidden">
                          <img src={item.left_image_url} alt="Left" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(index, 'left')} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button 
                           type="button" 
                           variant="outline" 
                           className="h-full px-3 shrink-0 rounded-xl bg-white text-slate-500"
                           onClick={() => openUploadDialog(index, 'left')}
                           disabled={isUploading?.index === index && isUploading?.side === 'left'}
                           title="إضافة صورة"
                        >
                           {isUploading?.index === index && isUploading?.side === 'left' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Spacer / Equal Sign */}
                  <div className="w-10 h-10 shrink-0 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200 md:rotate-0 rotate-90">
                    <span className="font-bold text-purple-600 block leading-none">=</span>
                  </div>

                  {/* Right Element Input */}
                  <div className="flex-1 space-y-2 w-full">
                    <Label className="text-xs font-bold text-slate-500">العنصر المطابق لـه</Label>
                    <div className="flex items-start gap-2 h-12">
                      <Input
                        placeholder="نص (مثال: الرياض)"
                        value={item.right_text}
                        onChange={(e) => updateItem(index, "right_text", e.target.value)}
                        className="h-full rounded-xl bg-white border-slate-300"
                      />
                      {item.right_image_url ? (
                        <div className="relative shrink-0 w-12 h-12 rounded-xl group border bg-white flex items-center justify-center overflow-hidden">
                          <img src={item.right_image_url} alt="Right" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(index, 'right')} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button 
                           type="button" 
                           variant="outline" 
                           className="h-full px-3 shrink-0 rounded-xl bg-white text-slate-500"
                           onClick={() => openUploadDialog(index, 'right')}
                           disabled={isUploading?.index === index && isUploading?.side === 'right'}
                           title="إضافة صورة"
                        >
                           {isUploading?.index === index && isUploading?.side === 'right' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={questionForm.items.length <= 2}
                    className="shrink-0 text-red-500 hover:bg-red-50 self-end md:self-auto h-12 w-12 rounded-xl mt-4 md:mt-6"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              
              <Button type="button" variant="outline" onClick={addItem} className="w-full h-12 border-dashed border-2 rounded-2xl gap-2 font-bold text-slate-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-colors">
                <Plus className="w-5 h-5" /> إضافة زوج مُطابقة آخر
              </Button>
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className={`h-12 px-10 text-base font-bold rounded-xl shadow-md ${questionForm.id ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-purple-500/20"} gap-2`}
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
           قائمة أسئلة المطابقة المضافة
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border"><Loader2 className="w-10 h-10 animate-spin text-purple-500" /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Puzzle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
                      {q.items.map((item, i) => (
                         <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-2 px-3 border border-slate-100">
                            <div className="flex items-center gap-2 max-w-[40%]">
                               {item.left_image_url && <img src={item.left_image_url} className="w-6 h-6 rounded object-cover" />}
                               <span className="truncate font-medium" title={item.left_text}>{item.left_text || 'صورة'}</span>
                            </div>
                            
                            <span className="text-purple-400 text-xs font-black">=</span>
                            
                            <div className="flex items-center gap-2 max-w-[40%] flex-row-reverse">
                               {item.right_image_url && <img src={item.right_image_url} className="w-6 h-6 rounded object-cover" />}
                               <span className="truncate font-medium text-left dir-ltr" title={item.right_text}>{item.right_text || 'صورة'}</span>
                            </div>
                         </div>
                      ))}
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
