import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, Gamepad2 } from "lucide-react";
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

interface MatchingQuestion {
  id: string;
  left_text: string;
  right_text: string;
  left_image_url?: string;
  right_image_url?: string;
  is_active: boolean;
  level: number;
}

export default function NafisMatching() {
  const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState({
    left_text: "",
    right_text: "",
    level: 1
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
        .or('track_type.eq.nafis,track_type.is.null') // Filter for Nafis only
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
        const fileExt = selectedRightImage.name.split('.').pop();
        const fileName = `matching-right-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('question-images').upload(fileName, selectedRightImage);
        if (!uploadError) {
          const { data } = supabase.storage.from('question-images').getPublicUrl(fileName);
          rightImageUrl = data.publicUrl;
        }
      }

      if (selectedLeftImage) {
        const fileExt = selectedLeftImage.name.split('.').pop();
        const fileName = `matching-left-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('question-images').upload(fileName, selectedLeftImage);
        if (!uploadError) {
          const { data } = supabase.storage.from('question-images').getPublicUrl(fileName);
          leftImageUrl = data.publicUrl;
        }
      }

      const { error } = await supabase.from("matching_game_questions").insert({
        left_text: newQuestion.left_text || "",
        right_text: newQuestion.right_text || "",
        right_image_url: rightImageUrl || null,
        left_image_url: leftImageUrl || null,
        level: newQuestion.level,
        is_active: true,
        track_type: "nafis", // Set track_type to nafis
        stage: "default"
      });

      if (error) throw error;

      toast.success("تمت الإضافة بنجاح");
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

  const handleImageSelect = (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'left') {
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

  const clearImage = (side: 'left' | 'right') => {
    if (side === 'left') {
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
      console.error(err);
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
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !currentState } : q));
      toast.success(currentState ? "تم إخفاء السؤال" : "تم إظهار السؤال");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحديث الحالة");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Gamepad2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">لعبة المطابقة - نافس</h1>
          <p className="text-slate-500">إدارة أسئلة المطابقة في النظام العام</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{questions.length}</div>
            <div className="text-sm text-slate-600">إجمالي الأسئلة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {questions.filter(q => q.is_active).length}
            </div>
            <div className="text-sm text-slate-600">الأسئلة النشطة</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">
              {questions.filter(q => !q.is_active).length}
            </div>
            <div className="text-sm text-slate-600">الأسئلة غير النشطة</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة سؤال جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-3">
                <label className="text-sm font-medium">الجانب الأيسر (السؤال)</label>
                <Input
                  placeholder="نص السؤال..."
                  value={newQuestion.left_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, left_text: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="left-image"
                    onChange={(e) => handleImageSelect('left', e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('left-image')?.click()}
                    className="gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {leftImagePreview ? "تغيير الصورة" : "إضافة صورة"}
                  </Button>
                  {leftImagePreview && (
                    <>
                      <img src={leftImagePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => clearImage('left')}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Side */}
              <div className="space-y-3">
                <label className="text-sm font-medium">الجانب الأيمن (الإجابة)</label>
                <Input
                  placeholder="نص الإجابة..."
                  value={newQuestion.right_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, right_text: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="right-image"
                    onChange={(e) => handleImageSelect('right', e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('right-image')?.click()}
                    className="gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {rightImagePreview ? "تغيير الصورة" : "إضافة صورة"}
                  </Button>
                  {rightImagePreview && (
                    <>
                      <img src={rightImagePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => clearImage('right')}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary-gradient gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة السؤال
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>قائمة الأسئلة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد أسئلة</p>
              <p className="text-sm text-slate-400 mt-2">أضف أسئلة جديدة لبدء استخدام اللعبة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الجانب الأيسر</TableHead>
                    <TableHead>الجانب الأيمن</TableHead>
                    <TableHead className="w-24">الحالة</TableHead>
                    <TableHead className="w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {question.left_image_url && (
                            <img src={question.left_image_url} alt="" className="w-10 h-10 object-cover rounded" />
                          )}
                          <span>{question.left_text || "(صورة)"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {question.right_image_url && (
                            <img src={question.right_image_url} alt="" className="w-10 h-10 object-cover rounded" />
                          )}
                          <span>{question.right_text || "(صورة)"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={question.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleActive(question.id, question.is_active)}
                        >
                          {question.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(question.id)}
                        >
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
