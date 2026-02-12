import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Layers,
  Pencil,
  MoveRight,
  Save
} from "lucide-react";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { CSVImport } from "@/components/admin/CSVImport";

interface Question {
  id: string;
  text: string;
  active: boolean;
  created_at: string;
  image_url?: string;
  stage_number?: number;
}

interface StageTitle {
  stage_number: number;
  title: string;
  is_active?: boolean;
  display_order?: number;
}

interface Choice {
  id: string;
  text: string;
  is_correct: boolean;
  image_url?: string;
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCSVOpen, setIsCSVOpen] = useState(false);

  // Sorting State
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Stage Management State
  const [activeStage, setActiveStage] = useState<number | null>(null); // null = all stages
  const [stageTitles, setStageTitles] = useState<StageTitle[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<number, number>>({});
  const [editingStageTitle, setEditingStageTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [moveToStage, setMoveToStage] = useState<string>("");

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewChoices, setPreviewChoices] = useState<Choice[]>([]);
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);

  const handlePreview = async (question: Question) => {
    setPreviewQuestion(question);
    setIsPreviewOpen(true);
    setIsLoadingChoices(true);
    try {
      const { data } = await supabase
        .from("choices")
        .select("*")
        .eq("question_id", question.id)
        .order("created_at");
      setPreviewChoices(data || []);
    } catch (e) {
      console.error(e);
      toast.error("فشل تحميل الاختيارات");
    } finally {
      setIsLoadingChoices(false);
    }
  };

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("questions")
        .select("*, image_url", { count: "exact" })
        .order("stage_number", { ascending: true })
        .order("created_at", { ascending: sortOrder === "oldest" })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (searchQuery) {
        query = query.ilike("text", `%${searchQuery}%`);
      }

      if (filterStatus === "active") {
        query = query.eq("active", true);
      } else if (filterStatus === "inactive") {
        query = query.eq("active", false);
      }

      // Filter by stage
      if (activeStage !== null) {
        query = query.eq("stage_number", activeStage);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setQuestions(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching questions:", err);
      toast.error("حدث خطأ أثناء تحميل الأسئلة");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filterStatus, sortOrder, activeStage]);

  // Fetch stage titles and counts
  const fetchStageMeta = useCallback(async () => {
    try {
      // Fetch titles
      const { data: titles } = await supabase
        .from("stage_titles")
        .select("*")
        .order("stage_number");
      setStageTitles(titles || []);

      // Fetch stage counts
      const { data: allQ } = await supabase
        .from("questions")
        .select("stage_number");

      if (allQ) {
        const counts: Record<number, number> = {};
        allQ.forEach(q => {
          const sn = q.stage_number || 1;
          counts[sn] = (counts[sn] || 0) + 1;
        });
        setStageCounts(counts);
      }
    } catch (err) {
      console.error("Error fetching stage meta:", err);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetchStageMeta();
  }, [fetchStageMeta]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus, pageSize, sortOrder, activeStage]);

  // Get stage numbers from stage_titles (manual), merged with any in questions
  const stageNumbers = Array.from(new Set([
    ...stageTitles.map(st => st.stage_number),
    ...Object.keys(stageCounts).map(Number)
  ])).sort((a, b) => a - b);
  const getStageTitle = (sn: number) => {
    const found = stageTitles.find(st => st.stage_number === sn);
    return found?.title || `المرحلة ${sn}`;
  };

  const handleSaveStageTitle = async (stageNum: number) => {
    try {
      const { error } = await supabase
        .from("stage_titles")
        .upsert({ stage_number: stageNum, title: editTitleValue }, { onConflict: "stage_number" });

      if (error) throw error;
      toast.success("تم حفظ عنوان المرحلة");
      setEditingStageTitle(null);
      fetchStageMeta();
    } catch (err) {
      console.error("Error saving stage title:", err);
      toast.error("حدث خطأ أثناء حفظ العنوان");
    }
  };

  const handleBulkMoveToStage = async () => {
    if (selectedIds.size === 0 || !moveToStage) return;
    try {
      const { error } = await supabase
        .from("questions")
        .update({ stage_number: parseInt(moveToStage) })
        .in("id", Array.from(selectedIds));
      if (error) throw error;
      toast.success(`تم نقل ${selectedIds.size} سؤال إلى المرحلة ${moveToStage}`);
      setSelectedIds(new Set());
      setMoveToStage("");
      fetchQuestions();
      fetchStageMeta();
    } catch (err) {
      console.error("Error moving questions:", err);
      toast.error("حدث خطأ أثناء نقل الأسئلة");
    }
  };

  const handleToggleStageActive = async (stageNum: number, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("stage_titles")
        .upsert({
          stage_number: stageNum,
          title: getStageTitle(stageNum),
          is_active: !currentActive,
          display_order: stageTitles.find(s => s.stage_number === stageNum)?.display_order || stageNum,
        }, { onConflict: "stage_number" });
      if (error) throw error;
      toast.success(!currentActive ? `✅ المرحلة ${stageNum} مفعّلة للطلاب` : `⛔ المرحلة ${stageNum} مخفية عن الطلاب`);
      fetchStageMeta();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ");
    }
  };

  const handleUpdateDisplayOrder = async (stageNum: number, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("stage_titles")
        .upsert({
          stage_number: stageNum,
          title: getStageTitle(stageNum),
          is_active: isStageActive(stageNum),
          display_order: newOrder,
        }, { onConflict: "stage_number" });
      if (error) throw error;

      // Check for duplicate after saving
      const updatedTitles = stageTitles.map(st =>
        st.stage_number === stageNum ? { ...st, display_order: newOrder } : st
      );
      const duplicate = updatedTitles.find(st => st.display_order === newOrder && st.stage_number !== stageNum);
      if (duplicate) {
        toast.error(
          `⚠️ تنبيه: المرحلة ${duplicate.stage_number} (${getStageTitle(duplicate.stage_number)}) لها نفس الترتيب (${newOrder}) — عدّل أحدهما!`,
          { id: 'duplicate-order', duration: Infinity, style: { background: '#FEF2F2', border: '2px solid #F87171', color: '#991B1B', fontWeight: 'bold', fontSize: '14px' } }
        );
      } else {
        toast.dismiss('duplicate-order');
        toast.success(`تم تحديث ترتيب المرحلة ${stageNum}`);
      }
      fetchStageMeta();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ في تحديث الترتيب");
    }
  };

  const handleAddStage = async () => {
    const nextStageNum = stageNumbers.length > 0 ? Math.max(...stageNumbers) + 1 : 1;
    try {
      const { error } = await supabase
        .from("stage_titles")
        .insert({
          stage_number: nextStageNum,
          title: `المرحلة ${nextStageNum}`,
          is_active: true,
          display_order: nextStageNum,
        });
      if (error) throw error;
      toast.success(`✅ تمت إضافة المرحلة ${nextStageNum}`);
      fetchStageMeta();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ في إضافة المرحلة");
    }
  };

  const isStageActive = (sn: number) => {
    const found = stageTitles.find(st => st.stage_number === sn);
    return found?.is_active !== false; // default true
  };

  const getDisplayOrder = (sn: number) => {
    const found = stageTitles.find(st => st.stage_number === sn);
    return found?.display_order || sn;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(questions.map(q => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.size === 0) return;

    try {
      if (action === "delete") {
        const { error } = await supabase
          .from("questions")
          .delete()
          .in("id", Array.from(selectedIds));
        if (error) throw error;
        toast.success(`تم حذف ${selectedIds.size} سؤال`);
      } else {
        const { error } = await supabase
          .from("questions")
          .update({ active: action === "activate" })
          .in("id", Array.from(selectedIds));
        if (error) throw error;
        toast.success(`تم ${action === "activate" ? "تفعيل" : "تعطيل"} ${selectedIds.size} سؤال`);
      }

      setSelectedIds(new Set());
      fetchQuestions();
      fetchStageMeta();
    } catch (err) {
      console.error("Error performing bulk action:", err);
      toast.error("حدث خطأ أثناء تنفيذ العملية");
    }
  };

  const handleSelectAllData = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("questions").select("id");

      if (searchQuery) {
        query = query.ilike("text", `%${searchQuery}%`);
      }

      if (filterStatus === "active") {
        query = query.eq("active", true);
      } else if (filterStatus === "inactive") {
        query = query.eq("active", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setSelectedIds(new Set(data.map(q => q.id)));
        toast.success(`تم تحديد جميع الأسئلة (${data.length} سؤال)`);
      }
    } catch (err) {
      console.error("Error selecting all:", err);
      toast.error("حدث خطأ أثناء تحديد الكل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingQuestion(null);
    fetchQuestions();
    fetchStageMeta();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">بنك الأسئلة</h1>
          <p className="text-muted-foreground mt-1">
            إجمالي: {totalCount} سؤال {activeStage !== null && `• المرحلة ${activeStage}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCSVOpen} onOpenChange={setIsCSVOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                استيراد CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>استيراد أسئلة من ملف CSV</DialogTitle>
              </DialogHeader>
              <CSVImport onComplete={() => { setIsCSVOpen(false); fetchQuestions(); }} />
            </DialogContent>
          </Dialog>

          <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormClose(); else setIsFormOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 btn-primary-gradient">
                <Plus className="w-4 h-4" />
                إضافة سؤال
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال جديد"}</DialogTitle>
              </DialogHeader>
              <QuestionForm question={editingQuestion} onComplete={handleFormClose} defaultStage={activeStage || 1} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stage Tabs */}
      <Card className="card-elevated border-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">المراحل</span>
            <span className="text-xs text-slate-400 mr-auto font-bold">اضغط على العين لإظهار/إخفاء المرحلة للطلاب</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveStage(null)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeStage === null
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
            >
              الكل ({Object.values(stageCounts).reduce((a, b) => a + b, 0)})
            </button>
            {stageNumbers.map(sn => {
              const active = isStageActive(sn);
              return (
                <div key={sn} className="flex items-stretch gap-0">
                  <button
                    onClick={() => setActiveStage(sn)}
                    className={`px-3 py-2 rounded-r-xl text-sm font-bold transition-all ${!active ? 'opacity-40 line-through ' : ''
                      }${activeStage === sn
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                  >
                    م{sn} ({stageCounts[sn] || 0})
                  </button>
                  <button
                    onClick={() => handleToggleStageActive(sn, active)}
                    className={`px-1.5 rounded-l-xl text-xs transition-all flex items-center ${active
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-red-100 text-red-400 hover:bg-red-200'
                      }`}
                    title={active ? "مفعّلة - اضغط للإخفاء" : "مخفية - اضغط للتفعيل"}
                  >
                    {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
            {/* Add Stage Button */}
            <button
              onClick={handleAddStage}
              className="px-3 py-2 rounded-xl text-sm font-bold transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-2 border-dashed border-emerald-300 hover:border-emerald-400"
              title="إضافة مرحلة جديدة"
            >
              + مرحلة
            </button>
          </div>

          {/* Stage Settings when selected */}
          {activeStage !== null && (
            <div className="mt-4 pt-3 border-t space-y-3">
              {/* Title Editor */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">عنوان المرحلة:</span>
                {editingStageTitle === activeStage ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      placeholder="عنوان المرحلة..."
                      className="h-9 flex-1"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStageTitle(activeStage); }}
                    />
                    <Button size="sm" onClick={() => handleSaveStageTitle(activeStage)} className="h-9 gap-1">
                      <Save className="w-3 h-3" />
                      حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingStageTitle(null)} className="h-9">
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{getStageTitle(activeStage)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditingStageTitle(activeStage);
                        setEditTitleValue(getStageTitle(activeStage));
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {/* Display Order */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">ترتيب الظهور:</span>
                <Input
                  type="number"
                  min={1}
                  value={getDisplayOrder(activeStage)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > 0) handleUpdateDisplayOrder(activeStage, val);
                  }}
                  className="h-9 w-20 text-center"
                />
                <span className="text-xs text-slate-400">الرقم الأصغر يظهر أولاً للطالب</span>
              </div>
              {/* Active Status */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">حالة المرحلة:</span>
                <Badge variant={isStageActive(activeStage) ? "default" : "secondary"}>
                  {isStageActive(activeStage) ? "✅ مفعّلة للطلاب" : "⛔ مخفية عن الطلاب"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الأسئلة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={sortOrder} onValueChange={(v: "newest" | "oldest") => setSortOrder(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث (افتراضي)</SelectItem>
                <SelectItem value="oldest">ترتيب الاختبار (المراحل)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / صفحة</SelectItem>
                <SelectItem value="50">50 / صفحة</SelectItem>
                <SelectItem value="100">100 / صفحة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="card-elevated bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">
                تم تحديد {selectedIds.size} سؤال
              </span>
              <div className="flex gap-2 flex-wrap">
                {selectedIds.size < totalCount && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectAllData}
                    className="gap-1"
                  >
                    <CheckSquare className="w-4 h-4" />
                    تحديد الكل ({totalCount})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("activate")}
                  className="gap-1"
                >
                  <ToggleRight className="w-4 h-4" />
                  تفعيل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("deactivate")}
                  className="gap-1"
                >
                  <ToggleLeft className="w-4 h-4" />
                  تعطيل
                </Button>

                {/* Move to Stage */}
                <div className="flex items-center gap-1">
                  <Select value={moveToStage} onValueChange={setMoveToStage}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="نقل إلى مرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {stageNumbers.map(num => (
                        <SelectItem key={num} value={num.toString()}>مرحلة {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {moveToStage && (
                    <Button
                      size="sm"
                      onClick={handleBulkMoveToStage}
                      className="gap-1 h-8"
                    >
                      <MoveRight className="w-4 h-4" />
                      نقل
                    </Button>
                  )}
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  className="gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد أسئلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === questions.length && questions.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>السؤال</TableHead>
                    <TableHead className="w-24">المرحلة</TableHead>
                    <TableHead className="w-24">الحالة</TableHead>
                    <TableHead className="w-32">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => {
                    return (
                      <TableRow key={question.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(question.id)}
                            onCheckedChange={(checked) => handleSelectOne(question.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2">{question.text}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            م{question.stage_number || 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={question.active ? "default" : "secondary"}>
                            {question.active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(question)}
                              title="معاينة"
                            >
                              <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(question)}
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                toast("🗑️ حذف السؤال؟", {
                                  description: question.text.substring(0, 60) + (question.text.length > 60 ? "..." : ""),
                                  action: {
                                    label: "تأكيد الحذف",
                                    onClick: async () => {
                                      try {
                                        // Delete choices first (FK constraint)
                                        await supabase
                                          .from("choices")
                                          .delete()
                                          .eq("question_id", question.id);

                                        const { error } = await supabase
                                          .from("questions")
                                          .delete()
                                          .eq("id", question.id);
                                        if (error) throw error;
                                        toast.success("✅ تم حذف السؤال بنجاح");
                                        fetchQuestions();
                                        fetchStageMeta();
                                      } catch (err) {
                                        console.error(err);
                                        toast.error("❌ حدث خطأ أثناء الحذف");
                                      }
                                    },
                                  },
                                  cancel: {
                                    label: "إلغاء",
                                    onClick: () => { },
                                  },
                                  duration: 5000,
                                });
                              }}
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <CardHeader className="border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                صفحة {currentPage + 1} من {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة السؤال</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-6 p-4">
              {/* Question Content */}
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-xl font-bold">{previewQuestion.text}</h2>
                {previewQuestion.image_url && (
                  <img
                    src={previewQuestion.image_url}
                    alt="Question"
                    className="max-h-60 rounded-lg border shadow-sm"
                  />
                )}
              </div>

              <div className="border-t my-4" />

              {/* Choices Content */}
              {isLoadingChoices ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewChoices.map((choice, idx) => (
                    <div
                      key={idx}
                      className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
                                        ${choice.is_correct
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 bg-slate-50'
                        }`}
                    >
                      {choice.is_correct && (
                        <div className="absolute top-2 right-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      )}

                      <span className="font-semibold text-lg">{choice.text}</span>

                      {choice.image_url && (
                        <img
                          src={choice.image_url}
                          className="h-32 object-contain rounded bg-white border p-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
