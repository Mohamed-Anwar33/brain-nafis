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
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  MoveRight,
  Save,
  BookOpen
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

export default function NafisQuestions() {
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

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [stageTitles, setStageTitles] = useState<StageTitle[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<number, number>>({});
  const [editingStageTitle, setEditingStageTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [moveToStage, setMoveToStage] = useState<string>("");

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
      setPreviewChoices((data as Choice[]) || []);
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
        .or('track_type.eq.nafis,track_type.is.null') // Filter for Nafis only
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

      if (activeStage !== null) {
        query = query.eq("stage_number", activeStage);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setQuestions((data as Question[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching questions:", err);
      toast.error("حدث خطأ أثناء تحميل الأسئلة");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filterStatus, sortOrder, activeStage]);

  const fetchStageMeta = useCallback(async () => {
    try {
      const { data: titles } = await supabase
        .from("stage_titles")
        .select("*")
        .order("stage_number");
      setStageTitles((titles as StageTitle[]) || []);

      const { data: allQ } = await supabase
        .from("questions")
        .select("stage_number")
        .or('track_type.eq.nafis,track_type.is.null'); // Filter for Nafis only

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

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus, pageSize, sortOrder, activeStage]);

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

  const isStageActive = (sn: number) => {
    const found = stageTitles.find(st => st.stage_number === sn);
    return found?.is_active !== false;
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">بنك أسئلة براين ساينس</h1>
          <p className="text-slate-500">إدارة أسئلة النظام العام</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{totalCount}</div>
            <div className="text-sm text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {questions.filter(q => q.active).length}
            </div>
            <div className="text-sm text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">
              {questions.filter(q => !q.active).length}
            </div>
            <div className="text-sm text-slate-600">الأسئلة غير النشطة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stageNumbers.length}</div>
            <div className="text-sm text-slate-600">عدد المراحل</div>
          </CardContent>
        </Card>
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
          </div>
        </CardContent>
      </Card>

      {/* Filters & Add */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الأسئلة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={sortOrder} onValueChange={(v: "newest" | "oldest") => setSortOrder(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="oldest">الأقدم</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCSVOpen} onOpenChange={setIsCSVOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
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

              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد أسئلة في نظام نافس</p>
              <p className="text-sm text-slate-400 mt-2">أضف أسئلة جديدة لبدء استخدام النظام</p>
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
                  {questions.map((question) => (
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
                                      await supabase.from("choices").delete().eq("question_id", question.id);
                                      const { error } = await supabase.from("questions").delete().eq("id", question.id);
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
                                cancel: { label: "إلغاء", onClick: () => {} },
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronRight className="w-4 h-4" />
          السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {currentPage + 1} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>معاينة السؤال</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-medium">{previewQuestion.text}</p>
              </div>
              {isLoadingChoices ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {previewChoices.map((choice, idx) => (
                    <div
                      key={choice.id}
                      className={`p-3 rounded-lg border ${
                        choice.is_correct
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className={choice.is_correct ? 'text-green-700 font-medium' : 'text-slate-700'}>
                        {idx + 1}. {choice.text}
                        {choice.is_correct && ' ✓'}
                      </span>
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
