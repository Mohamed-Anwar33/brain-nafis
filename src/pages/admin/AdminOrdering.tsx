
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload, CheckSquare, Square, AlertTriangle } from "lucide-react";
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

interface OrderingQuestion {
    id: string;
    items: string[];
    correct_order: string[];
    title: string;
    is_active: boolean;
    level: number;
}

export default function AdminOrdering() {
    const [questions, setQuestions] = useState<OrderingQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isBulkDelete, setIsBulkDelete] = useState(false);

    // Form State


    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("ordering_game_questions")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const typedData = (data || []).map((item: any) => ({
                ...item,
                items: item.items as string[],
                correct_order: item.correct_order as string[]
            }));

            setQuestions(typedData);
        } catch (err: any) {
            if (err.message?.includes('does not exist')) {
                console.warn("Table ordering_game_questions does not exist yet.");
            } else {
                console.error(err);
                toast.error("فشل تحميل البيانات");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const [newQuestion, setNewQuestion] = useState({
        title: "",
        item1: "", item2: "", item3: "", item4: "",
        level: 1
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        const items = [
            newQuestion.item1,
            newQuestion.item2,
            newQuestion.item3,
            newQuestion.item4
        ].filter(s => s && s.trim());

        if (items.length < 2) {
            toast.error("يجب إدخال عنصرين على الأقل");
            return;
        }

        setIsSubmitting(true);
        try {
            // We assume input is in correct order
            const { error } = await supabase.from("ordering_game_questions").insert({
                title: newQuestion.title || "رتب العناصر التالية",
                items: items, // Save as correct array
                correct_order: items, // Same array
                drop_labels: items.map((_, i) => `${i + 1}`), // Default labels 1, 2, ...
                level: 1,
                stage: "default",
                is_active: true
            });

            if (error) throw error;

            toast.success("تمت الإضافة بنجاح");
            setNewQuestion({
                title: "",
                item1: "", item2: "", item3: "", item4: "",
                level: 1
            });
            fetchQuestions();
        } catch (err) {
            console.error(err);
            toast.error("فشل إضافة السؤال");
        } finally {
            setIsSubmitting(false);
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
            const { error } = await supabase.from("ordering_game_questions").delete().eq("id", id);
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
                .from("ordering_game_questions")
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

                // Assuming simple CSV: Title, Item1, Item2, Item3, Item4
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

                if (cols.length >= 3) { // Title + at least 2 items
                    const title = cols[0];
                    const items = cols.slice(1).filter(i => i && i !== "");

                    if (items.length >= 2) {
                        validQuestions.push({
                            title: title,
                            items: items,
                            correct_order: items,
                            drop_labels: items.map((_, idx) => `${idx + 1}`),
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
                const { error } = await supabase.from('ordering_game_questions').insert(validQuestions);
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
            <h1 className="text-3xl font-bold">إدارة لغز الترتيب</h1>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
                <h3 className="font-bold mb-2">تعليمات الإضافة:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li>أكتب <strong>عنوان السؤال</strong> بوضوح (مثال: رتب الكواكب من الأقرب للشمس).</li>
                    <li>أدخل العناصر في الحقول المرقمة <strong>بالترتيب الصحيح</strong> (من 1 إلى 4).</li>
                    <li>مثال: 1: عطارد، 2: الزهرة، 3: الأرض، 4: المريخ.</li>
                    <li>النظام سيقوم بخلط هذه العناصر تلقائياً عند عرضها للطالب.</li>
                </ul>
            </div>



            <Card>
                <CardHeader>
                    <CardTitle>إضافة سؤال ترتيب جديد</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">عنوان السؤال</label>
                                <Input
                                    value={newQuestion.title}
                                    onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
                                    placeholder="مثال: رتب العناصر حسب العدد الذري"
                                />
                            </div>

                        </div>
                        <div className="grid grid-cols-1 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <label className="text-sm font-bold text-blue-800 mb-2 block">العناصر بالترتيب الصحيح (من 1 إلى 4)</label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 1 (الأول)</label>
                                    <Input
                                        value={newQuestion.item1 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item1: e.target.value })}
                                        placeholder="مثال: طفل"
                                        className="bg-white p-3 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 2</label>
                                    <Input
                                        value={newQuestion.item2 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item2: e.target.value })}
                                        placeholder="مثال: شاب"
                                        className="bg-white p-3 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 3</label>
                                    <Input
                                        value={newQuestion.item3 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item3: e.target.value })}
                                        placeholder="مثال: رجل"
                                        className="bg-white p-3 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 4 (الأخير)</label>
                                    <Input
                                        value={newQuestion.item4 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item4: e.target.value })}
                                        placeholder="مثال: عجوز"
                                        className="bg-white p-3 h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
                            حفظ الترتيب (سيتم خلطه تلقائياً)
                        </Button>
                    </form>
                </CardContent>
            </Card>

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
                                        <TableHead className="min-w-[200px]">العنوان</TableHead>
                                        <TableHead className="min-w-[250px]">العناصر (الترتيب الصحيح)</TableHead>
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
                                            <TableCell className="font-medium line-clamp-2 max-w-[200px]" title={q.title}>
                                                {q.title}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {q.correct_order?.map((item, i) => (
                                                        <Badge key={i} variant="outline" className="whitespace-nowrap">{item}</Badge>
                                                    ))}
                                                </div>
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
