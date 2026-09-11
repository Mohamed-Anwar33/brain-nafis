import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { Plus, Edit, Trash2, Loader2, Target, AlertTriangle, Filter, Compass } from "lucide-react";
import { getCentralExamQuestions, deleteCentralExamQuestion, CentralExamQuestion } from "@/services/centralExamService";
import { CentralExamQuestionForm } from "@/components/admin/central-exam/CentralExamQuestionForm";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";
import { syncDefaultCentralDomains } from "@/services/academicCatalogService";

export default function AdminCentralExamQuestions() {
  const { data: catalog } = useAcademicCatalog();
  const [questions, setQuestions] = useState<CentralExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CentralExamQuestion | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; text: string } | null>(null);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>("all");

  const availableDomains = useMemo(() => catalog?.domains || [], [catalog?.domains]);

  const domainMap = useMemo(() => {
    const map = new Map<string, { name: string; badgeClass: string; icon: string }>();
    availableDomains.forEach((d) => {
      const name = d.name;
      let badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
      let icon = "🎯";
      if (name.includes("طبيعة") || name.includes("طبيعه")) {
        badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
        icon = "🧭";
      } else if (name.includes("أحياء") || name.includes("احياء")) {
        badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        icon = "🧬";
      } else if (name.includes("أرض") || name.includes("فضاء") || name.includes("ارض")) {
        badgeClass = "bg-cyan-50 text-cyan-700 border-cyan-200";
        icon = "🌍";
      } else if (name.includes("كيمياء")) {
        badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
        icon = "🧪";
      } else if (name.includes("فيزياء")) {
        badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
        icon = "⚛️";
      } else if (name.includes("كهرباء")) {
        badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        icon = "⚡";
      }
      map.set(d.id, { name, badgeClass, icon });
    });
    return map;
  }, [availableDomains]);

  const filteredQuestions = useMemo(() => {
    if (selectedDomainFilter === "all") return questions;
    return questions.filter((q) => q.domain_id === selectedDomainFilter);
  }, [questions, selectedDomainFilter]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await getCentralExamQuestions();
      setQuestions(data || []);
    } catch (e) {
      toast.error("حدث خطأ أثناء جلب الأسئلة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDefaultCentralDomains().finally(() => {
      fetchQuestions();
    });
  }, []);

  const handleEdit = (q: CentralExamQuestion) => {
    setEditingQuestion(q);
    setIsFormOpen(true);
  };

  const confirmDelete = (id: string, text: string) => {
    setItemToDelete({ id, text });
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteCentralExamQuestion(itemToDelete.id);
      toast.success("تم حذف السؤال بنجاح");
      fetchQuestions();
    } catch (e) {
      toast.error("فشل حذف السؤال");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingQuestion(null);
    fetchQuestions();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">إدارة أسئلة الاختبار المركزي</h2>
            <p className="text-sm text-muted-foreground mt-1">تختلف هذه الأسئلة كلياً عن أسئلة المنصة العادية، حيث يعتمد عليها الاختبار المركزي فقط.</p>
          </div>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormClose(); else setIsFormOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-primary-gradient px-6 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              إضافة سؤال جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "تعديل السؤال" : "إضافة سؤال مركزي جديد"}</DialogTitle>
            </DialogHeader>
            <CentralExamQuestionForm
              key={editingQuestion?.id || `new-${selectedDomainFilter}`}
              question={editingQuestion}
              onComplete={handleFormClose}
              defaultDomainId={selectedDomainFilter}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Domain Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-slate-800 font-black text-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <span>تصفية الأسئلة حسب المجال العلمي:</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            type="button"
            size="sm"
            variant={selectedDomainFilter === "all" ? "default" : "outline"}
            onClick={() => setSelectedDomainFilter("all")}
            className="rounded-xl text-xs font-black gap-1.5 h-9"
          >
            <span>جميع المجالات</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {questions.length}
            </Badge>
          </Button>

          {availableDomains.map((d) => {
            const info = domainMap.get(d.id);
            const count = questions.filter((q) => q.domain_id === d.id).length;
            const isSelected = selectedDomainFilter === d.id;
            return (
              <Button
                key={d.id}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setSelectedDomainFilter(d.id)}
                className={`rounded-xl text-xs font-black gap-1.5 h-9 transition-all ${
                  isSelected ? "" : "hover:border-indigo-300 text-slate-700 bg-slate-50/50"
                }`}
              >
                <span>{info?.icon || "🎯"}</span>
                <span>{d.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-4 text-slate-300">
              <Target className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">
              {questions.length === 0 ? "لا توجد أسئلة حالياً" : "لا توجد أسئلة في هذا المجال المحدد"}
            </h3>
            <p className="text-slate-500 mt-2 text-sm">
              {questions.length === 0
                ? "ابدأ بإضافة أسئلة لتفعيل الاختبار المركزي للطلاب."
                : "يمكنك إضافة سؤال جديد وسيندرج تلقائياً في هذا المجال."}
            </p>
            {selectedDomainFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDomainFilter("all")}
                className="mt-4 text-xs font-bold"
              >
                عرض كل الأسئلة
              </Button>
            )}
          </div>
        ) : (
          <Table dir="rtl">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>الترتيب</TableHead>
                <TableHead className="w-[42%]">السؤال</TableHead>
                <TableHead>المجال</TableHead>
                <TableHead>الخيارات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((q) => {
                const domainInfo = q.domain_id ? domainMap.get(q.domain_id) : null;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-muted-foreground">{q.order_index}</TableCell>
                    <TableCell className="font-medium">
                      <span className="line-clamp-2">{q.text}</span>
                    </TableCell>
                    <TableCell>
                      {domainInfo ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${domainInfo.badgeClass}`}>
                          <span>{domainInfo.icon}</span>
                          <span>{domainInfo.name}</span>
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 font-normal">عام / غير محدد</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.choices?.length} خيارات</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={q.active ? "default" : "secondary"} className={q.active ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}>
                        {q.active ? "نشط" : "مخفي"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(q)} className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(q.id, q.text)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Beautiful Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl" className="border-red-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-bold text-xl">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-base leading-relaxed">
              <span className="font-medium text-slate-700">
                هل أنت متأكد من حذف هذا السؤال؟
              </span>
              <br />
              <span className="text-red-500 font-semibold mt-2 block">
                "{itemToDelete?.text?.substring(0, 40)}..."
              </span>
              <span className="text-slate-400 text-sm mt-3 block">
                لا يمكن التراجع عن هذا الإجراء بعد الحذف.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-2 mt-4">
            <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 font-bold px-6">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold px-6 shadow-lg shadow-red-500/25"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف السؤال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
