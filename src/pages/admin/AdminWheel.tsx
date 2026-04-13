import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, CircleDot, CheckCircle2, Palette, Image as ImageIcon, Upload, X, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

interface WheelSection {
    id: string;
    name: string;
    color: string;
    icon: string;
    image_url: string | null;
    is_active: boolean;
    order_index: number;
}

interface WheelQuestion {
    id: string;
    section_id: string;
    text: string;
    image_url: string | null;
    choices: { id: string; text: string; is_correct: boolean; image_url?: string }[];
    points: number;
    is_active: boolean;
}

const PRESET_COLORS = [
    { color: "#f43f5e", name: "وردي" },
    { color: "#8b5cf6", name: "بنفسجي" },
    { color: "#3b82f6", name: "أزرق" },
    { color: "#10b981", name: "أخضر" },
    { color: "#f59e0b", name: "برتقالي" },
    { color: "#ec4899", name: "فوشيا" },
    { color: "#06b6d4", name: "سماوي" },
    { color: "#84cc16", name: "ليموني" },
    { color: "#ef4444", name: "أحمر" },
    { color: "#6366f1", name: "نيلي" },
];

const PRESET_ICONS = ['🧬', '⚗️', '⚡', '�', '🌍', '�', '�', '🔭', '�', '🦠', '🧲', '�'];

// Science-focused icons for wheel sections

export default function AdminWheel() {
    const [sections, setSections] = useState<WheelSection[]>([]);
    const [selectedSection, setSelectedSection] = useState<WheelSection | null>(null);
    const [questions, setQuestions] = useState<WheelQuestion[]>([]);
    const [isLoadingSections, setIsLoadingSections] = useState(true);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isSubmittingSection, setIsSubmittingSection] = useState(false);
    const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'section' | 'question'} | null>(null);
    const [showSectionForm, setShowSectionForm] = useState(false);
    
    // Image upload states
    const [uploadingSectionImage, setUploadingSectionImage] = useState(false);
    const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
    const [sectionImagePreview, setSectionImagePreview] = useState<string | null>(null);
    const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
    const sectionFileInputRef = useRef<HTMLInputElement>(null);
    const questionFileInputRef = useRef<HTMLInputElement>(null);

    const [newSection, setNewSection] = useState<{ name: string; color: string; icon: string; image_url: string | null }>({ 
        name: "", 
        color: PRESET_COLORS[0].color, 
        icon: PRESET_ICONS[0],
        image_url: null 
    });
    const [newQuestion, setNewQuestion] = useState<{ text: string; points: number; image_url: string | null }>({ 
        text: "", 
        points: 10, 
        image_url: null 
    });
    const [choices, setChoices] = useState([
        { id: "1", text: "", is_correct: true, image_url: null as string | null },
        { id: "2", text: "", is_correct: false, image_url: null as string | null },
        { id: "3", text: "", is_correct: false, image_url: null as string | null },
        { id: "4", text: "", is_correct: false, image_url: null as string | null },
    ]);

    useEffect(() => { fetchSections(); }, []);

    useEffect(() => {
        if (selectedSection) fetchQuestions(selectedSection.id);
    }, [selectedSection]);

    const fetchSections = async () => {
        setIsLoadingSections(true);
        try {
            const { data, error } = await supabase.from("wheel_sections").select("*").order("order_index", { ascending: true });
            if (error) throw error;
            setSections(data || []);
            if (data && data.length > 0 && !selectedSection) setSelectedSection(data[0]);
        } catch (err) {
            console.error("Error fetching sections:", err);
            toast.error("فشل تحميل الأقسام");
        } finally {
            setIsLoadingSections(false);
        }
    };

    const fetchQuestions = async (sectionId: string) => {
        setIsLoadingQuestions(true);
        try {
            const { data, error } = await supabase
                .from("wheel_section_questions")
                .select("*")
                .eq("section_id", sectionId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setQuestions(data || []);
        } catch (err) {
            console.error("Error fetching questions:", err);
            toast.error("فشل تحميل الأسئلة");
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    // Image upload function
    const uploadImage = async (file: File, folder: string): Promise<string | null> => {
        try {
            // Create a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('game-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                toast.error('فشل رفع الصورة');
                return null;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('game-images')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error('Error uploading image:', err);
            toast.error('فشل رفع الصورة');
            return null;
        }
    };

    // Handle section image selection
    const handleSectionImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('يجب اختيار ملف صورة');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
            return;
        }

        setUploadingSectionImage(true);
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            setSectionImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to storage
        const imageUrl = await uploadImage(file, 'wheel-sections');
        if (imageUrl) {
            setNewSection(prev => ({ ...prev, image_url: imageUrl }));
            toast.success('تم رفع الصورة بنجاح');
        }
        
        setUploadingSectionImage(false);
    };

    // Handle question image selection
    const handleQuestionImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('يجب اختيار ملف صورة');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
            return;
        }

        setUploadingQuestionImage(true);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setQuestionImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        const imageUrl = await uploadImage(file, 'wheel-questions');
        if (imageUrl) {
            setNewQuestion(prev => ({ ...prev, image_url: imageUrl }));
            toast.success('تم رفع صورة السؤال بنجاح');
        }
        
        setUploadingQuestionImage(false);
    };

    const handleAddSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSection.name.trim()) {
            toast.error("يجب إدخال اسم القسم");
            return;
        }
        setIsSubmittingSection(true);
        try {
            const { error } = await supabase.from("wheel_sections").insert({
                name: newSection.name,
                color: newSection.color,
                icon: newSection.icon,
                image_url: newSection.image_url,
                is_active: true,
                order_index: sections.length,
            });
            if (error) throw error;
            toast.success("تم إضافة القسم بنجاح");
            setNewSection({ name: "", color: PRESET_COLORS[0].color, icon: PRESET_ICONS[0], image_url: null });
            setSectionImagePreview(null);
            setShowSectionForm(false);
            fetchSections();
        } catch (err) {
            console.error("Error adding section:", err);
            toast.error("فشل إضافة القسم");
        } finally {
            setIsSubmittingSection(false);
        }
    };

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSection) {
            toast.error("يجب اختيار قسم أولاً");
            return;
        }
        if (!newQuestion.text.trim()) {
            toast.error("يجب إدخال نص السؤال");
            return;
        }
        const validChoices = choices.filter(c => c.text.trim());
        if (validChoices.length < 2) {
            toast.error("يجب إدخال خيارين على الأقل");
            return;
        }
        if (!validChoices.some(c => c.is_correct)) {
            toast.error("يجب تحديد إجابة صحيحة");
            return;
        }
        setIsSubmittingQuestion(true);
        try {
            const { error } = await supabase.from("wheel_section_questions").insert({
                section_id: selectedSection.id,
                text: newQuestion.text,
                image_url: newQuestion.image_url,
                choices: validChoices,
                points: newQuestion.points,
                is_active: true,
            });
            if (error) throw error;
            toast.success("تم إضافة السؤال بنجاح");
            setNewQuestion({ text: "", points: 10, image_url: null });
            setQuestionImagePreview(null);
            setChoices([
                { id: "1", text: "", is_correct: true, image_url: null },
                { id: "2", text: "", is_correct: false, image_url: null },
                { id: "3", text: "", is_correct: false, image_url: null },
                { id: "4", text: "", is_correct: false, image_url: null },
            ]);
            fetchQuestions(selectedSection.id);
        } catch (err) {
            console.error("Error adding question:", err);
            toast.error("فشل إضافة السؤال");
        } finally {
            setIsSubmittingQuestion(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'section') {
                const { error } = await supabase.from("wheel_sections").delete().eq("id", itemToDelete.id);
                if (error) throw error;
                toast.success("تم حذف القسم بنجاح");
                if (selectedSection?.id === itemToDelete.id) setSelectedSection(null);
                fetchSections();
            } else {
                const { error } = await supabase.from("wheel_section_questions").delete().eq("id", itemToDelete.id);
                if (error) throw error;
                toast.success("تم حذف السؤال بنجاح");
                if (selectedSection) fetchQuestions(selectedSection.id);
            }
        } catch (err) {
            console.error("Error deleting:", err);
            toast.error("فشل الحذف");
        } finally {
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    };

    const toggleActive = async (id: string, currentState: boolean, type: 'section' | 'question') => {
        try {
            if (type === 'section') {
                const { error } = await supabase.from("wheel_sections").update({ is_active: !currentState }).eq("id", id);
                if (error) throw error;
                setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentState } : s));
            } else {
                const { error } = await supabase.from("wheel_section_questions").update({ is_active: !currentState }).eq("id", id);
                if (error) throw error;
                setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !currentState } : q));
            }
            toast.success(currentState ? "تم الإخفاء" : "تم الإظهار");
        } catch (err) {
            console.error("Error toggling:", err);
            toast.error("فشل التحديث");
        }
    };

    const updateChoice = (index: number, field: string, value: any) => {
        const newChoices = [...choices];
        if (field === "is_correct" && value === true) {
            newChoices.forEach(c => c.is_correct = false);
        }
        newChoices[index] = { ...newChoices[index], [field]: value };
        setChoices(newChoices);
    };

    return (
        <div className="space-y-6 animate-fade-in" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">العجلة الدوارة</h1>
                <p className="text-muted-foreground">إدارة أقسام العجلة والأسئلة لكل قسم</p>
            </div>

            {/* Sections Grid */}
            <Card className="border-rose-100">
                <CardHeader className="bg-rose-50/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Palette className="w-6 h-6 text-rose-600" />
                            أقسام العجلة ({sections.length})
                        </CardTitle>
                        <Button onClick={() => setShowSectionForm(!showSectionForm)} variant={showSectionForm ? "secondary" : "default"} size="sm">
                            {showSectionForm ? <X className="w-4 h-4 ml-1" /> : <Plus className="w-4 h-4 ml-1" />}
                            {showSectionForm ? "إلغاء" : "إضافة قسم"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {isLoadingSections ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                        </div>
                    ) : (
                        <>
                            {showSectionForm && (
                                <form onSubmit={handleAddSection} className="mb-6 p-4 bg-slate-50 rounded-xl border">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <Label>اسم القسم</Label>
                                            <Input value={newSection.name} onChange={(e) => setNewSection({ ...newSection, name: e.target.value })} placeholder="مثال: الأحياء" className="text-right" />
                                        </div>
                                        <div>
                                            <Label>اللون</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {PRESET_COLORS.map((c) => (
                                                    <button key={c.color} type="button" onClick={() => setNewSection({ ...newSection, color: c.color })} className={`w-8 h-8 rounded-full border-2 ${newSection.color === c.color ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.color }} title={c.name} />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label>الأيقونة</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {PRESET_ICONS.map((icon) => (
                                                    <button key={icon} type="button" onClick={() => setNewSection({ ...newSection, icon })} className={`w-10 h-10 text-xl rounded-lg border-2 ${newSection.icon === icon ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}>{icon}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label>صورة القسم (اختياري)</Label>
                                            <div className="flex gap-2 mt-1">
                                                <input
                                                    type="file"
                                                    ref={sectionFileInputRef}
                                                    onChange={handleSectionImageSelect}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => sectionFileInputRef.current?.click()}
                                                    disabled={uploadingSectionImage}
                                                    className="flex-1"
                                                >
                                                    {uploadingSectionImage ? (
                                                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4 ml-1" />
                                                    )}
                                                    {sectionImagePreview || newSection.image_url ? 'تغيير الصورة' : 'رفع صورة'}
                                                </Button>
                                                {(sectionImagePreview || newSection.image_url) && (
                                                    <div className="relative w-10 h-10">
                                                        <img
                                                            src={sectionImagePreview || newSection.image_url || ''}
                                                            alt="Preview"
                                                            className="w-10 h-10 object-cover rounded-lg border"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSectionImagePreview(null);
                                                                setNewSection(prev => ({ ...prev, image_url: null }));
                                                            }}
                                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={isSubmittingSection || uploadingSectionImage} className="w-full bg-rose-500 hover:bg-rose-600">
                                        {isSubmittingSection ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
                                        إضافة القسم
                                    </Button>
                                </form>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {sections.map((section) => (
                                    <div key={section.id} onClick={() => setSelectedSection(section)} className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedSection?.id === section.id ? 'border-rose-500 shadow-lg shadow-rose-500/20' : 'border-slate-200 hover:border-rose-300'}`}>
                                        <div className="text-center">
                                            {section.image_url ? (
                                                <div className="relative w-full h-16 mb-2">
                                                    <img 
                                                        src={section.image_url} 
                                                        alt={section.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-2xl bg-white/80 rounded-full p-1">{section.icon}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-4xl mb-2">{section.icon}</div>
                                            )}
                                            <div className="font-bold text-sm">{section.name}</div>
                                            <div className="flex items-center justify-center gap-2 mt-2">
                                                <Switch checked={section.is_active} onCheckedChange={() => toggleActive(section.id, section.is_active, 'section')} onClick={(e) => e.stopPropagation()} className="data-[state=checked]:bg-green-500" />
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); setItemToDelete({ id: section.id, type: 'section' }); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="absolute top-2 left-2 w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Questions Section */}
            {selectedSection && (
                <Card className="border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{selectedSection.icon}</span>
                                <div>
                                    <CardTitle className="text-lg">أسئلة قسم: {selectedSection.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{questions.length} سؤال</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Add Question Form */}
                        <form onSubmit={handleAddQuestion} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>نص السؤال</Label>
                                    <Input value={newQuestion.text} onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })} placeholder="اكتب السؤال هنا..." className="text-right" />
                                </div>
                                <div>
                                    <Label>صورة السؤال (اختياري)</Label>
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            type="file"
                                            ref={questionFileInputRef}
                                            onChange={handleQuestionImageSelect}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => questionFileInputRef.current?.click()}
                                            disabled={uploadingQuestionImage}
                                            className="flex-1"
                                        >
                                            {uploadingQuestionImage ? (
                                                <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                                            ) : (
                                                <ImageIcon className="w-4 h-4 ml-1" />
                                            )}
                                            {questionImagePreview || newQuestion.image_url ? 'تغيير الصورة' : 'رفع صورة'}
                                        </Button>
                                        {(questionImagePreview || newQuestion.image_url) && (
                                            <div className="relative w-10 h-10">
                                                <img
                                                    src={questionImagePreview || newQuestion.image_url || ''}
                                                    alt="Preview"
                                                    className="w-10 h-10 object-cover rounded-lg border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setQuestionImagePreview(null);
                                                        setNewQuestion(prev => ({ ...prev, image_url: null }));
                                                    }}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label>النقاط</Label>
                                <div className="flex gap-2">
                                    {[10, 20, 30].map((points) => (
                                        <button key={points} type="button" onClick={() => setNewQuestion({ ...newQuestion, points })} className={`px-4 py-2 rounded-lg border ${newQuestion.points === points ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-slate-200'}`}>
                                            {points}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>الخيارات (حدد الإجابة الصحيحة)</Label>
                                {choices.map((choice, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <button type="button" onClick={() => updateChoice(idx, "is_correct", true)} className={`w-8 h-8 rounded-full flex items-center justify-center ${choice.is_correct ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <Input value={choice.text} onChange={(e) => updateChoice(idx, "text", e.target.value)} placeholder={`الخيار ${idx + 1}`} className="flex-1 text-right" />
                                    </div>
                                ))}
                            </div>
                            <Button type="submit" disabled={isSubmittingQuestion || uploadingQuestionImage} className="w-full bg-rose-500 hover:bg-rose-600">
                                {isSubmittingQuestion ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
                                إضافة سؤال للقسم
                            </Button>
                        </form>

                        {/* Questions List */}
                        {isLoadingQuestions ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                                <CircleDot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>لا توجد أسئلة في هذا القسم</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3">
                                                {q.image_url && (
                                                    <img 
                                                        src={q.image_url} 
                                                        alt="Question" 
                                                        className="w-16 h-16 object-cover rounded-lg border"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium mb-1">{idx + 1}. {q.text}</div>
                                                    <div className="flex gap-2 text-sm text-muted-foreground">
                                                        <Badge variant="outline">{q.points} نقطة</Badge>
                                                        <span>{q.choices?.length || 0} خيارات</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q.id, q.is_active, 'question')} />
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { setItemToDelete({ id: q.id, type: 'question' }); setDeleteDialogOpen(true); }}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من حذف {itemToDelete?.type === 'section' ? 'هذا القسم' : 'هذا السؤال'}؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
