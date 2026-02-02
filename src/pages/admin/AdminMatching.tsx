
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload } from "lucide-react";

interface MatchingQuestion {
    id: string;
    left_text: string;
    right_text: string;
    is_active: boolean;
    stage: string;
    level: number;
}

export default function AdminMatching() {
    const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [newQuestion, setNewQuestion] = useState({
        left_text: "",
        right_text: "",
        level: 1
    });

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
        if (!newQuestion.left_text || !newQuestion.right_text) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from("matching_game_questions").insert({
                left_text: newQuestion.left_text,
                right_text: newQuestion.right_text,
                level: newQuestion.level,
                stage: "default",
                is_active: true
            });

            if (error) throw error;

            toast.success("تمت الإضافة بنجاح");
            setNewQuestion({ left_text: "", right_text: "", level: 1 });
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
            const { error } = await supabase.from("matching_game_questions").delete().eq("id", id);
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
                                    className="p-6 text-lg"
                                />
                            </div>

                            <div className="flex justify-center">
                                <span className="text-muted-foreground bg-slate-100 px-3 py-1 rounded-full text-sm">يــطــابــق</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-lg font-bold text-green-700">2. الإجابة (الحقل المطابق)</label>
                                <p className="text-sm text-gray-500">هذا هو النص الذي يجب أن يختاره الطالب كإجابة صحيحة</p>
                                <Input
                                    value={newQuestion.right_text}
                                    onChange={e => setNewQuestion({ ...newQuestion, right_text: e.target.value })}
                                    placeholder="اكتب الإجابة أو الرمز هنا..."
                                    className="p-6 text-lg border-green-200 focus-visible:ring-green-500"
                                />
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
                                    <TableHead>النص الأيمن</TableHead>
                                    <TableHead>النص الأيسر</TableHead>
                                    <TableHead>المستوى</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.map(q => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{q.left_text}</TableCell>
                                        <TableCell>{q.right_text}</TableCell>
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
