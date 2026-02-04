import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Upload, CheckSquare, Square, AlertTriangle, Image as ImageIcon } from "lucide-react";
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
    item_images?: string[];
    image_url?: string; // Main question image
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
                correct_order: item.correct_order as string[],
                item_images: item.item_images as string[] || [],
                image_url: item.image_url
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

    // Image states
    const [titleImage, setTitleImage] = useState<File | null>(null);
    const [titleImagePreview, setTitleImagePreview] = useState<string>("");
    const [itemImages, setItemImages] = useState<(File | null)[]>([null, null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<string[]>(["", "", "", ""]);

    const handleImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (index === -1) {
                    setTitleImage(file);
                    setTitleImagePreview(result);
                } else {
                    const newImages = [...itemImages];
                    newImages[index] = file;
                    setItemImages(newImages);

                    const newPreviews = [...imagePreviews];
                    newPreviews[index] = result;
                    setImagePreviews(newPreviews);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const clearImage = (index: number) => {
        if (index === -1) {
            setTitleImage(null);
            setTitleImagePreview("");
        } else {
            const newImages = [...itemImages];
            newImages[index] = null;
            setItemImages(newImages);

            const newPreviews = [...imagePreviews];
            newPreviews[index] = "";
            setImagePreviews(newPreviews);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        const items = [
            newQuestion.item1,
            newQuestion.item2,
            newQuestion.item3,
            newQuestion.item4
        ].filter(s => s && s.trim());

        // Validate items count OR if generic placeholders are fine, but basically we need 4 items structure
        // If we want exactly 4 items always, it's easier. The current code filters empty strings.
        // Let's assume user fills inputs sequentially.

        if (items.length < 2) {
            toast.error("يجب إدخال عنصرين على الأقل");
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload images
            let titleImageUrl = "";
            if (titleImage) {
                const fileExt = titleImage.name.split('.').pop();
                const fileName = `ordering-title-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('question-images').upload(fileName, titleImage);
                if (!uploadError) {
                    const { data } = supabase.storage.from('question-images').getPublicUrl(fileName);
                    titleImageUrl = data.publicUrl;
                }
            }

            // Loop through 4 potential slots
            for (let i = 0; i < 4; i++) {
                if (itemImages[i]) {
                    const file = itemImages[i]!;
                    const fileExt = file.name.split('.').pop();
                    const fileName = `ordering-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('question-images')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error(`Upload error for item ${i + 1}:`, uploadError);
                        // Push empty or null placeholder to match index? 
                        // The items array is filtered, so indices might shift if an item text is empty.
                        // Ideally we enforce filling items 1 to N.
                        // Let's assume we map uploaded images 1-to-1 to input fields.
                        // If input 1 has text, we look at image 1.
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('question-images')
                            .getPublicUrl(fileName);

                        // We need to store strictly if this image belongs to a valid item
                        // But wait, the `items` array above is filtered. itemImages is fixed length 4.
                        // We must rebuild `items` and `item_images` such that they align.
                    }
                }
            }

            // Revised logic: align items and images
            const finalItems: string[] = [];
            const finalImages: string[] = []; // Store null/empty string for items without images

            const inputs = [newQuestion.item1, newQuestion.item2, newQuestion.item3, newQuestion.item4];

            for (let i = 0; i < 4; i++) {
                const text = inputs[i]?.trim();
                if (text) {
                    finalItems.push(text);

                    let uploadedUrl = "";
                    if (itemImages[i]) {
                        const file = itemImages[i]!;
                        const fileExt = file.name.split('.').pop();
                        const fileName = `ordering-${Math.random().toString(36).substring(2)}-${Date.now()}-${i}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from('question-images')
                            .upload(fileName, file);

                        if (!uploadError) {
                            const { data } = supabase.storage.from('question-images').getPublicUrl(fileName);
                            uploadedUrl = data.publicUrl;
                        }
                    }
                    finalImages.push(uploadedUrl);
                }
            }


            // We assume input is in correct order
            const { error } = await supabase.from("ordering_game_questions").insert({
                title: newQuestion.title || "رتب العناصر التالية",
                items: finalItems,
                correct_order: finalItems, // Same array items are correct order initially
                item_images: finalImages, // Save image URLs parallel to items
                image_url: titleImageUrl,
                drop_labels: finalItems.map((_, i) => `${i + 1}`),
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
            setItemImages([null, null, null, null]);
            setImagePreviews(["", "", "", ""]);
            setTitleImage(null);
            setTitleImagePreview("");
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

                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

                if (cols.length >= 3) {
                    const title = cols[0];
                    const items = cols.slice(1).filter(i => i && i !== "");

                    // No images in CSV import for now

                    if (items.length >= 2) {
                        validQuestions.push({
                            title: title,
                            items: items,
                            correct_order: items,
                            item_images: items.map(() => ""), // Empty images
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
                    <li>أكتب <strong>عنوان السؤال</strong> بوضوح.</li>
                    <li>أدخل <strong>النص</strong> و optionally <strong>الصورة</strong> لكل عنصر.</li>
                    <li>أدخل العناصر <strong>بالترتيب الصحيح</strong> (من 1 إلى 4).</li>
                    <li>النظام سيقوم بخلط العناصر تلقائياً.</li>
                </ul>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>إضافة سؤال ترتيب جديد</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">عنوان السؤال</label>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        value={newQuestion.title}
                                        onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
                                        placeholder="مثال: رتب العناصر حسب العدد الذري"
                                    />
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="title-img-upload"
                                        onChange={(e) => handleImageSelect(-1, e)}
                                    />
                                    {!titleImagePreview ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById("title-img-upload")?.click()}
                                            className="gap-2"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            صورة للسؤال
                                        </Button>
                                    ) : (
                                        <div className="relative">
                                            <img src={titleImagePreview} alt="Preview" className="h-10 w-10 object-cover rounded border" />
                                            <button
                                                type="button"
                                                onClick={() => clearImage(-1)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                                x
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <label className="text-sm font-bold text-blue-800 mb-2 block">العناصر بالترتيب الصحيح (من 1 إلى 4)</label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[1, 2, 3, 4].map((num, i) => {
                                    const itemKey = `item${num}` as keyof typeof newQuestion;
                                    return (
                                        <div key={num} className="space-y-2 border p-3 rounded-lg bg-white">
                                            <label className="text-xs font-medium text-gray-500 block mb-1">العنصر رقم {num}</label>

                                            <Input
                                                value={newQuestion[itemKey] as string}
                                                onChange={e => setNewQuestion({ ...newQuestion, [itemKey]: e.target.value })}
                                                placeholder={`نص العنصر ${num}`}
                                                className="mb-2"
                                            />

                                            {/* Image Upload */}
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        id={`img-${i}`}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageSelect(i, e)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => document.getElementById(`img-${i}`)?.click()}
                                                        className="w-full gap-2 text-xs"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                        {imagePreviews[i] ? "تغيير الصورة" : "صورة"}
                                                    </Button>
                                                </div>
                                                {imagePreviews[i] && (
                                                    <div className="relative shrink-0">
                                                        <img src={imagePreviews[i]} alt="pv" className="w-10 h-10 object-cover rounded border" />
                                                        <button
                                                            type="button"
                                                            onClick={() => clearImage(i)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                        >
                                                            x
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="w-5 h-5 ml-2" />}
                            حفظ الترتيب
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
                                        <TableHead className="min-w-[250px]">العناصر</TableHead>
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
                                                <div className="flex flex-wrap gap-2">
                                                    {q.correct_order?.map((item, i) => (
                                                        <div key={i} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-sm border">
                                                            <span>{item}</span>
                                                            {q.item_images && q.item_images[i] && (
                                                                <ImageIcon className="w-3 h-3 text-blue-500" />
                                                            )}
                                                        </div>
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
