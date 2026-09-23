import { useState, useEffect, useMemo } from "react";
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
  TableRow,
} from "@/components/ui/table";
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
  Image as ImageIcon,
  Puzzle,
  Search,
  Tag,
  Layers,
  Sparkles,
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
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";

interface MatchingQuestionItem {
  left_text?: string;
  right_text?: string;
  left_image_url?: string | null;
  right_image_url?: string | null;
}

interface MatchingQuestion {
  id: string;
  left_text: string;
  right_text: string;
  left_image_url?: string | null;
  right_image_url?: string | null;
  items?: MatchingQuestionItem[];
  is_active: boolean;
  level: number;
  domain_id?: string | null;
  grade_subject_id?: string | null;
}

interface PairFormItem {
  id: string;
  termText: string;
  answerText: string;
  imageFile: File | null;
  imagePreview: string;
}

const getDomainSortPriority = (name?: string, slug?: string) => {
  const n = (name || "").toLowerCase();
  const s = (slug || "").toLowerCase();
  if (n.includes("أحياء") || n.includes("احياء") || s.includes("bio")) return 1;
  if (n.includes("كيمياء") || s.includes("chem")) return 2;
  if (n.includes("فيزياء") || s.includes("phys")) return 3;
  if (n.includes("كهرباء") || s.includes("elec")) return 4;
  if (
    n.includes("أرض") ||
    n.includes("ارض") ||
    n.includes("فضاء") ||
    s.includes("earth") ||
    s.includes("space")
  )
    return 5;
  if (n.includes("طبيعة") || n.includes("طبيعه") || s.includes("nature")) return 6;
  return 10;
};

export default function NafisMatching() {
  const { data: catalog } = useAcademicCatalog();
  const rawDomains = catalog?.domains || [];

  // Sorted: Biology first, Chemistry second, Physics third
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
          (name.includes("الأرض") ||
            name.includes("الارض") ||
            s.includes("earth") ||
            s.includes("space")) &&
          !name.includes("البيئة") &&
          !name.includes("البيئه")
        ) {
          name = "علم الأرض والفضاء والبيئة";
        }
        return { ...d, name };
      })
      .sort((a, b) => getDomainSortPriority(a.name, a.slug) - getDomainSortPriority(b.name, b.slug));
  }, [rawDomains]);

  const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic Pairs Form (supports adding multiple terms + images!)
  const [pairs, setPairs] = useState<PairFormItem[]>([
    {
      id: "pair_1",
      termText: "",
      answerText: "",
      imageFile: null,
      imagePreview: "",
    },
    {
      id: "pair_2",
      termText: "",
      answerText: "",
      imageFile: null,
      imagePreview: "",
    },
  ]);

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

  const addPairRow = () => {
    setPairs((prev) => [
      ...prev,
      {
        id: `pair_${Date.now()}_${prev.length}`,
        termText: "",
        answerText: "",
        imageFile: null,
        imagePreview: "",
      },
    ]);
  };

  const removePairRow = (id: string) => {
    if (pairs.length <= 1) {
      toast.error("يجب إدخال زوج مطابقة واحد على الأقل");
      return;
    }
    setPairs((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePair = (
    id: string,
    field: "termText" | "answerText",
    value: string,
  ) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handlePairImageSelect = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPairs((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  imageFile: file,
                  imagePreview: reader.result as string,
                }
              : p,
          ),
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPairImage = (id: string) => {
    setPairs((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, imageFile: null, imagePreview: "" } : p,
      ),
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one pair has a term + image or answer
    const validPairs = pairs.filter(
      (p) => p.termText.trim() && (p.imageFile || p.imagePreview || p.answerText.trim()),
    );

    if (validPairs.length === 0) {
      toast.error("يجب إدخال مصطلح علمي وصورة توضيحية أو تعريف لزوج واحد على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultGradeSubjectId =
        catalog?.gradeSubjects?.[0]?.id || "d5d10da4-4861-456d-a7a4-0b124e9a16d1";

      const uploadedItems: MatchingQuestionItem[] = [];

      for (let i = 0; i < validPairs.length; i++) {
        const pair = validPairs[i];
        let imageUrl = "";

        if (pair.imageFile) {
          const fileExt = pair.imageFile.name.split(".").pop();
          const fileName = `matching-nafis-${Math.random().toString(36).substring(2)}-${Date.now()}_${i}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("game-images")
            .upload(fileName, pair.imageFile);

          if (!uploadError) {
            const { data } = supabase.storage
              .from("game-images")
              .getPublicUrl(fileName);
            imageUrl = data.publicUrl;
          }
        }

        uploadedItems.push({
          left_text: pair.termText.trim(),
          right_text: pair.answerText.trim(),
          right_image_url: imageUrl || null,
          left_image_url: null,
        });
      }

      const firstItem = uploadedItems[0];

      const { error } = await supabase.from("matching_game_questions").insert({
        left_text: firstItem.left_text || "",
        right_text: firstItem.right_text || "",
        right_image_url: firstItem.right_image_url || null,
        left_image_url: null,
        items: uploadedItems,
        level: 1,
        is_active: true,
        track_type: "nafis",
        stage: "default",
        grade_subject_id: defaultGradeSubjectId,
        domain_id:
          selectedDomainId && selectedDomainId !== "none" ? selectedDomainId : null,
      });

      if (error) throw error;

      toast.success(
        `تمت إضافة سؤال المطابقة بنجاح يحتوي على (${uploadedItems.length}) أزواج مصطلحات وصور`,
      );

      // Reset form
      setPairs([
        {
          id: `pair_${Date.now()}_1`,
          termText: "",
          answerText: "",
          imageFile: null,
          imagePreview: "",
        },
        {
          id: `pair_${Date.now()}_2`,
          termText: "",
          answerText: "",
          imageFile: null,
          imagePreview: "",
        },
      ]);
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "فشل إضافة سؤال المطابقة");
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
        prev.map((q) =>
          q.id === questionId ? { ...q, domain_id: targetDomain } : q,
        ),
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
      const { error } = await supabase
        .from("matching_game_questions")
        .delete()
        .eq("id", itemToDelete);
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
        prev.map((q) => (q.id === id ? { ...q, is_active: !currentState } : q)),
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
        const hasMatchInItems = (q.items || []).some(
          (item) =>
            item.left_text?.toLowerCase().includes(query) ||
            item.right_text?.toLowerCase().includes(query),
        );
        return (
          hasMatchInItems ||
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
          <h1 className="text-3xl font-bold text-slate-800">
            لعبة المطابقة - بنك نافس الوطني
          </h1>
          <p className="text-slate-500">
            إدارة أسئلة لعبة المطابقة، إضافة مصطلحات وصور متعددة وتصنيفها حسب المجال العلمي
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-rose-600">
              {questions.length}
            </div>
            <div className="text-sm text-slate-600 font-bold">
              إجمالي أسئلة المطابقة
            </div>
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
            <div className="text-sm text-slate-600 font-bold">
              أسئلة مصنفة حسب المجال
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form - Multiple Pairs Support */}
      <Card className="card-elevated border-2 border-rose-100 shadow-md">
        <CardHeader className="bg-gradient-to-r from-rose-50/70 to-pink-50/70 border-b border-rose-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-black text-slate-900">
                <Plus className="w-5 h-5 text-rose-600" />
                <span>إضافة تحدي مطابقة جديد (مصطلحات وصور متعددة)</span>
              </CardTitle>
              <p className="text-xs font-bold text-slate-600 mt-1">
                يمكنك إضافة عدة مصطلحات علمية وصورها المقابلة في نفس السؤال لتظهر للطلاب في عمودين متوازيين
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addPairRow}
              className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة زوج آخر (+)</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleAdd} className="space-y-6">
            {/* Domain Selection Field (Sorted: Biology first) */}
            <div className="space-y-2 bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-rose-600" />
                <span>المجال العلمي التخصصي</span>
                <span className="text-xs text-rose-700 font-medium">
                  (يربط السؤال بمجال الطالب: الأحياء، الكيمياء، الفيزياء...)
                </span>
              </Label>
              <Select
                value={selectedDomainId}
                onValueChange={setSelectedDomainId}
              >
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

            {/* Dynamic Pairs List */}
            <div className="space-y-4">
              <Label className="text-sm font-black text-slate-900 flex items-center justify-between">
                <span>أزواج المصطلحات والصور المقابلة ({pairs.length} أزواج)</span>
                <span className="text-xs font-bold text-slate-500">
                  عمود المصطلحات ⟷ عمود الصور
                </span>
              </Label>

              <div className="space-y-3">
                {pairs.map((pair, idx) => (
                  <div
                    key={pair.id}
                    className="p-4 rounded-2xl bg-slate-50/90 border-2 border-slate-200/90 hover:border-rose-300 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-xs font-black text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-lg">
                        الزوج {idx + 1}
                      </span>
                      {pairs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePairRow(pair.id)}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-100 gap-1 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف هذا الزوج</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 items-start">
                      {/* Column 1: Term / Concept */}
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700">
                          المصطلح أو المفهوم العلمي 📝
                        </Label>
                        <Input
                          placeholder="مثال: صدع عكسي، المحرك الكهربائي، نموذج دالتون..."
                          value={pair.termText}
                          onChange={(e) =>
                            updatePair(pair.id, "termText", e.target.value)
                          }
                          className="bg-white font-bold text-sm"
                        />
                      </div>

                      {/* Column 2: Image / Answer */}
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700">
                          الصورة التوضيحية المقابلة 🖼️ (أو التعريف)
                        </Label>

                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`pair-image-${pair.id}`}
                            onChange={(e) => handlePairImageSelect(pair.id, e)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              document
                                .getElementById(`pair-image-${pair.id}`)
                                ?.click()
                            }
                            className="gap-2 text-xs font-bold rounded-xl border-slate-300 h-10 flex-1 bg-white hover:bg-slate-100"
                          >
                            <ImageIcon className="w-4 h-4 text-rose-600" />
                            <span>
                              {pair.imagePreview ? "تغيير الصورة" : "رفع صورة للمصطلح"}
                            </span>
                          </Button>

                          {pair.imagePreview && (
                            <div className="flex items-center gap-2 shrink-0">
                              <img
                                src={pair.imagePreview}
                                alt="Preview"
                                className="w-10 h-10 object-contain rounded-xl border bg-white shadow-xs p-0.5"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => clearPairImage(pair.id)}
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <Input
                          placeholder="أو اكتب تعريف/نص بديل إن لم تتوفر صورة..."
                          value={pair.answerText}
                          onChange={(e) =>
                            updatePair(pair.id, "answerText", e.target.value)
                          }
                          className="bg-white font-medium text-xs mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-start pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPairRow}
                  className="gap-2 text-xs font-black text-rose-700 border-dashed border-rose-300 hover:bg-rose-50 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة زوج مطابقة جديد لهذا السؤال</span>
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-black h-12 px-8 rounded-2xl shadow-lg shadow-rose-600/25 gap-2.5 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                <span>حفظ سؤال المطابقة بجميع أزواجه الآن</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="card-elevated border border-slate-200 shadow-md">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-slate-800">
                قائمة أسئلة المطابقة ({filteredQuestions.length} من {questions.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                تصفية وتصنيف أسئلة المطابقة حسب المجال العلمي
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Domain Filter Dropdown */}
              <div className="w-52">
                <Select value={filterDomain} onValueChange={setFilterDomain}>
                  <SelectTrigger className="w-full bg-white font-bold text-xs h-10 border-slate-200 rounded-xl">
                    <SelectValue placeholder="فلترة حسب المجال" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">
                      جميع المجالات ({questions.length})
                    </SelectItem>
                    {domains.map((d) => {
                      const count = questions.filter(
                        (q) => q.domain_id === d.id,
                      ).length;
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({count})
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="unassigned">
                      غير مصنف (
                      {questions.filter((q) => !q.domain_id).length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="relative w-56">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث في المفاهيم والمصطلحات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-xs rounded-xl"
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
            <div className="text-center py-16 space-y-2">
              <Puzzle className="w-16 h-16 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold">
                لا توجد أسئلة تطابق الفلتر الحالي
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold">المصطلحات / المفاهيم</TableHead>
                    <TableHead className="font-bold">الصور التوضيحية المقابلة</TableHead>
                    <TableHead className="w-48 font-bold">المجال العلمي</TableHead>
                    <TableHead className="w-24 text-center font-bold">الحالة</TableHead>
                    <TableHead className="w-20 text-center font-bold">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question, idx) => {
                    // Extract pairs list from question.items or fallback
                    const displayItems =
                      question.items && question.items.length > 0
                        ? question.items
                        : [
                            {
                              left_text: question.left_text,
                              right_text: question.right_text,
                              left_image_url: question.left_image_url,
                              right_image_url: question.right_image_url,
                            },
                          ];

                    return (
                      <TableRow
                        key={question.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="text-center font-bold text-xs text-slate-400">
                          {idx + 1}
                        </TableCell>

                        {/* Terms column */}
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {displayItems.map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800"
                              >
                                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                                  {itemIdx + 1}
                                </span>
                                <span>{item.left_text || item.right_text || "مصطلح"}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>

                        {/* Images / Answers column */}
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {displayItems.map((item, itemIdx) => {
                              const img =
                                item.right_image_url || item.left_image_url;
                              return (
                                <div
                                  key={itemIdx}
                                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl"
                                >
                                  {img ? (
                                    <img
                                      src={img}
                                      alt=""
                                      className="w-8 h-8 object-contain rounded-lg border bg-white shrink-0"
                                    />
                                  ) : null}
                                  <span className="text-xs font-bold text-slate-700 max-w-[120px] truncate">
                                    {img
                                      ? `صورة ${itemIdx + 1}`
                                      : item.right_text || "تعريف"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* Domain Select */}
                        <TableCell>
                          <Select
                            value={question.domain_id || "none"}
                            onValueChange={(val) =>
                              handleUpdateDomain(question.id, val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs font-bold bg-white border-slate-200 shadow-xs rounded-xl">
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

                        {/* Status Toggle */}
                        <TableCell className="text-center">
                          <Badge
                            variant={question.is_active ? "default" : "secondary"}
                            className="cursor-pointer select-none rounded-lg"
                            onClick={() =>
                              toggleActive(question.id, question.is_active)
                            }
                          >
                            {question.is_active ? "نشط" : "مخفي"}
                          </Badge>
                        </TableCell>

                        {/* Delete Action */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(question.id)}
                            className="hover:bg-red-50 hover:text-red-600 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف سؤال المطابقة هذا نهائياً بجميع أزواجه؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 font-bold rounded-xl"
            >
              حذف السؤال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
