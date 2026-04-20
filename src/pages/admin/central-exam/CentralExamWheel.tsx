import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, AlertTriangle, Settings, Eye, EyeOff, LayoutGrid, HelpCircle, CheckCircle2, Image as ImageIcon, Upload, X, Edit, RotateCcw, Plus, Loader2, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SelectionScopeFields } from "@/components/admin/SelectionScopeFields";
import { validateSelectionScope } from "@/lib/selection-scope-validation";
import { SelectionScopeValue } from "@/types/selection";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WheelSection {
  id: string;
  name: string;
  is_active: boolean;
  grade_subject_id?: string;
  domain_id?: string;
}

interface WheelQuestion {
  id: string;
  section_id: string;
  text: string;
  points: number;
  is_active: boolean;
  image_url: string | null;
  choices: { id: string; text: string; is_correct: boolean }[];
}

const MAX_ACTIVE_SECTIONS = 8;
const DEFAULT_CHOICES = [
  { id: "1", text: "", is_correct: true },
  { id: "2", text: "", is_correct: false },
  { id: "3", text: "", is_correct: false },
  { id: "4", text: "", is_correct: false },
];

export default function CentralExamWheel() {
  const [sections, setSections] = useState<WheelSection[]>([]);
  const [questions, setQuestions] = useState<Record<string, WheelQuestion[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'section' | 'question' } | null>(null);

  const [newSection, setNewSection] = useState({ name: "" });

  const [sectionScope, setSectionScope] = useState<SelectionScopeValue>({
    trackType: "central",
    gradeId: "",
    subjectId: "",
    gradeSubjectId: "",
    domainId: "",
  });

  // To manage the Questions Dialog
  const [manageSectionId, setManageSectionId] = useState<string | null>(null);

  // Question Form State
  const [questionForm, setQuestionForm] = useState<{
    id?: string;
    text: string;
    points: number;
    image_url: string | null;
    choices: { id: string; text: string; is_correct: boolean }[];
  }>({
    text: "",
    points: 10,
    image_url: null,
    choices: JSON.parse(JSON.stringify(DEFAULT_CHOICES)),
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sectionScope.gradeSubjectId && sectionScope.domainId) {
      fetchSections();
    } else {
      setSections([]);
      setQuestions({});
      setIsLoading(false);
    }
  }, [sectionScope.gradeSubjectId, sectionScope.domainId]);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("wheel_sections")
        .select("id, name, color, icon, is_active, order_index, grade_subject_id, domain_id")
        .eq('track_type', 'central')
        .order("created_at", { ascending: false });

      if (sectionScope.gradeSubjectId) {
        query = query.eq('grade_subject_id', sectionScope.gradeSubjectId);
      }
      if (sectionScope.domainId) {
        query = query.eq('domain_id', sectionScope.domainId);
      }

      const { data: sectionsData, error: sectionsError } = await query;

      if (sectionsError) throw sectionsError;
      setSections((sectionsData as WheelSection[]) || []);

      // Fetch questions for each section
      const questionsMap: Record<string, WheelQuestion[]> = {};
      for (const section of (sectionsData as WheelSection[]) || []) {
        const { data: qData } = await supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("section_id", section.id)
          .eq('track_type', 'central')
          .order("created_at", { ascending: false });
        questionsMap[section.id] = (qData as WheelQuestion[]) || [];
      }
      setQuestions(questionsMap);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const activeSectionsCount = sections.filter(s => s.is_active).length;

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.name.trim()) {
      toast.error("يجب إدخال اسم القسم");
      return;
    }

    const scopeError = validateSelectionScope(sectionScope);
    if (scopeError) {
      toast.error(scopeError);
      return;
    }

    setIsSubmitting(true);
    try {
      const willBeActive = activeSectionsCount < MAX_ACTIVE_SECTIONS;
      const { error } = await supabase.from("wheel_sections").insert({
        name: newSection.name,
        is_active: willBeActive,
        track_type: "central",
        grade_subject_id: sectionScope.gradeSubjectId,
        domain_id: sectionScope.domainId
      });

      if (error) throw error;
      toast.success("تم إضافة القسم بنجاح");
      if (!willBeActive) {
        toast.warning(`تمت إضافته كغير نشط لتجاوز الحد الأقصى (${MAX_ACTIVE_SECTIONS})`);
      }
      setNewSection({ name: "" });
      fetchSections();
    } catch (err) {
      console.error(err);
      toast.error("فشل إضافة القسم");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload Logic
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
    const imageUrl = await uploadImage(file, 'wheel-questions');
    if (imageUrl) {
      setQuestionForm(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('تم رفع الصورة بنجاح');
    }
    setUploadingImage(false);
  };

  const updateChoice = (index: number, field: string, value: any) => {
    const newChoices = [...questionForm.choices];
    if (field === "is_correct" && value === true) {
      newChoices.forEach(c => c.is_correct = false);
    }
    newChoices[index] = { ...newChoices[index], [field]: value };
    setQuestionForm(prev => ({ ...prev, choices: newChoices }));
  };

  const handleSaveQuestion = async () => {
    if (!manageSectionId) return;
    
    if (!questionForm.text.trim()) {
      toast.error("يجب إدخال نص السؤال");
      return;
    }
    
    const validChoices = questionForm.choices.filter(c => c.text.trim() !== "");
    if (validChoices.length < 2) {
      toast.error("يجب إدخال خيارين للإجابة على الأقل");
      return;
    }
    if (!validChoices.some(c => c.is_correct)) {
      toast.error("يجب تحديد إجابة صحيحة واحدة على الأقل");
      return;
    }

    const section = sections.find(s => s.id === manageSectionId);
    if (!section) return;

    setIsSubmittingQuestion(true);
    try {
      const payload = {
        section_id: manageSectionId,
        text: questionForm.text.trim(),
        points: questionForm.points,
        image_url: questionForm.image_url,
        choices: validChoices,
        is_active: true,
        track_type: "central",
        grade_subject_id: section.grade_subject_id,
        domain_id: section.domain_id
      };

      if (questionForm.id) {
        // Update
        const { error } = await supabase.from("wheel_section_questions").update(payload).eq("id", questionForm.id);
        if (error) throw error;
        toast.success("تم تحديث السؤال بنجاح");
      } else {
        // Insert
        const { error } = await supabase.from("wheel_section_questions").insert(payload);
        if (error) throw error;
        toast.success("تم إضافة السؤال بنجاح");
      }
      
      resetQuestionForm();
      fetchSections();
    } catch (err) {
      console.error(err);
      toast.error(questionForm.id ? "فشل تحديث السؤال" : "فشل إضافة السؤال");
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      text: "",
      points: 10,
      image_url: null,
      choices: JSON.parse(JSON.stringify(DEFAULT_CHOICES))
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditQuestion = (q: WheelQuestion) => {
    // Fill up empty choices if needed to show 4 slots
    let paddedChoices = Array.isArray(q.choices) ? [...q.choices] : [];
    while (paddedChoices.length < 4) {
      paddedChoices.push({ id: Math.random().toString(), text: "", is_correct: false });
    }

    setQuestionForm({
      id: q.id,
      text: q.text,
      points: q.points,
      image_url: q.image_url || null,
      choices: paddedChoices.slice(0, 4) // Safety slice
    });
  };

  const confirmDelete = (id: string, type: 'section' | 'question') => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const table = itemToDelete.type === 'section' ? "wheel_sections" : "wheel_section_questions";
      const { error } = await supabase.from(table).delete().eq("id", itemToDelete.id);
      if (error) throw error;
      toast.success("تم الحذف بنجاح");
      fetchSections();
      if (itemToDelete.type === 'section' && manageSectionId === itemToDelete.id) {
        setManageSectionId(null);
      }
      // If we are editing the question we just deleted, reset form
      if (itemToDelete.type === 'question' && questionForm.id === itemToDelete.id) {
        resetQuestionForm();
      }
    } catch (err) {
      toast.error("فشل الحذف");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentState: boolean, type: 'section' | 'question') => {
    if (type === 'section' && !currentState && activeSectionsCount >= MAX_ACTIVE_SECTIONS) {
      toast.error(`لا يمكن تفعيل القسم. الحد الأقصى هو ${MAX_ACTIVE_SECTIONS} أقسام نشطة في العجلة.`);
      return;
    }

    try {
      const table = type === 'section' ? "wheel_sections" : "wheel_section_questions";
      const { error } = await supabase.from(table).update({ is_active: !currentState }).eq("id", id);
      if (error) throw error;
      if (type === 'section') {
        setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentState } : s));
      } else {
        fetchSections();
      }
      toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
    } catch (err) {
      toast.error("فشل التحديث");
    }
  };

  const activeSectionObj = manageSectionId ? sections.find(s => s.id === manageSectionId) : null;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إعدادات عجلة العلوم</h1>
            <p className="text-slate-500 font-medium mt-1">قم بتجهيز أقسام العجلة وإضافة أسئلة بداخل كل قسم (نظام الكويز)</p>
          </div>
        </div>
      </div>

      {/* Stats & Guidelines */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100 overflow-hidden relative">
          <div className="absolute left-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <CardContent className="p-6 relative z-10 flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-full shrink-0">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">كيف تعمل هذه اللعبة؟</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                كل <b>قسم</b> يمثل مساراً مستقلاً ويجب أن يحتوي على عدة أسئلة.<br/>
                عندما تلف العجلة وتقف على قسم معين، سيدخل الطالب في نمط "كويز" للإجابة على جميع الأسئلة.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
            <div className={`text-4xl font-black mb-1 ${activeSectionsCount >= MAX_ACTIVE_SECTIONS ? 'text-amber-600' : 'text-emerald-600'}`}>
              {activeSectionsCount} <span className="text-lg text-slate-400 font-normal">/ {MAX_ACTIVE_SECTIONS}</span>
            </div>
            <div className="text-sm font-semibold text-slate-600">الأقسام النشطة في العجلة</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl font-black mb-1 text-purple-600">
              {Object.values(questions).flat().length}
            </div>
            <div className="text-sm font-semibold text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Section Area */}
      <Card className="shadow-md border-0 bg-white">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
            <Plus className="w-5 h-5 text-rose-500" />
            إضافة قسم جديد للعجلة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleAddSection} className="flex flex-col gap-4 max-w-3xl">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <SelectionScopeFields value={sectionScope} onChange={setSectionScope} trackMode="central" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="اسم القسم (مثال: الفيزياء، علوم الفضاء، الكيمياء العضوية)..."
                  value={newSection.name}
                  onChange={(e) => setNewSection({ name: e.target.value })}
                  className="h-12 text-lg border-slate-300 focus-visible:ring-rose-500 rounded-xl"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="h-12 px-8 text-base font-bold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md shadow-rose-500/20 rounded-xl"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-2" /> : <Plus className="w-5 h-5 ml-2" />}
                إضافة القسم
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sections Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-slate-400" />
          إدارة الأقسام الحالية
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-rose-500" /></div>
        ) : (!sectionScope.gradeSubjectId || !sectionScope.domainId) ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">الرجاء اختيار المادة والمجال أولاً من الأعلى لعرض الأقسام وإدارتها.</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">لم تقم بإضافة أي أقسام بعد لهذا المجال.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sections.map((section) => {
              const qCount = questions[section.id]?.length || 0;
              return (
                <Card 
                  key={section.id} 
                  className={`overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${section.is_active ? 'border-primary/20 shadow-primary/5' : 'opacity-80 bg-slate-50'}`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-xl font-black text-rose-500">
                        {section.name.charAt(0)}
                      </div>
                      <Badge 
                        variant={section.is_active ? "default" : "secondary"}
                        className={`cursor-pointer ${section.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                        onClick={() => toggleActive(section.id, section.is_active, 'section')}
                      >
                        {section.is_active ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
                        {section.is_active ? "مرئي للطلاب" : "مخفي"}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 text-xl line-clamp-1 truncate" title={section.name}>{section.name}</CardTitle>
                    <CardDescription className="font-semibold text-slate-500">
                      يحتوي على {qCount} سؤال
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="p-5 pt-0 mt-4 flex gap-2">
                    <Button 
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                      onClick={() => setManageSectionId(section.id)}
                    >
                      <Settings className="w-4 h-4 ml-2" />
                      إدارة الأسئلة
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => confirmDelete(section.id, 'section')}
                      className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Questions Management Dialog */}
      <Dialog 
        open={!!manageSectionId} 
        onOpenChange={(open) => {
          if (!open) {
            setManageSectionId(null);
            resetQuestionForm();
          }
        }}
      >
        <DialogContent className="max-w-4xl w-full h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl" dir="rtl">
          <DialogHeader className="p-6 pb-4 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-800">
                    أسئلة القسم: {activeSectionObj?.name}
                  </DialogTitle>
                  <DialogDescription className="text-base text-slate-500 mt-1">
                    أضف كل الأسئلة التي يجب على الطالب الإجابة عليها.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Dialog Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
            {activeSectionObj && (
              <div className="space-y-6">
                
                {/* Advanced Add/Edit Question Form */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm outline outline-1 outline-rose-100">
                  <div className="flex items-center justify-between mb-4 border-b pb-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                      {questionForm.id ? <Edit className="w-5 h-5 text-amber-500"/> : <Plus className="w-5 h-5 text-rose-500"/>} 
                      {questionForm.id ? "تعديل السؤال" : "إضافة سؤال جديد للتحدي"}
                    </h3>
                    {questionForm.id && (
                      <Button variant="ghost" size="sm" onClick={resetQuestionForm} className="text-slate-500 hover:text-slate-700">
                        <RotateCcw className="w-4 h-4 ml-1" /> تفريغ لإضافة جديد
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-5">
                    {/* Top Row: Text + Image */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                      <div className="space-y-2">
                        <Label>نص السؤال</Label>
                        <Input
                          placeholder="اكتب نص السؤال هنا العالي الجودة..."
                          value={questionForm.text}
                          onChange={(e) => setQuestionForm(prev => ({ ...prev, text: e.target.value }))}
                          className="h-12 text-base rounded-xl border-slate-300"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>صورة مرفقة (اختياري)</Label>
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
                            className="h-12 border-slate-300 rounded-xl"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Upload className="w-4 h-4 ml-1" />}
                            {questionForm.image_url ? 'تغيير' : 'رفع صورة'}
                          </Button>
                          {questionForm.image_url && (
                             <div className="relative w-12 h-12 bg-slate-100 rounded-lg border">
                               <img src={questionForm.image_url} alt="Attached" className="w-full h-full object-cover rounded-lg" />
                               <button 
                                 type="button" 
                                 className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                 onClick={() => setQuestionForm(prev => ({...prev, image_url: null}))}
                               >
                                 <X className="w-3 h-3" />
                               </button>
                             </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Choices & Points */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                      <div className="md:col-span-9 space-y-3">
                        <Label className="flex items-center gap-2">
                          خيارات الإجابة 
                          <span className="text-xs text-slate-400 font-normal">(حدد علامة صح بجانب الإجابة الصحيحة)</span>
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {questionForm.choices.map((choice, idx) => (
                            <div key={idx} className={`flex items-center gap-2 p-2 relative rounded-xl border transition-colors ${choice.is_correct ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                              <button 
                                type="button" 
                                onClick={() => updateChoice(idx, "is_correct", true)} 
                                className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center transition-colors shadow-sm ${choice.is_correct ? 'bg-emerald-500 text-white' : 'bg-white border text-slate-300 hover:text-slate-400'}`}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <Input 
                                value={choice.text} 
                                onChange={(e) => updateChoice(idx, "text", e.target.value)} 
                                placeholder={`الخيار ${idx + 1}`} 
                                className={`h-10 text-sm border-0 focus-visible:ring-1 bg-transparent ${choice.is_correct ? 'focus-visible:ring-emerald-400' : 'focus-visible:ring-slate-300'}`} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-3 space-y-3 flex flex-col justify-end">
                        <Label>نقاط السؤال</Label>
                        <div className="flex flex-col gap-3">
                          <div className="relative">
                            <Input
                              type="number"
                              min={1}
                              value={questionForm.points}
                              onChange={(e) => setQuestionForm(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                              className="h-12 pl-10 text-center font-bold rounded-xl border-slate-300"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">نقطة</span>
                          </div>
                          <Button 
                            onClick={handleSaveQuestion} 
                            disabled={isSubmittingQuestion || uploadingImage}
                            className={`h-12 font-bold rounded-xl shadow-md w-full ${questionForm.id ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                          >
                            {isSubmittingQuestion ? <Loader2 className="w-5 h-5 animate-spin" /> : questionForm.id ? "حفظ التعديل" : "إضافة السؤال"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* List of existing questions */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 text-lg border-b pb-2 flex items-center justify-between">
                    <span>قائمة الأسئلة ({questions[activeSectionObj.id]?.length || 0}):</span>
                  </h3>
                  
                  {(!questions[activeSectionObj.id] || questions[activeSectionObj.id].length === 0) ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                      <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 font-medium">القسم فارغ! لا يوجد به أسئلة حتى الآن.</p>
                      <p className="text-sm text-slate-400">عند وقوف العجلة على قسم فارغ، لن تظهر أسئلة للطلاب.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions[activeSectionObj.id]?.map((q, index) => (
                        <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border hover:shadow-sm hover:border-slate-300 transition-all gap-4">
                          <div className="flex gap-4 items-start flex-1 min-w-0">
                            <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-inner">
                              {index + 1}
                            </div>
                            
                            {q.image_url && (
                                <img src={q.image_url} className="w-12 h-12 rounded-lg object-cover border shrink-0 mt-0.5" alt="Q img"/>
                            )}

                            <div className="min-w-0 flex-1">
                                <span className="text-base text-slate-800 font-bold block truncate" title={q.text}>{q.text}</span>
                                <div className="text-sm text-slate-500 mt-1 flex gap-2 flex-wrap truncate">
                                   {Array.isArray(q.choices) ? q.choices.map((c: any, i: number) => (
                                     <span key={i} className={c.is_correct ? 'text-emerald-600 font-bold' : ''}>
                                        {c.text || '-'} {c.is_correct && '✓'}
                                     </span>
                                   )).flatMap((el: React.ReactElement, i: number, arr: React.ReactElement[]) => i < arr.length - 1 ? [el, <span key={`sep-${i}`}> | </span>] : [el]) : 'لا توجد خيارات واضحة'}
                                </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                            <Badge variant="outline" className="h-8 px-3 text-sm font-bold bg-amber-50 text-amber-700 border-amber-200">
                              {q.points} نقطة
                            </Badge>
                            <Badge 
                              variant={q.is_active ? "default" : "secondary"}
                              className={`cursor-pointer h-8 px-2 mx-1 ${q.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                              onClick={() => toggleActive(q.id, q.is_active, 'question')}
                            >
                              {q.is_active ? "نشط" : "مخفي"}
                            </Badge>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg bg-slate-50 border" 
                              onClick={() => handleEditQuestion(q)}
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg bg-slate-50 border" 
                              onClick={() => confirmDelete(q.id, 'question')}
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-white flex justify-end shrink-0">
            <Button onClick={() => setManageSectionId(null)} className="h-12 px-8 rounded-xl font-bold" variant="outline">
              إغلاق وحفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              تأكيد الحذف النهائي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              {itemToDelete?.type === 'section' ? (
                <>
                  هل أنت متأكد من رغبتك في حذف هذا القسم؟
                  <br />
                  <span className="text-red-500 font-bold block mt-2">تحذير: سيتم حذف جميع الأسئلة المرتبطة به بشكل نهائي!</span>
                </>
              ) : 'هل أنت متأكد من حذف هذا السؤال بشكل نهائي؟ لن يمكنك التراجع عن ذلك.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-0 mt-4">
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="h-11 rounded-lg">تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 h-11 rounded-lg font-bold">نعم، متأكد قم بالحذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
