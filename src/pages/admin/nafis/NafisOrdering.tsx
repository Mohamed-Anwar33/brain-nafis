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
import { Trash2, Plus, Loader2, Puzzle, Search, Tag } from "lucide-react";
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

interface OrderingQuestion {
  id: string;
  title: string;
  items: string[];
  is_active: boolean;
  domain_id?: string | null;
  grade_subject_id?: string | null;
}

export default function NafisOrdering() {
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

  const [questions, setQuestions] = useState<OrderingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [newQuestion, setNewQuestion] = useState({
    title: "",
    item1: "",
    item2: "",
    item3: "",
    item4: "",
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
        .or("track_type.eq.nafis,track_type.is.null")
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
    const items = [
      newQuestion.item1,
      newQuestion.item2,
      newQuestion.item3,
      newQuestion.item4,
    ].filter((s) => s && s.trim());

    if (items.length < 2) {
      toast.error("يجب إدخال عنصرين على الأقل للترتيب");
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

      const { error } = await supabase.from("ordering_game_questions").insert({
        title: newQuestion.title || "ترتيب الخطوات والعمليات",
        items: items,
        correct_order: items,
        is_active: true,
        track_type: "nafis",
        stage: "default",
        grade_subject_id: defaultGradeSubjectId,
        domain_id: selectedDomainId && selectedDomainId !== "none" ? selectedDomainId : null,
      });

      if (error) throw error;
      toast.success("تمت إضافة سؤال الترتيب بنجاح");
      setNewQuestion({ title: "", item1: "", item2: "", item3: "", item4: "" });
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "فشل إضافة السؤال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDomain = async (questionId: string, domainId: string) => {
    try {
      const targetDomain = domainId === "none" ? null : domainId;
      const { error } = await supabase
        .from("ordering_game_questions")
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
          q.title?.toLowerCase().includes(query) ||
          q.items?.some((it) => it.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [questions, filterDomain, searchQuery]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Puzzle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">لغز الترتيب - براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة الترتيب وتصنيفها حسب المجال العلمي</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-600">{questions.length}</div>
            <div className="text-sm text-slate-600 font-bold">إجمالي أسئلة الترتيب</div>
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
            <Plus className="w-5 h-5 text-cyan-500" /> إضافة سؤال ترتيب جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-5">
            {/* Domain Selection */}
            <div className="space-y-2 bg-cyan-50/60 p-4 rounded-2xl border border-cyan-200/80">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-cyan-600" />
                <span>المجال العلمي التخصصي</span>
                <span className="text-xs text-cyan-700 font-medium">(يربط السؤال بمجال الطالب)</span>
              </Label>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="w-full bg-white border-cyan-200 font-bold">
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

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">عنوان اللغز أو السؤال</Label>
              <Input
                placeholder="مثال: رتبي مراحل التحول الكامل في دورة حياة الفراشة..."
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                className="font-medium"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700">
                العناصر بالترتيب الصحيح (من اليمين لليسار / من البداية للنهاية)
              </Label>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((num) => {
                  const key = `item${num}` as keyof typeof newQuestion;
                  return (
                    <div key={num} className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-cyan-700">الخطوة {num}</span>
                      <Input
                        placeholder={`العنصر رقم ${num}`}
                        value={newQuestion[key]}
                        onChange={(e) => setNewQuestion({ ...newQuestion, [key]: e.target.value })}
                        className="bg-white font-medium text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold h-11 px-6 shadow-md shadow-cyan-500/20 gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة سؤال الترتيب الآن
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
                قائمة أسئلة الترتيب ({filteredQuestions.length} من {questions.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">تصفية وتصنيف أسئلة الترتيب حسب المجال العلمي</p>
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
                  placeholder="بحث في أسئلة الترتيب..."
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
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
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
                    <TableHead className="font-bold">العنوان / السؤال</TableHead>
                    <TableHead className="font-bold">العناصر بالترتيب</TableHead>
                    <TableHead className="w-48 font-bold">المجال العلمي</TableHead>
                    <TableHead className="w-24 text-center font-bold">الحالة</TableHead>
                    <TableHead className="w-20 text-center font-bold">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((q, idx) => (
                    <TableRow key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-center font-bold text-xs text-slate-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="max-w-xs font-bold text-slate-800 text-sm">
                        {q.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(q.items || []).map((item, i) => (
                            <Badge key={i} variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 text-xs font-bold">
                              {i + 1}. {item}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={q.domain_id || "none"}
                          onValueChange={(val) => handleUpdateDomain(q.id, val)}
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
                          variant={q.is_active ? "default" : "secondary"}
                          className="cursor-pointer select-none"
                          onClick={() => toggleActive(q.id, q.is_active)}
                        >
                          {q.is_active ? "نشط" : "مخفي"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(q.id)} className="hover:bg-red-50 hover:text-red-600">
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
