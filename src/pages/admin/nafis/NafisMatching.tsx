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
import { Trash2, Plus, Loader2, Image as ImageIcon, Puzzle, Search, Tag } from "lucide-react";
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
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

interface MatchingQuestion {
  id: string;
  left_text: string;
  right_text: string;
  left_image_url?: string | null;
  right_image_url?: string | null;
  is_active: boolean;
  level: number;
  domain_id?: string | null;
  grade_subject_id?: string | null;
}

export default function NafisMatching() {
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

  const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [newQuestion, setNewQuestion] = useState({
    left_text: "",
    right_text: "",
    level: 1,
  });
  const [selectedRightImage, setSelectedRightImage] = useState<File | null>(null);
  const [rightImagePreview, setRightImagePreview] = useState<string>("");
  const [selectedLeftImage, setSelectedLeftImage] = useState<File | null>(null);
  const [leftImagePreview, setLeftImagePreview] = useState<string>("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("matching_game_questions")
        .select("*")
        .or("track_type.eq.nafis,track_type.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions((data as MatchingQuestion[]) || []);
    } catch (err: any) {
      console.error("Error fetching matching questions:", err);
      toast.error("فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newQuestion.left_text && !selectedLeftImage) || (!newQuestion.right_text && !selectedRightImage)) {
      toast.error("يجب إدخال السؤال والجواب (نص أو صورة)");
      return;
    }

    setIsSubmitting(true);
    try {
      let rightImageUrl = "";
      let leftImageUrl = "";

      if (selectedRightImage) {
        const fileExt = selectedRightImage.name.split(".").pop();
        const fileName = `matching-right-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("game-images").upload(fileName, selectedRightImage);
        if (!uploadError) {
          const { data } = supabase.storage.from("game-images").getPublicUrl(fileName);
          rightImageUrl = data.publicUrl;
        }
      }

      if (selectedLeftImage) {
        const fileExt = selectedLeftImage.name.split(".").pop();
        const fileName = `matching-left-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("game-images").upload(fileName, selectedLeftImage);
        if (!uploadError) {
          const { data } = supabase.storage.from("game-images").getPublicUrl(fileName);
          leftImageUrl = data.publicUrl;
        }
      }

      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

      const leftText = newQuestion.left_text || "";
      const rightText = newQuestion.right_text || "";

      const { error } = await supabase.from("matching_game_questions").insert({
        left_text: leftText,
        right_text: rightText,
        right_image_url: rightImageUrl || null,
        left_image_url: leftImageUrl || null,
        level: newQuestion.level,
        is_active: true,
        track_type: "nafis",
        stage: "default",
        grade_subject_id: defaultGradeSubjectId,
        domain_id: selectedDomainId && selectedDomainId !== "none" ? selectedDomainId : null,
        items: [
          {
            left_text: leftText,
            right_text: rightText,
            left_image_url: leftImageUrl || null,
            right_image_url: rightImageUrl || null,
          },
        ],
      });

      if (error) throw error;

      toast.success("تمت إضافة سؤال المطابقة بنجاح");
      setNewQuestion({ left_text: "", right_text: "", level: 1 });
      setSelectedRightImage(null);
      setRightImagePreview("");
      setSelectedLeftImage(null);
      setLeftImagePreview("");
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "فشل إضافة السؤال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDomain = async (questionId: string, domainId: string) => {
    try {
      const targetDomain = domainId === "none" ? null : domainId;
      const { error } = await supabase
        .from("matching_game_questions")
        .update({ domain_id: targetDomain })
        .eq("id", questionId);

      if (error) throw error;
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, domain_id: targetDomain } : q))
      );
      toast.success("تم تحديث مجال السؤال");
    } catch (err: any) {
      toast.error("فشل تحديث المجال");
    }
  };

  const handleImageSelect = (side: "left" | "right", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === "left") {
          setSelectedLeftImage(file);
          setLeftImagePreview(reader.result as string);
        } else {
          setSelectedRightImage(file);
          setRightImagePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (side: "left" | "right") => {
    if (side === "left") {
      setSelectedLeftImage(null);
      setLeftImagePreview("");
    } else {
      setSelectedRightImage(null);
      setRightImagePreview("");
    }
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from("matching_game_questions").delete().eq("id", itemToDelete);
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
        .from("matching_game_questions")
        .update({ is_active: !currentState })
        .eq("id", id);
      if (error) throw error;
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_active: !currentState } : q))
      );
      toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
    } catch (err) {
      toast.error("فشل التحديث");
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterDomain === "unassigned") {
        if (q.domain_id) return false;
      } else if (filterDomain !== "all") {
        if (q.domain_id !== filterDomain) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.left_text?.toLowerCase().includes(query) ||
          q.right_text?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, filterDomain, searchQuery]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Puzzle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">لعبة المطابقة - براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة لعبة المطابقة وتصنيفها حسب المجال العلمي</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-rose-600">{questions.length}</div>
            <div className="text-sm text-slate-600 font-bold">إجمالي أسئلة المطابقة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {questions.filter((q) => q.is_active).length}
            </div>
            <div className="text-sm text-slate-600 font-bold">الأسئلة النشطة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">
              {questions.filter((q) => q.domain_id).length}
            </div>
            <div className="text-sm text-slate-600 font-bold">أسئلة مصنفة حسب المجال</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-rose-500" /> إضافة زوج مطابقة جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-5">
            {/* Domain Selection Field */}
            <div className="space-y-2 bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-rose-600" />
                <span>المجال العلمي التخصصي</span>
                <span className="text-xs text-rose-700 font-medium">(يربط السؤال بمجال الطالب)</span>
              </Label>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="w-full bg-white border-rose-200 font-bold">
                  <SelectValue placeholder="-- اختر المجال العلمي لهذا السؤال --" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون مجال محدد (عام)</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                <Label className="text-sm font-bold text-slate-700">الجانب الأيسر (المفهوم / السؤال)</Label>
                <Input
                  placeholder="نص المفهوم..."
                  value={newQuestion.left_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, left_text: e.target.value })}
                  className="bg-white font-medium"
                />
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="left-image"
                    onChange={(e) => handleImageSelect("left", e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("left-image")?.click()}
                    className="gap-2 text-xs"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {leftImagePreview ? "تغيير الصورة" : "إضافة صورة (اختياري)"}
                  </Button>
                  {leftImagePreview && (
                    <div className="flex items-center gap-2">
                      <img src={leftImagePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border shadow-xs" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => clearImage("left")} className="h-8 w-8 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side */}
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                <Label className="text-sm font-bold text-slate-700">الجانب الأيمن (التعريف / الإجابة المناظرة)</Label>
                <Input
                  placeholder="نص التعريف أو الإجابة..."
                  value={newQuestion.right_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, right_text: e.target.value })}
                  className="bg-white font-medium"
                />
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="right-image"
                    onChange={(e) => handleImageSelect("right", e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("right-image")?.click()}
                    className="gap-2 text-xs"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {rightImagePreview ? "تغيير الصورة" : "إضافة صورة (اختياري)"}
                  </Button>
                  {rightImagePreview && (
                    <div className="flex items-center gap-2">
                      <img src={rightImagePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border shadow-xs" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => clearImage("right")} className="h-8 w-8 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold h-11 px-6 shadow-md shadow-rose-500/20 gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة زوج المطابقة الآن
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="card-elevated">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-slate-800">
                قائمة أزواج المطابقة ({filteredQuestions.length} من {questions.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">تصفية وتصنيف أسئلة المطابقة حسب المجال العلمي</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Domain Filter Dropdown */}
              <div className="w-48">
                <Select value={filterDomain} onValueChange={setFilterDomain}>
                  <SelectTrigger className="w-full bg-white font-bold text-xs h-10 border-slate-200">
                    <SelectValue placeholder="فلترة حسب المجال" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع المجالات ({questions.length})</SelectItem>
                    {domains.map((d) => {
                      const count = questions.filter((q) => q.domain_id === d.id).length;
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({count})
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="unassigned">
                      غير مصنف ({questions.filter((q) => !q.domain_id).length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="relative w-56">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث في المفاهيم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-16">
              <Puzzle className="w-16 h-16 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">لا توجد أسئلة تطابق الفلتر الحالي</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold">الجانب الأيسر (المفهوم)</TableHead>
                    <TableHead className="font-bold">الجانب الأيمن (التعريف / المطابق)</TableHead>
                    <TableHead className="w-48 font-bold">المجال العلمي</TableHead>
                    <TableHead className="w-24 text-center font-bold">الحالة</TableHead>
                    <TableHead className="w-20 text-center font-bold">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question, idx) => (
                    <TableRow key={question.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-center font-bold text-xs text-slate-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {question.left_image_url && (
                            <img src={question.left_image_url} alt="" className="w-9 h-9 object-cover rounded-lg border shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 text-sm">{question.left_text || "(صورة)"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {question.right_image_url && (
                            <img src={question.right_image_url} alt="" className="w-9 h-9 object-cover rounded-lg border shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 text-sm">{question.right_text || "(صورة)"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={question.domain_id || "none"}
                          onValueChange={(val) => handleUpdateDomain(question.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold bg-white border-slate-200 shadow-xs">
                            <SelectValue placeholder="اختر المجال" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="none">⚠️ غير مصنف</SelectItem>
                            {domains.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={question.is_active ? "default" : "secondary"}
                          className="cursor-pointer select-none"
                          onClick={() => toggleActive(question.id, question.is_active)}
                        >
                          {question.is_active ? "نشط" : "مخفي"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(question.id)} className="hover:bg-red-50 hover:text-red-600">
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا السؤال نهائياً؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 font-bold">
              حذف السؤال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
