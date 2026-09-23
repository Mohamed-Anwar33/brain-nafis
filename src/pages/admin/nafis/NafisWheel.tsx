import { useState, useEffect, useMemo, useRef } from "react";
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
import {
  Trash2,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Tag,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  HelpCircle,
  Video,
  Upload,
} from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

interface WheelChoice {
  id: string;
  text: string;
  is_correct: boolean;
  image_url?: string | null;
}

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
  image_url?: string | null;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  choices?: WheelChoice[];
}

const DEFAULT_CHOICES: WheelChoice[] = [
  { id: "1", text: "", is_correct: true, image_url: null },
  { id: "2", text: "", is_correct: false, image_url: null },
  { id: "3", text: "", is_correct: false, image_url: null },
  { id: "4", text: "", is_correct: false, image_url: null },
];

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
      })
      .sort((a, b) => {
        const getPriority = (name: string) => {
          const n = (name || "").toLowerCase();
          if (n.includes("أحياء") || n.includes("احياء")) return 1;
          if (n.includes("كيمياء")) return 2;
          if (n.includes("فيزياء")) return 3;
          if (n.includes("كهرباء") || n.includes("مغناطيس")) return 4;
          if (n.includes("أرض") || n.includes("ارض") || n.includes("فضاء") || n.includes("بيئة")) return 5;
          if (n.includes("طبيعة") || n.includes("طبيعه")) return 6;
          return 10;
        };
        return getPriority(a.name) - getPriority(b.name);
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

  // Question Form / Modal State
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<WheelSection | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<WheelQuestion | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionPoints, setQuestionPoints] = useState(10);
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);
  const [wrongReason, setWrongReason] = useState("");
  const [explanationUrl, setExplanationUrl] = useState("");
  const [choices, setChoices] = useState<WheelChoice[]>(DEFAULT_CHOICES);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Upload States
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingChoiceIdx, setUploadingChoiceIdx] = useState<number | null>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `wheel-questions/${fileName}`;

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

  const handleQuestionImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يجب اختيار ملف صورة");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }
    setUploadingQuestionImage(true);
    const url = await uploadImage(file);
    if (url) {
      setQuestionImageUrl(url);
      toast.success("تم رفع صورة السؤال بنجاح");
    }
    setUploadingQuestionImage(false);
    if (questionFileInputRef.current) questionFileInputRef.current.value = "";
  };

  const handleChoiceImageUpload = async (idx: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("يجب اختيار ملف صورة");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }
    setUploadingChoiceIdx(idx);
    const url = await uploadImage(file);
    if (url) {
      setChoices((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], image_url: url };
        return next;
      });
      toast.success("تم رفع صورة الخيار بنجاح");
    }
    setUploadingChoiceIdx(null);
  };

  const removeChoiceImage = (idx: number) => {
    setChoices((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], image_url: null };
      return next;
    });
  };

  const openAddQuestionModal = (section: WheelSection) => {
    setTargetSection(section);
    setEditingQuestion(null);
    setQuestionText("");
    setQuestionPoints(10);
    setQuestionImageUrl(null);
    setWrongReason("");
    setExplanationUrl("");
    setChoices([
      { id: "1", text: "", is_correct: true, image_url: null },
      { id: "2", text: "", is_correct: false, image_url: null },
      { id: "3", text: "", is_correct: false, image_url: null },
      { id: "4", text: "", is_correct: false, image_url: null },
    ]);
    setQuestionModalOpen(true);
  };

  const openEditQuestionModal = (section: WheelSection, q: WheelQuestion) => {
    setTargetSection(section);
    setEditingQuestion(q);
    setQuestionText(q.text);
    setQuestionPoints(q.points || 10);
    setQuestionImageUrl(q.image_url || null);
    setWrongReason(q.wrong_reason || "");
    setExplanationUrl(q.explanation_url || "");

    let currentChoices: WheelChoice[] = [];
    if (Array.isArray(q.choices) && q.choices.length > 0) {
      currentChoices = q.choices.map((c, idx) => ({
        id: c.id || String(idx + 1),
        text: c.text || "",
        is_correct: !!c.is_correct,
        image_url: c.image_url || null,
      }));
    }
    while (currentChoices.length < 4) {
      currentChoices.push({
        id: String(currentChoices.length + 1),
        text: "",
        is_correct: currentChoices.length === 0,
        image_url: null,
      });
    }
    if (!currentChoices.some((c) => c.is_correct)) {
      currentChoices[0].is_correct = true;
    }
    setChoices(currentChoices);
    setQuestionModalOpen(true);
  };

  const addChoice = () => {
    if (choices.length >= 6) {
      toast.error("الحد الأقصى هو 6 خيارات");
      return;
    }
    setChoices((prev) => [
      ...prev,
      { id: String(prev.length + 1), text: "", is_correct: false, image_url: null },
    ]);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) {
      toast.error("يجب إبقاء خيارين على الأقل");
      return;
    }
    const next = choices.filter((_, i) => i !== index);
    if (choices[index].is_correct && next.length > 0) {
      next[0].is_correct = true;
    }
    setChoices(next);
  };

  const updateChoiceText = (index: number, text: string) => {
    setChoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text };
      return next;
    });
  };

  const setCorrectChoice = (index: number) => {
    setChoices((prev) =>
      prev.map((c, i) => ({
        ...c,
        is_correct: i === index,
      }))
    );
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSection) return;

    if (!questionText.trim()) {
      toast.error("يجب إدخال نص السؤال");
      return;
    }

    const validChoices = choices.filter((c) => c.text.trim() !== "" || c.image_url);
    if (validChoices.length < 2) {
      toast.error("يجب إدخال خيارين للإجابة على الأقل (نص أو صورة)");
      return;
    }

    if (!validChoices.some((c) => c.is_correct)) {
      toast.error("يجب تحديد إجابة صحيحة واحدة على الأقل");
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

      const payload: Record<string, any> = {
        section_id: targetSection.id,
        text: questionText.trim(),
        points: questionPoints || 10,
        choices: validChoices,
        image_url: questionImageUrl || null,
        wrong_reason: wrongReason.trim() || null,
        explanation_url: explanationUrl.trim() || null,
        is_active: true,
        track_type: "nafis",
        grade_subject_id: targetSection.grade_subject_id || defaultGradeSubjectId,
        domain_id: targetSection.domain_id || null,
      };

      if (editingQuestion) {
        let { error } = await supabase
          .from("wheel_section_questions")
          .update(payload)
          .eq("id", editingQuestion.id);

        // Fallback if wrong_reason or explanation_url columns are missing
        if (error && (error.code === "42703" || error.message?.includes("explanation_url") || error.message?.includes("wrong_reason"))) {
          delete payload.wrong_reason;
          delete payload.explanation_url;
          const retry = await supabase
            .from("wheel_section_questions")
            .update(payload)
            .eq("id", editingQuestion.id);
          error = retry.error;
        }

        if (error) throw error;
        toast.success("تم تحديث السؤال بنجاح");
      } else {
        let { error } = await supabase.from("wheel_section_questions").insert(payload);

        // Fallback if wrong_reason or explanation_url columns are missing
        if (error && (error.code === "42703" || error.message?.includes("explanation_url") || error.message?.includes("wrong_reason"))) {
          delete payload.wrong_reason;
          delete payload.explanation_url;
          const retry = await supabase.from("wheel_section_questions").insert(payload);
          error = retry.error;
        }

        if (error) throw error;
        toast.success("تم إضافة السؤال بنجاح");
      }

      setQuestionModalOpen(false);
      fetchSections();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "حدث خطأ أثناء حفظ السؤال");
    } finally {
      setIsSubmittingQuestion(false);
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
                    <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {/* Section Questions Header & Add Button */}
                      <div className="flex items-center justify-between pt-3 pb-1 border-b border-slate-200/80">
                        <div>
                          <span className="text-sm font-black text-slate-800">
                            أسئلة قسم ({section.name})
                          </span>
                          <span className="text-xs text-slate-500 mr-2 font-medium">
                            ({questions[section.id]?.length || 0} أسئلة مضافة)
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openAddQuestionModal(section)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm rounded-xl text-xs sm:text-sm px-3.5 h-9"
                        >
                          <Plus className="w-4 h-4" /> إضافة سؤال جديد بالخيارات
                        </Button>
                      </div>

                      {/* Question List */}
                      <div className="space-y-3">
                        {(questions[section.id] || []).length === 0 ? (
                          <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs sm:text-sm text-slate-400 font-bold mb-2">لا توجد أسئلة في هذا القسم بعد</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddQuestionModal(section)}
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs font-bold"
                            >
                              <Plus className="w-3.5 h-3.5 ml-1" /> إضافة أول سؤال لهذا القسم
                            </Button>
                          </div>
                        ) : (
                          (questions[section.id] || []).map((q, qIndex) => (
                            <div
                              key={q.id}
                              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {qIndex + 1}
                                  </span>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start gap-2.5">
                                      {q.image_url && (
                                        <img
                                          src={q.image_url}
                                          alt="Question"
                                          className="w-12 h-12 object-cover rounded-lg border shrink-0 bg-slate-50"
                                        />
                                      )}
                                      <span className="text-sm sm:text-base text-slate-900 font-bold block leading-snug">
                                        {q.text}
                                      </span>
                                    </div>

                                    {/* Choices Pills with Correct Answer & Choice Images highlighted */}
                                    <div className="flex flex-wrap gap-2">
                                      {Array.isArray(q.choices) && q.choices.length > 0 ? (
                                        q.choices.map((c, cIdx) => (
                                          <span
                                            key={cIdx}
                                            className={`text-xs px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-2 ${
                                              c.is_correct
                                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-black shadow-2xs ring-1 ring-emerald-200"
                                                : "bg-slate-50 text-slate-600 border-slate-200 font-medium"
                                            }`}
                                          >
                                            {c.image_url && (
                                              <img
                                                src={c.image_url}
                                                alt=""
                                                className="w-5 h-5 rounded object-cover border shrink-0"
                                              />
                                            )}
                                            <span>{c.text || (c.image_url ? "(صورة فقط)" : "(خيار فارغ)")}</span>
                                            {c.is_correct && (
                                              <span className="bg-emerald-600 text-white rounded-full px-1 text-[10px] font-black">
                                                ✓
                                              </span>
                                            )}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 font-bold">
                                          ⚠️ لم يتم إدخال خيارات لهذا السؤال - اضغط زر التعديل لإضافتها
                                        </span>
                                      )}
                                    </div>

                                    {/* Explanation / Video Link Indicator if available */}
                                    {(q.wrong_reason || q.explanation_url) && (
                                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                        {q.wrong_reason && (
                                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                            <span className="truncate max-w-xs">{q.wrong_reason}</span>
                                          </span>
                                        )}
                                        {q.explanation_url && (
                                          <a
                                            href={q.explanation_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 font-bold"
                                          >
                                            <Video className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>رابط شرح متاح</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="secondary" className="font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {q.points || 10} نقطة
                                  </Badge>
                                  <Badge
                                    variant={q.is_active ? "default" : "secondary"}
                                    className={`cursor-pointer text-xs ${q.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                                    onClick={() => toggleActive(q.id, q.is_active, "question")}
                                  >
                                    {q.is_active ? "نشط" : "مخفي"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditQuestionModal(section, q)}
                                    className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                                    title="تعديل السؤال والخيارات"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => confirmDelete(q.id, "question")}
                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                    title="حذف السؤال"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
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

      {/* Add / Edit Question Dialog */}
      <Dialog open={questionModalOpen} onOpenChange={setQuestionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>
                {editingQuestion ? "تعديل السؤال والخيارات" : "إضافة سؤال جديد لقسم: "}
                {targetSection && <span className="text-indigo-600 font-bold">{targetSection.name}</span>}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveQuestion} className="space-y-4 pt-2">
            <input
              type="file"
              ref={questionFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleQuestionImageSelect}
            />

            {/* Question Text */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">نص السؤال *</Label>
              <Textarea
                placeholder="أدخل نص السؤال العلمي هنا..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="min-h-20 text-sm"
                required
              />
            </div>

            {/* Question Image and Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">صورة السؤال (اختياري)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => questionFileInputRef.current?.click()}
                    disabled={uploadingQuestionImage}
                    className="gap-2 text-xs h-10 border-dashed flex-1"
                  >
                    {uploadingQuestionImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                    {questionImageUrl ? "تغيير صورة السؤال" : "إرفاق صورة للسؤال"}
                  </Button>
                  {questionImageUrl && (
                    <div className="relative w-10 h-10 shrink-0 border rounded-lg overflow-hidden bg-slate-50">
                      <img src={questionImageUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setQuestionImageUrl(null)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        title="حذف الصورة"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">النقاط</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={questionPoints}
                  onChange={(e) => setQuestionPoints(parseInt(e.target.value) || 10)}
                  className="h-10 font-bold"
                />
              </div>
            </div>

            {/* Wrong Reason / Solution Explanation */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>تفسير الحل أو توضيح الخطأ (يظهر للطالب عند الإجابة الخاطئة)</span>
              </Label>
              <Textarea
                placeholder="اكتب التفسير العلمي للحل أو سبب الخطأ..."
                value={wrongReason}
                onChange={(e) => setWrongReason(e.target.value)}
                className="min-h-16 text-sm"
              />
            </div>

            {/* Explanation Video / Platform URL */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-indigo-600" />
                <span>رابط شرح السؤال (المنصة التعليمية / يوتيوب / فيديو)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={explanationUrl}
                  onChange={(e) => setExplanationUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... أو رابط المنصة التعليمية أو فيديو"
                  dir="ltr"
                  className="text-left font-mono text-xs flex-1 h-10"
                />
                {explanationUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(explanationUrl, "_blank")}
                    className="gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 shrink-0 h-10 px-3 border-indigo-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>اختبار الرابط</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Choices Section */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-black text-slate-800 block">
                    خيارات الإجابة *
                  </Label>
                  <span className="text-xs text-slate-500">
                    حدد الإجابة الصحيحة ويمكنك إضافة صورة لكل خيار
                  </span>
                </div>
                {choices.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChoice}
                    className="text-xs gap-1 h-8 font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة خيار
                  </Button>
                )}
              </div>

              <div className="grid gap-3">
                {choices.map((choice, idx) => {
                  const isCorrect = choice.is_correct;
                  const isChoiceUploading = uploadingChoiceIdx === idx;

                  return (
                    <div
                      key={choice.id || idx}
                      className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                        isCorrect
                          ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/30"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[11px]">
                            {idx + 1}
                          </span>
                          <span>الخيار {idx + 1}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCorrectChoice(idx)}
                            className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full transition-all cursor-pointer ${
                              isCorrect
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isCorrect ? "الإجابة الصحيحة ✓" : "تحديد كإجابة صحيحة"}
                          </button>

                          {choices.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChoice(idx)}
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              title="حذف هذا الخيار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <Input
                        placeholder={`أدخل نص الخيار ${idx + 1}...`}
                        value={choice.text}
                        onChange={(e) => updateChoiceText(idx, e.target.value)}
                        className={`text-sm ${isCorrect ? "border-emerald-400 bg-white font-bold text-emerald-950" : "bg-white"}`}
                      />

                      {/* Choice Image Uploader */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`choice-img-${idx}`}
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleChoiceImageUpload(idx, e.target.files[0]);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`choice-img-${idx}`)?.click()}
                          disabled={isChoiceUploading}
                          className="text-xs h-8 gap-1.5 border-dashed"
                        >
                          {isChoiceUploading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ImageIcon className="w-3 h-3" />
                          )}
                          {choice.image_url ? "تغيير صورة الخيار" : "إرفاق صورة للخيار (اختياري)"}
                        </Button>

                        {choice.image_url && (
                          <div className="relative w-8 h-8 shrink-0 border rounded-lg overflow-hidden bg-slate-50">
                            <img
                              src={choice.image_url}
                              alt={`Choice ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeChoiceImage(idx)}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                              title="حذف صورة الخيار"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 sm:justify-start">
              <Button
                type="submit"
                disabled={isSubmittingQuestion}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 rounded-xl"
              >
                {isSubmittingQuestion ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : editingQuestion ? (
                  "حفظ التعديلات"
                ) : (
                  "إضافة السؤال للقسم"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestionModalOpen(false)}
                className="h-11 rounded-xl font-bold"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
