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
  CheckSquare
} from "lucide-react";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { CSVImport } from "@/components/admin/CSVImport";

interface Question {
  id: string;
  text: string;
  active: boolean;
  created_at: string;
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

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("questions")
        .select("*, image_url", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (searchQuery) {
        query = query.ilike("text", `%${searchQuery}%`);
      }

      if (filterStatus === "active") {
        query = query.eq("active", true);
      } else if (filterStatus === "inactive") {
        query = query.eq("active", false);
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
  }, [currentPage, pageSize, searchQuery, filterStatus]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus, pageSize]);

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
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الأسئلة</h1>
          <p className="text-muted-foreground mt-1">
            إجمالي: {totalCount} سؤال
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
              <QuestionForm question={editingQuestion} onComplete={handleFormClose} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
              <div className="flex gap-2">
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
                        <Badge variant={question.active ? "default" : "secondary"}>
                          {question.active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(question)}
                          >
                            <Edit className="w-4 h-4" />
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
    </div>
  );
}
