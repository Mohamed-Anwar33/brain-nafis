import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createCentralExamQuestion, updateCentralExamQuestion, CentralExamQuestion, CentralExamChoice } from "@/services/centralExamService";

interface Props {
  question: CentralExamQuestion | null;
  onComplete: () => void;
}

export function CentralExamQuestionForm({ question, onComplete }: Props) {
  const [text, setText] = useState(question?.text || "");
  const [imageUrl, setImageUrl] = useState(question?.image_url || "");
  const [active, setActive] = useState(question?.active ?? true);
  const [orderIndex, setOrderIndex] = useState(question?.order_index || 0);
  
  const [choices, setChoices] = useState<Partial<CentralExamChoice>[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(question?.image_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (question && question.choices) {
      setChoices(question.choices);
    } else {
      setChoices([
        { text: "", is_correct: true },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ]);
    }
  }, [question]);

  const addChoice = () => {
    setChoices([...choices, { text: "", is_correct: false }]);
  };

  const removeChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  const updateChoice = (index: number, field: keyof CentralExamChoice, value: any) => {
    const newChoices = [...choices];
    if (field === "is_correct" && value === true) {
      // Only one correct choice
      newChoices.forEach(c => c.is_correct = false);
    }
    newChoices[index] = { ...newChoices[index], [field]: value };
    setChoices(newChoices);
  };

  // Image upload function
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `central-exam/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('فشل رفع الصورة');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(filePath);
      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('فشل رفع الصورة');
      return null;
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingImage(true);
    
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    const url = await uploadImage(file);
    if (url) {
      setImageUrl(url);
      toast.success('تم رفع الصورة بنجاح');
    }
    
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("يرجى إدخال نص السؤال");
      return;
    }
    
    const validChoices = choices.filter(c => c.text?.trim());
    if (validChoices.length < 2) {
      toast.error("يرجى إدخال خيارين على الأقل");
      return;
    }
    
    if (!validChoices.some(c => c.is_correct)) {
      toast.error("يرجى تحديد الإجابة الصحيحة");
      return;
    }

    setLoading(true);
    try {
      if (question?.id) {
        await updateCentralExamQuestion(question.id, {
          text,
          image_url: imageUrl || null,
          active,
          order_index: orderIndex
        }, validChoices);
        toast.success("تم تحديث السؤال بنجاح");
      } else {
        await createCentralExamQuestion({
          text,
          image_url: imageUrl || null,
          active,
          order_index: orderIndex
        }, validChoices as any);
        toast.success("تم إضافة السؤال بنجاح");
      }
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حفظ السؤال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>التفعيل</Label>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm text-slate-600">{active ? 'السؤال نشط ومتاح للطلاب' : 'السؤال مخفي'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>نص السؤال</Label>
          <Textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="اكتب نص السؤال هنا..."
            className="min-h-[100px] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>صورة السؤال (اختياري)</Label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex-1"
              >
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-1" />
                )}
                {imagePreview || imageUrl ? 'تغيير الصورة' : 'رفع صورة'}
              </Button>
              {(imagePreview || imageUrl) && (
                <div className="relative w-10 h-10">
                  <img
                    src={imagePreview || imageUrl || ''}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl('');
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>ترتيب الظهور (اختياري)</Label>
            <Input 
              type="number"
              value={orderIndex} 
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-bold">الخيارات</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChoice} className="gap-1">
            <Plus className="w-4 h-4" /> إضافة خيار
          </Button>
        </div>

        <div className="space-y-3">
          {choices.map((choice, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${choice.is_correct ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="pt-2">
                <Switch 
                  checked={choice.is_correct} 
                  onCheckedChange={(v) => updateChoice(idx, "is_correct", v)} 
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Input 
                  value={choice.text || ""} 
                  onChange={(e) => updateChoice(idx, "text", e.target.value)} 
                  placeholder={`الخيار ${idx + 1}`}
                  className={choice.is_correct ? 'border-green-300 focus-visible:ring-green-500' : ''}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(idx)} className="text-red-500 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onComplete}>إلغاء</Button>
        <Button type="submit" disabled={loading} className="btn-primary-gradient px-8">
          {loading ? "جاري الحفظ..." : "حفظ السؤال"}
        </Button>
      </div>
    </form>
  );
}
