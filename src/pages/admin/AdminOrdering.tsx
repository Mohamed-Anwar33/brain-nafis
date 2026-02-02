
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload } from "lucide-react";

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

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        try {
            const { error } = await supabase.from("ordering_game_questions").delete().eq("id", id);
            if (error) throw error;
            toast.success("تم الحذف");
            fetchQuestions();
        } catch (err) {
            console.error(err);
            toast.error("فشل الحذف");
        }
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
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 2</label>
                                    <Input
                                        value={newQuestion.item2 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item2: e.target.value })}
                                        placeholder="مثال: شاب"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 3</label>
                                    <Input
                                        value={newQuestion.item3 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item3: e.target.value })}
                                        placeholder="مثال: رجل"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">العنصر رقم 4 (الأخير)</label>
                                    <Input
                                        value={newQuestion.item4 || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, item4: e.target.value })}
                                        placeholder="مثال: عجوز"
                                        className="bg-white"
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold">الأسئلة</CardTitle>
                        <p className="text-sm text-muted-foreground">إجمالي: {questions.length} سؤال</p>
                    </div>
                    <div>
                        <Input
                            type="file"
                            accept=".csv, .txt"
                            className="hidden"
                            id="csv-upload"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>العنوان</TableHead>
                                    <TableHead>العناصر (الترتيب الصحيح)</TableHead>
                                    <TableHead>المستوى</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.map(q => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{q.title}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {q.correct_order?.map((item, i) => (
                                                    <Badge key={i} variant="outline">{item}</Badge>
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
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(q.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
