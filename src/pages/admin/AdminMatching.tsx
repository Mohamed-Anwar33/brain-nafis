
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
    stage: string;
    level: number;
}

export default function AdminMatching() {
    const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isBulkDelete, setIsBulkDelete] = useState(false);

    // Form State
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
                .order("created_at", { ascending: false });

            if (error) throw error;
            setQuestions(data || []);
        } catch (err: any) {
            // If table doesn't exist yet (migration pending), just show empty
            if (err.message?.includes('does not exist')) {
                console.warn("Table matching_game_questions does not exist yet.");
            } else {
                console.error("Error fetching matching questions:", err);
                toast.error("فشل تحميل البيانات");
            }
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

            // Upload Right Image
            if (selectedRightImage) {
                const fileExt = selectedRightImage.name.split('.').pop();
                const fileName = `matching-right-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('question-images').upload(fileName, selectedRightImage);

                if (!uploadError) {
                    const { data } = supabase.storage.from('question-images').getPublicUrl(fileName);
                    rightImageUrl = data.publicUrl;
                }
            }

            // Upload Left Image
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
                stage: "default",
                is_active: true
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
        setIsBulkDelete(false);
        setDeleteDialogOpen(true);
    };

    const confirmBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setIsBulkDelete(true);
        setDeleteDialogOpen(true);
    };

    const executeDelete = async () => {
        setDeleteDialogOpen(false);

        if (isBulkDelete) {
            await handleBulkDelete();
        } else if (itemToDelete) {
            await handleDelete(itemToDelete);
        }

        setItemToDelete(null);
        setIsBulkDelete(false);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from("matching_game_questions").delete().eq("id", id);
            if (error) throw error;

            // Update UI immediately
            setQuestions(prev => prev.filter(q => q.id !== id));
            toast.success("تم الحذف بنجاح");
        } catch (err) {
            console.error(err);
            toast.error("فشل الحذف");
            fetchQuestions(); // Reload on error
        }
    };

    const handleBulkDelete = async () => {
        try {
            const { error } = await supabase
                .from("matching_game_questions")
                .delete()
                .in("id", selectedIds);

            if (error) throw error;

            // Update UI immediately
            setQuestions(prev => prev.filter(q => !selectedIds.includes(q.id)));
            setSelectedIds([]);
            toast.success(`تم حذف ${selectedIds.length} سؤال بنجاح`);
        } catch (err) {
            console.error(err);
            toast.error("فشل الحذف الجماعي");
            fetchQuestions(); // Reload on error
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === questions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(questions.map(q => q.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/);
            const validQuestions = [];
            let errors = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

                if (cols.length >= 2) {
                    const question = cols[0];
                    const answer = cols[1];

                    if (question && answer) {
                        validQuestions.push({
                            left_text: question,
                            right_text: answer,
                            level: 1,
                            stage: "default",
                            is_active: true
                        });
                    } else {
                        errors++;
                    }
                } else {
                    errors++;
                }
            }

            if (validQuestions.length > 0) {
                const { error } = await supabase.from('matching_game_questions').insert(validQuestions);
                if (error) {
                    console.error(error);
                    toast.error("حدث خطأ أثناء حفظ الملف");
                } else {
                    toast.success(`تم استيراد ${validQuestions.length} سؤال بنجاح`);
                    if (errors > 0) toast.warning(`فشل استيراد ${errors} صف بسبب تنسيق غير صحيح`);
                    fetchQuestions();
                }
            } else {
                toast.error("لم يتم العثور على أسئلة صالحة في الملف");
            }

            event.target.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">إدارة لعبة المطابقة</h1>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
                <h3 className="font-bold mb-2">تعليمات الإضافة:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li>أدخل <strong>زوجين متطابقين</strong> في كل مرة.</li>
                    <li>مثال: في الحقل الأيمن اكتب "الذهب" وفي الأيسر "Au".</li>
                    <li>يمكنك إضافة معادلات رياضية (مثال: "5 + 5" و "10").</li>
                    <li>كلما أضفت أزواجاً أكثر، زادت عشوائية اللعبة وصعوبتها.</li>
                    <li>يختار النظام 6 أزواج عشوائية في كل جولة لعب.</li>
                </ul>
            </div>



            {/* Add New */}
            <Card>
                <CardHeader>
                    <CardTitle>إضافة زوج مطابقة جديد</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-lg font-bold text-primary">1. نص السؤال (الحقل الأول)</label>
                                <p className="text-sm text-gray-500">هذا هو النص الذي سيظهر للطالب ليبحث له عن مطابقة</p>
                                <Input
                                    value={newQuestion.left_text}
                                    onChange={e => setNewQuestion({ ...newQuestion, left_text: e.target.value })}
                                    placeholder="اكتب السؤال أو العنصر هنا..."
                                    className="p-3 text-base md:p-6 md:text-lg border-blue-200 focus-visible:ring-blue-500"
                                    disabled={!!selectedLeftImage}
                                />
                                <div className="space-y-2 pt-2">
                                    <div className="flex flex-col sm:flex-row gap-2 items-start">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageSelect('left', e)}
                                            className="hidden"
                                            id="left-img-upload"
                                        />
                                        {!leftImagePreview ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById("left-img-upload")?.click()}
                                                className="w-full gap-2 text-blue-700"
                                            >
                                                <ImageIcon className="w-4 h-4 ml-2" />
                                                أو اختر صورة للسؤال
                                            </Button>
                                        ) : (
                                            <div className="relative w-full border rounded-lg p-2 bg-white flex justify-center">
                                                <img src={leftImagePreview} alt="معاينة" className="max-h-32 object-contain" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                                    onClick={() => clearImage('left')}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <span className="text-muted-foreground bg-slate-100 px-3 py-1 rounded-full text-sm">يــطــابــق</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-lg font-bold text-green-700">2. الإجابة (الحقل المطابق)</label>
                                <p className="text-sm text-gray-500">يمكنك إدخال نص أو اختيار صورة (اختياري)</p>
                                <Input
                                    value={newQuestion.right_text}
                                    onChange={e => setNewQuestion({ ...newQuestion, right_text: e.target.value })}
                                    placeholder="اكتب الإجابة أو الرمز هنا... (اختياري إذا اخترت صورة)"
                                    className="p-3 text-base md:p-6 md:text-lg border-green-200 focus-visible:ring-green-500"
                                    disabled={!!selectedRightImage}
                                />

                                <div className="space-y-2 pt-2">
                                    <div className="flex flex-col sm:flex-row gap-2 items-start">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageSelect('right', e)}
                                            className="hidden"
                                            id="right-img-upload"
                                        />
                                        {!rightImagePreview ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById("right-img-upload")?.click()}
                                                className="w-full gap-2 text-green-700"
                                            >
                                                <ImageIcon className="w-4 h-4 ml-2" />
                                                أو اختر صورة للإجابة
                                            </Button>
                                        ) : (
                                            <div className="relative w-full border rounded-lg p-2 bg-white flex justify-center">
                                                <img src={rightImagePreview} alt="معاينة" className="max-h-32 object-contain" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                                    onClick={() => clearImage('right')}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full py-6 text-lg">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="w-6 h-6 ml-2" />}
                            إضافة الزوج (سؤال + إجابة)
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* List */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 space-y-0 pb-2">
                    <div className="space-y-1 w-full md:w-auto">
                        <CardTitle className="text-2xl font-bold">الأسئلة</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            إجمالي: {questions.length} سؤال
                            {selectedIds.length > 0 && ` • محدد: ${selectedIds.length}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {selectedIds.length > 0 && (
                            <Button variant="destructive" onClick={confirmBulkDelete} className="flex-1 md:flex-none">
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف ({selectedIds.length})
                            </Button>
                        )}
                        <Input
                            type="file"
                            accept=".csv, .txt"
                            className="hidden"
                            id="csv-upload"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()} className="flex-1 md:flex-none">
                            <Upload className="w-4 h-4 ml-2" />
                            استيراد CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
                    ) : questions.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">لا توجد بيانات</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={toggleSelectAll}
                                                className="h-8 w-8 p-0"
                                            >
                                                {selectedIds.length === questions.length && questions.length > 0 ?
                                                    <CheckSquare className="w-4 h-4" /> :
                                                    <Square className="w-4 h-4" />
                                                }
                                            </Button>
                                        </TableHead>
                                        <TableHead className="min-w-[150px]">النص الأيمن</TableHead>
                                        <TableHead className="min-w-[150px]">النص/الصورة الأيسر</TableHead>
                                        <TableHead className="min-w-[80px]">المستوى</TableHead>
                                        <TableHead className="min-w-[80px]">الحالة</TableHead>
                                        <TableHead className="w-[100px]">إجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {questions.map(q => (
                                        <TableRow key={q.id} className={selectedIds.includes(q.id) ? "bg-muted/50" : ""}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(q.id)}
                                                    onCheckedChange={() => toggleSelect(q.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {q.left_image_url ? (
                                                    <div className="flex items-center gap-2">
                                                        <ImageIcon className="w-4 h-4 text-purple-500" />
                                                        <img src={q.left_image_url} alt="question" className="h-10 w-auto rounded border bg-white" />
                                                    </div>
                                                ) : (
                                                    q.left_text
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {q.right_image_url ? (
                                                    <div className="flex items-center gap-2">
                                                        <ImageIcon className="w-4 h-4 text-green-500" />
                                                        <img src={q.right_image_url} alt="answer" className="h-10 w-auto rounded border bg-white" />
                                                    </div>
                                                ) : (
                                                    q.right_text
                                                )}
                                            </TableCell>
                                            <TableCell>{q.level}</TableCell>
                                            <TableCell>
                                                <Badge variant={q.is_active ? "default" : "secondary"}>
                                                    {q.is_active ? "نشط" : "معطل"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(q.id)}>
                                                    <Trash2 className="w-4 h-4" />
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

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            تأكيد الحذف
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                            {isBulkDelete
                                ? `هل أنت متأكد من حذف ${selectedIds.length} أسئلة؟ لا يمكن التراجع عن هذا الإجراء.`
                                : "هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
                            حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
