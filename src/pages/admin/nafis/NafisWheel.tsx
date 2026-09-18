import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Trash2, Plus, Loader2, Sparkles, ChevronDown, ChevronUp, Pencil, Check, X, Tag } from "lucide-react";
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
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

interface WheelSection {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  domain_id?: string | null;
  grade_subject_id?: string | null;
}

interface WheelQuestion {
  id: string;
  section_id: string;
  text: string;
  points: number;
  is_active: boolean;
  domain_id?: string | null;
}

export default function NafisWheel() {
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

  const [sections, setSections] = useState<WheelSection[]>([]);
  const [questions, setQuestions] = useState<Record<string, WheelQuestion[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "section" | "question" } | null>(null);

  const [newSection, setNewSection] = useState({ name: "", description: "" });
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newQuestions, setNewQuestions] = useState<Record<string, { text: string; points: number }>>({});

  // Inline section rename state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("wheel_sections")
        .select("*")
        .or("track_type.eq.nafis,track_type.is.null")
        .order("created_at", { ascending: false });

      if (sectionsError) throw sectionsError;
      setSections((sectionsData as WheelSection[]) || []);

      const questionsMap: Record<string, WheelQuestion[]> = {};
      for (const section of (sectionsData as WheelSection[]) || []) {
        const { data: qData } = await supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("section_id", section.id)
          .or("track_type.eq.nafis,track_type.is.null")
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
      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

      const { error } = await supabase.from("wheel_sections").insert({
        name: newSection.name.trim(),
        color: "#6366f1",
        is_active: true,
        track_type: "nafis",
        grade_subject_id: defaultGradeSubjectId,
        domain_id: selectedDomainId && selectedDomainId !== "none" ? selectedDomainId : null,
      });

      if (error) throw error;
      toast.success("تم إضافة القسم بنجاح");
      setNewSection({ name: "", description: "" });
      fetchSections();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "فشل إضافة القسم");
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
      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";
      const section = sections.find((s) => s.id === sectionId);

      const { error } = await supabase.from("wheel_section_questions").insert({
        section_id: sectionId,
        text: q.text.trim(),
        points: q.points || 10,
        is_active: true,
        track_type: "nafis",
        grade_subject_id: defaultGradeSubjectId,
        domain_id: section?.domain_id || null,
      });

      if (error) throw error;
      toast.success("تم إضافة السؤال بنجاح");
      setNewQuestions((prev) => ({ ...prev, [sectionId]: { text: "", points: 10 } }));
      fetchSections();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "فشل إضافة السؤال");
    }
  };

  const confirmDelete = (id: string, type: "section" | "question") => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const table = itemToDelete.type === "section" ? "wheel_sections" : "wheel_section_questions";
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

  const handleRenameSection = async (sectionId: string) => {
    const trimmed = editingSectionName.trim();
    if (!trimmed) {
      toast.error("اسم القسم لا يمكن أن يكون فارغاً");
      return;
    }
    try {
      const { error } = await supabase
        .from("wheel_sections")
        .update({ name: trimmed })
        .eq("id", sectionId);
      if (error) throw error;
      setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, name: trimmed } : s)));
      toast.success("تم تعديل اسم القسم بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تعديل اسم القسم");
    } finally {
      setEditingSectionId(null);
      setEditingSectionName("");
    }
  };

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSections(next);
  };

  const toggleActive = async (id: string, currentState: boolean, type: "section" | "question") => {
    try {
      const table = type === "section" ? "wheel_sections" : "wheel_section_questions";
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentState })
        .eq("id", id);
      if (error) throw error;

      if (type === "section") {
        setSections((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: !currentState } : s))
        );
      } else {
        setQuestions((prev) => {
          const next = { ...prev };
          for (const sId in next) {
            next[sId] = next[sId].map((q) => (q.id === id ? { ...q, is_active: !currentState } : q));
          }
          return next;
        });
      }
      toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
    } catch (err) {
      toast.error("فشل التحديث");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">عجلة العلوم - براين ساينس</h1>
          <p className="text-slate-500">إدارة أقسام وأسئلة عجلة الحظ العلمية وربطها بالمجالات</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{sections.length}</div>
            <div className="text-sm text-slate-600 font-bold">إجمالي الأقسام</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {Object.values(questions).reduce((sum, qList) => sum + qList.length, 0)}
            </div>
            <div className="text-sm text-slate-600 font-bold">إجمالي أسئلة العجلة</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Section */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" /> إضافة قسم جديد لعجلة العلوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSection} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">المجال العلمي (اختياري)</Label>
                <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="اختر المجال" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">بدون مجال محدد</SelectItem>
                    {domains.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">اسم القسم</Label>
                <Input
                  placeholder="مثال: علم الأحياء..."
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">وصف القسم (اختياري)</Label>
                <Input
                  placeholder="وصف مختصر..."
                  value={newSection.description}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة القسم الآن
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sections List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">لا توجد أقسام مخصصة بعد</p>
          </div>
        ) : (
          sections.map((section) => {
            const domainName = domains.find((d) => d.id === section.domain_id)?.name;
            return (
              <Collapsible
                key={section.id}
                open={expandedSections.has(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <Card className="overflow-hidden border-slate-200 shadow-xs">
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-base">{section.name}</h3>
                            {domainName && (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                                {domainName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {questions[section.id]?.length || 0} أسئلة
                            {section.description && ` • ${section.description}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={section.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(section.id, section.is_active, "section");
                          }}
                        >
                          {section.is_active ? "نشط" : "مخفي"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(section.id, "section");
                          }}
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="text-slate-400 p-1">
                          {expandedSections.has(section.id) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {/* Add Question to Section */}
                      <div className="flex gap-2 pt-3">
                        <Input
                          placeholder="أدخل نص السؤال لهذا القسم..."
                          value={newQuestions[section.id]?.text || ""}
                          onChange={(e) =>
                            setNewQuestions((prev) => ({
                              ...prev,
                              [section.id]: {
                                text: e.target.value,
                                points: prev[section.id]?.points || 10,
                              },
                            }))
                          }
                          className="bg-white"
                        />
                        <Input
                          type="number"
                          placeholder="النقاط"
                          value={newQuestions[section.id]?.points || 10}
                          onChange={(e) =>
                            setNewQuestions((prev) => ({
                              ...prev,
                              [section.id]: {
                                text: prev[section.id]?.text || "",
                                points: parseInt(e.target.value) || 10,
                              },
                            }))
                          }
                          className="w-24 bg-white text-center font-bold"
                        />
                        <Button
                          onClick={() => handleAddQuestion(section.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 shrink-0"
                        >
                          <Plus className="w-4 h-4" /> إضافة سؤال
                        </Button>
                      </div>

                      {/* Question List */}
                      <div className="space-y-2">
                        {(questions[section.id] || []).length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-3">لا توجد أسئلة في هذا القسم بعد</p>
                        ) : (
                          (questions[section.id] || []).map((q) => (
                            <div
                              key={q.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200"
                            >
                              <span className="text-sm text-slate-800 font-medium">{q.text}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-bold text-xs">
                                  {q.points} نقطة
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDelete(q.id, "question")}
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 font-bold">
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
