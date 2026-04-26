import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WheelSection {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface WheelQuestion {
  id: string;
  section_id: string;
  text: string;
  points: number;
  is_active: boolean;
}

export default function NafisWheel() {
  const [sections, setSections] = useState<WheelSection[]>([]);
  const [questions, setQuestions] = useState<Record<string, WheelQuestion[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'section' | 'question' } | null>(null);

  const [newSection, setNewSection] = useState({ name: "", description: "" });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newQuestions, setNewQuestions] = useState<Record<string, { text: string; points: number }>>({});

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("wheel_sections")
        .select("*")
        .or('track_type.eq.nafis,track_type.is.null')
        .order("created_at", { ascending: false });

      if (sectionsError) throw sectionsError;
      setSections((sectionsData as WheelSection[]) || []);

      // Fetch questions for each section
      const questionsMap: Record<string, WheelQuestion[]> = {};
      for (const section of (sectionsData as WheelSection[]) || []) {
        const { data: qData } = await supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("section_id", section.id)
          .or('track_type.eq.nafis,track_type.is.null')
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

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.name.trim()) {
      toast.error("يجب إدخال اسم القسم");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("wheel_sections").insert({
        name: newSection.name,
        color: '#6366f1',
        description: newSection.description || null,
        is_active: true,
        track_type: "nafis"
      });

      if (error) throw error;
      toast.success("تم إضافة القسم بنجاح");
      setNewSection({ name: "", description: "" });
      fetchSections();
    } catch (err) {
      console.error(err);
      toast.error("فشل إضافة القسم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async (sectionId: string) => {
    const q = newQuestions[sectionId];
    if (!q?.text.trim()) {
      toast.error("يجب إدخال نص السؤال");
      return;
    }

    try {
      const { error } = await supabase.from("wheel_section_questions").insert({
        section_id: sectionId,
        text: q.text,
        points: q.points || 10,
        is_active: true,
        track_type: "nafis"
      });

      if (error) throw error;
      toast.success("تم إضافة السؤال بنجاح");
      setNewQuestions(prev => ({ ...prev, [sectionId]: { text: "", points: 10 } }));
      fetchSections();
    } catch (err) {
      console.error(err);
      toast.error("فشل إضافة السؤال");
    }
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
    } catch (err) {
      toast.error("فشل الحذف");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentState: boolean, type: 'section' | 'question') => {
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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">عجلة العلوم - براين ساينس</h1>
          <p className="text-slate-500">إدارة أقسام وأسئلة العجلة في النظام العام</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-rose-600">{sections.length}</div>
            <div className="text-sm text-slate-600">عدد الأقسام</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(questions).flat().length}
            </div>
            <div className="text-sm text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {sections.filter(s => s.is_active).length}
            </div>
            <div className="text-sm text-slate-600">الأقسام النشطة</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> إضافة قسم جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSection} className="flex gap-3">
            <Input
              placeholder="اسم القسم (مثال: الأحياء, الكيمياء, الفيزياء)..."
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="وصف القسم (اختياري)..."
              value={newSection.description}
              onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
              className="flex-1"
            />
            <Button type="submit" disabled={isSubmitting} className="btn-primary-gradient gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد أقسام</p>
          </div>
        ) : (
          sections.map((section) => (
            <Collapsible key={section.id} open={expandedSections.has(section.id)} onOpenChange={() => toggleSection(section.id)}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-rose-600" />
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-slate-800">{section.name}</h3>
                        <p className="text-sm text-slate-500">
                          {questions[section.id]?.length || 0} سؤال
                          {section.description && ` • ${section.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={section.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); toggleActive(section.id, section.is_active, 'section'); }}
                      >
                        {section.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); confirmDelete(section.id, 'section'); }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      {expandedSections.has(section.id) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t bg-slate-50/50">
                    <div className="pt-4 space-y-3">
                      {/* Add Question Form */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="نص السؤال..."
                          value={newQuestions[section.id]?.text || ""}
                          onChange={(e) => setNewQuestions(prev => ({ ...prev, [section.id]: { ...prev[section.id], text: e.target.value } }))}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="النقاط"
                          value={newQuestions[section.id]?.points || 10}
                          onChange={(e) => setNewQuestions(prev => ({ ...prev, [section.id]: { ...prev[section.id], points: parseInt(e.target.value) || 10 } }))}
                          className="w-24"
                        />
                        <Button onClick={() => handleAddQuestion(section.id)} className="btn-primary-gradient">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Questions List */}
                      <div className="space-y-2">
                        {questions[section.id]?.map((q) => (
                          <div key={q.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <span className="text-sm">{q.text}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{q.points} نقطة</Badge>
                              <Badge 
                                variant={q.is_active ? "default" : "secondary"}
                                className="cursor-pointer text-xs"
                                onClick={() => toggleActive(q.id, q.is_active, 'question')}
                              >
                                {q.is_active ? "نشط" : "غير نشط"}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => confirmDelete(q.id, 'question')}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(!questions[section.id] || questions[section.id].length === 0) && (
                          <p className="text-sm text-slate-400 text-center py-4">لا توجد أسئلة في هذا القسم</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'section' ? 'هل أنت متأكد من حذف هذا القسم وجميع أسئلته؟' : 'هل أنت متأكد من حذف هذا السؤال؟'}
            </AlertDialogDescription>
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
