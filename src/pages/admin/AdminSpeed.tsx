
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface SpeedQuestion {
    id: string;
    question_text: string;
    choice1: string;
    choice2: string;
    choice3: string;
    choice4: string;
    correct_choice_index: number;
    is_active: boolean;
}

export default function AdminSpeed() {
    const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isBulkDelete, setIsBulkDelete] = useState(false);

    // Form State
    const [newQuestion, setNewQuestion] = useState({
        question_text: "",
        choice1: "",
        choice2: "",
        choice3: "",
        choice4: "",
        correct_choice_index: 1
    });

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("speed_challenge_questions")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setQuestions(data || []);
        } catch (err: any) {
            if (err.message?.includes('does not exist')) {
                console.warn("Table speed_challenge_questions does not exist yet.");
            } else {
                console.error(err);
                toast.error("فشل تحميل البيانات");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        // choice1 is treated as "Correct Answer" in the form
        // choice2, choice3, choice4 are "Wrong Answers"
        if (!newQuestion.question_text || !newQuestion.choice1 || !newQuestion.choice2) return;

        setIsSubmitting(true);
        try {
            // Prepare answers array: [Correct, Wrong1, Wrong2, Wrong3]
            const correctAnswer = newQuestion.choice1;
            const answers = [
                newQuestion.choice1,
                newQuestion.choice2,
                newQuestion.choice3,
                newQuestion.choice4
            ].filter(a => a); // Filter empty if any

            // Shuffle answers
            for (let i = answers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [answers[i], answers[j]] = [answers[j], answers[i]];
            }

            // Find new index of correct answer (1-based)
            const correctIndex = answers.indexOf(correctAnswer) + 1;

            const { error } = await supabase.from("speed_challenge_questions").insert({
                question_text: newQuestion.question_text,
                choice1: answers[0] || "",
                choice2: answers[1] || "",
                choice3: answers[2] || "",
                choice4: answers[3] || "",
                correct_choice_index: correctIndex,
                is_active: true,
                stage: "default"
            });

            if (error) {
                console.error("Error adding question:", error);
                throw error;
            }

            toast.success("تمت الإضافة بنجاح");
            setNewQuestion({
                question_text: "",
                choice1: "", choice2: "", choice3: "", choice4: "",
                correct_choice_index: 1
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
            const { error } = await supabase.from("speed_challenge_questions").delete().eq("id", id);
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
                .from("speed_challenge_questions")
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
            // Handle both \r\n and \n
            const lines = text.split(/\r?\n/);
            const validQuestions = [];
            let errors = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Simple regex to split by comma but respect quotes roughly, or just split by comma for simplicity as requested
                // Assuming simple CSV: Question, Correct, Wrong1, Wrong2, Wrong3
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

                if (cols.length >= 2) {
                    const questionText = cols[0];
                    const correctAnswer = cols[1];
                    // wrong answers are optional but better to have at least 1
                    const wrongAnswers = cols.slice(2).filter(w => w);

                    // Shuffle logic similar to handleAdd
                    const allAnswers = [correctAnswer, ...wrongAnswers];
                    const shuffledIndices = allAnswers.map((_, idx) => idx).sort(() => Math.random() - 0.5);

                    const shuffledAnswers = shuffledIndices.map(idx => allAnswers[idx]);
                    const correctIndex = shuffledIndices.indexOf(0); // 0 was the correct answer's original index

                    validQuestions.push({
                        question_text: questionText,
                        choice1: shuffledAnswers[0] || "",
                        choice2: shuffledAnswers[1] || "",
                        choice3: shuffledAnswers[2] || "",
                        choice4: shuffledAnswers[3] || "",
                        correct_choice_index: correctIndex, // 0-based index
                        level: 1,
                        active: true
                    });
                } else {
                    errors++;
                }
            }

            if (validQuestions.length > 0) {
                const { error } = await supabase.from('speed_challenge_questions').insert(validQuestions);
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

            // infer result to clear input
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">إدارة تحدي السرعة</h1>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
                <h3 className="font-bold mb-2">تعليمات الإضافة:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li>أكتب <strong>السؤال</strong> في الحقل المخصص.</li>
                    <li>أكتب <strong>الإجابة الصحيحة</strong> في الصندوق الأخضر.</li>
                    <li>أكتب خيارات خاطئة في الصندوق الأحمر (واحد على الأقل).</li>
                    <li>سيقوم النظام بخلط أماكن الإجابات تلقائياً عند العرض للطالب.</li>
                </ul>
            </div>





            <Card>
                <CardHeader>
                    <CardTitle>إضافة سؤال جديد</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">نص السؤال</label>
                            <Input
                                value={newQuestion.question_text}
                                onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                placeholder="أدخل السؤال هنا..."
                            />
                        </div>



                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg border border-green-100">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-green-700">الإجابة الصحيحة</label>
                                <Input
                                    value={newQuestion.choice1} // Using choice1 state for Correct Answer temporally
                                    onChange={e => setNewQuestion({ ...newQuestion, choice1: e.target.value })}
                                    placeholder="الإجابة الصحيحة هنا"
                                    className="border-green-300 focus-visible:ring-green-500 p-3 h-10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-700">اختيار خاطئ 1</label>
                                <Input
                                    value={newQuestion.choice2}
                                    onChange={e => setNewQuestion({ ...newQuestion, choice2: e.target.value })}
                                    placeholder="خطأ 1"
                                    className="border-red-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-700">اختيار خاطئ 2</label>
                                <Input
                                    value={newQuestion.choice3}
                                    onChange={e => setNewQuestion({ ...newQuestion, choice3: e.target.value })}
                                    placeholder="خطأ 2"
                                    className="border-red-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-700">اختيار خاطئ 3</label>
                                <Input
                                    value={newQuestion.choice4}
                                    onChange={e => setNewQuestion({ ...newQuestion, choice4: e.target.value })}
                                    placeholder="خطأ 3"
                                    className="border-red-200"
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
                            حفظ السؤال (سيتم خلط الإجابات تلقائياً)
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
                                        <TableHead className="min-w-[200px]">السؤال</TableHead>
                                        <TableHead className="min-w-[150px]">الإجابات</TableHead>
                                        <TableHead className="min-w-[100px]">الصحيحة</TableHead>
                                        <TableHead className="min-w-[100px]">الحالة</TableHead>
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
                                            <TableCell className="font-medium line-clamp-2 max-w-[200px]" title={q.question_text}>
                                                {q.question_text}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="bg-slate-100 px-1 rounded">{q.choice1}</span>
                                                    <span className="bg-slate-100 px-1 rounded">{q.choice2}</span>
                                                    <span className="bg-slate-100 px-1 rounded">{q.choice3}</span>
                                                    <span className="bg-slate-100 px-1 rounded">{q.choice4}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-green-600 font-bold">
                                                {q.correct_choice_index === 1 && q.choice1}
                                                {q.correct_choice_index === 2 && q.choice2}
                                                {q.correct_choice_index === 3 && q.choice3}
                                                {q.correct_choice_index === 4 && q.choice4}
                                            </TableCell>
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
        </div >
    );
}
