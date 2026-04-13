import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, ListOrdered, ArrowUpDown, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

interface StageItem {
    id: string;
    text: string;
    order: number;
}

interface StageQuestion {
    id: string;
    title: string;
    description: string;
    items: StageItem[];
    hint?: string;
    difficulty: string;
    is_active: boolean;
}

export default function AdminStages() {
    const [questions, setQuestions] = useState<StageQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Form State
    const [newQuestion, setNewQuestion] = useState({
        title: "",
        description: "",
        hint: "",
        difficulty: "easy",
    });
    const [items, setItems] = useState<StageItem[]>([
        { id: "1", text: "", order: 1 },
        { id: "2", text: "", order: 2 },
        { id: "3", text: "", order: 3 },
        { id: "4", text: "", order: 4 },
    ]);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("stages_game_questions")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setQuestions(data || []);
        } catch (err: any) {
            if (err.message?.includes('does not exist')) {
                console.warn("Table stages_game_questions does not exist yet.");
            } else {
                console.error("Error fetching stages questions:", err);
                toast.error("فشل تحميل البيانات");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.title.trim()) {
            toast.error("يجب إدخال عنوان المراحل");
            return;
        }
        
        const validItems = items.filter(i => i.text.trim());
        if (validItems.length < 2) {
            toast.error("يجب إدخال مرحلتين على الأقل");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from("stages_game_questions").insert({
                title: newQuestion.title,
                description: newQuestion.description,
                items: validItems.map((item, idx) => ({ ...item, order: idx + 1 })),
                hint: newQuestion.hint || null,
                difficulty: newQuestion.difficulty,
                is_active: true,
            });

            if (error) throw error;

            toast.success("تم إضافة المراحل بنجاح");
            setNewQuestion({ title: "", description: "", hint: "", difficulty: "easy" });
            setItems([
                { id: "1", text: "", order: 1 },
                { id: "2", text: "", order: 2 },
                { id: "3", text: "", order: 3 },
                { id: "4", text: "", order: 4 },
            ]);
            fetchQuestions();
        } catch (err: any) {
            console.error("Error adding question:", err);
            toast.error("فشل إضافة المراحل");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            const { error } = await supabase
                .from("stages_game_questions")
                .delete()
                .eq("id", itemToDelete);

            if (error) throw error;

            toast.success("تم حذف المراحل بنجاح");
            fetchQuestions();
        } catch (err) {
            console.error("Error deleting question:", err);
            toast.error("فشل حذف المراحل");
        } finally {
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    };

    const toggleActive = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from("stages_game_questions")
                .update({ is_active: !currentState })
                .eq("id", id);

            if (error) throw error;

            setQuestions(prev => prev.map(q => 
                q.id === id ? { ...q, is_active: !currentState } : q
            ));
            
            toast.success(currentState ? "تم إخفاء المراحل" : "تم إظهار المراحل");
        } catch (err) {
            console.error("Error toggling question:", err);
            toast.error("فشل تحديث الحالة");
        }
    };

    const addItem = () => {
        setItems([...items, { id: String(items.length + 1), text: "", order: items.length + 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 2) {
            toast.error("يجب الاحتفاظ بمرحلتين على الأقل");
            return;
        }
        setItems(items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 })));
    };

    const updateItem = (index: number, text: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], text };
        setItems(newItems);
    };

    const moveItem = (index: number, direction: number) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === items.length - 1)) return;
        
        const newItems = [...items];
        const temp = newItems[index];
        newItems[index] = newItems[index + direction];
        newItems[index + direction] = temp;
        
        // Update orders
        setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy": return "bg-green-100 text-green-700";
            case "medium": return "bg-amber-100 text-amber-700";
            case "hard": return "bg-red-100 text-red-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case "easy": return "سهل";
            case "medium": return "متوسط";
            case "hard": return "صعب";
            default: return difficulty;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">ترتيب المراحل</h1>
                <p className="text-muted-foreground">إدارة أسئلة ترتيب المراحل العلمية</p>
            </div>

            {/* Add Question Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListOrdered className="w-5 h-5" />
                        إضافة مراحل جديدة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">العنوان</label>
                                <Input
                                    value={newQuestion.title}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                                    placeholder="مثال: دورة حياة الفراشة"
                                    className="text-right"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">الوصف</label>
                                <Input
                                    value={newQuestion.description}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                                    placeholder="رتب المراحل بالترتيب الصحيح"
                                    className="text-right"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">التلميح (اختياري)</label>
                                <Input
                                    value={newQuestion.hint}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, hint: e.target.value })}
                                    placeholder="تلميح للطلاب..."
                                    className="text-right"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">الصعوبة</label>
                                <select
                                    value={newQuestion.difficulty}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="easy">سهل</option>
                                    <option value="medium">متوسط</option>
                                    <option value="hard">صعب</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">المراحل (بالترتيب الصحيح)</label>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="w-4 h-4 ml-1" />
                                    إضافة مرحلة
                                </Button>
                            </div>
                            {items.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {idx + 1}
                                    </div>
                                    <Input
                                        value={item.text}
                                        onChange={(e) => updateItem(idx, e.target.value)}
                                        placeholder={`المرحلة ${idx + 1}`}
                                        className="flex-1 text-right"
                                    />
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveItem(idx, -1)}
                                            disabled={idx === 0}
                                            className="h-8 w-8"
                                        >
                                            <ArrowUpDown className="w-4 h-4 rotate-180" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveItem(idx, 1)}
                                            disabled={idx === items.length - 1}
                                            className="h-8 w-8"
                                        >
                                            <ArrowUpDown className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(idx)}
                                            className="h-8 w-8 text-red-500 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 ml-2" />
                            )}
                            إضافة المراحل
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Questions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>قائمة المراحل ({questions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ListOrdered className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>لا توجد مراحل حالياً</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>العنوان</TableHead>
                                    <TableHead>الوصف</TableHead>
                                    <TableHead>المراحل</TableHead>
                                    <TableHead>الصعوبة</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.map((question) => (
                                    <TableRow key={question.id}>
                                        <TableCell className="font-medium">{question.title}</TableCell>
                                        <TableCell className="max-w-xs truncate">{question.description}</TableCell>
                                        <TableCell>{question.items?.length || 0}</TableCell>
                                        <TableCell>
                                            <Badge className={getDifficultyColor(question.difficulty)}>
                                                {getDifficultyLabel(question.difficulty)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={question.is_active}
                                                onCheckedChange={() => toggleActive(question.id, question.is_active)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setItemToDelete(question.id);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
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

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من حذف هذه المراحل؟ لا يمكن التراجع عن هذا الإجراء.
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
