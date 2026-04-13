import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getCentralExamConfig, updateCentralExamConfig, toggleCentralExam, CentralExamConfig } from "@/services/centralExamService";
import { SaudiLoader } from "@/components/ui/SaudiLoader";

export default function AdminCentralExamSettings() {
  const [config, setConfig] = useState<CentralExamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await getCentralExamConfig();
      if (data) {
        setConfig(data);
      } else {
        // If no config found (DB migration not applied yet or empty), show a prompt
        toast.error("لم يتم العثور على إعدادات، تأكد من تطبيق المايجريشن الخاص بقاعدة البيانات.");
      }
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء جلب الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!config) return;
    try {
      const success = await toggleCentralExam(config.id, checked);
      if (success) {
        setConfig({ ...config, is_active: checked });
        toast.success(checked ? "تم تفعيل الاختبار المركزي بنجاح 🚀" : "تم تعطيل الاختبار المركزي");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    
    setSaving(true);
    try {
      const success = await updateCentralExamConfig({
        id: config.id,
        title: config.title,
        description: config.description,
        grade: config.grade,
        subject: config.subject
      });
      
      if (success) {
        toast.success("تم حفظ التعديلات بنجاح ✨", {
          className: "bg-green-500 text-white border-none",
        });
      } else {
        toast.error("فشل الحفظ، حاول مرة أخرى.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><SaudiLoader /></div>;
  if (!config) return <div className="p-10 text-center text-red-500">حدث خطأ في قراءة قاعدة البيانات</div>;

  return (
    <div className="max-w-3xl animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {/* Toggle Head */}
        <div className={`p-6 md:p-8 flex items-center justify-between border-b ${config.is_active ? 'bg-primary/5' : 'bg-slate-50/50'}`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-3">
              حالة الاختبار
              {config.is_active ? (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-300"></span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">تفعيل أو تعطيل ظهور الاختبار للطلاب في لوحة التحكم.</p>
          </div>
          <Switch 
            checked={config.is_active} 
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-green-500" 
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-bold text-slate-700">العنوان البارز للاختبار</Label>
            <Input
              id="title"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="h-12 text-lg rounded-xl focus-visible:ring-primary/20"
              placeholder="مثال: الاختبار المركزي"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc" className="text-base font-bold text-slate-700">وصف الاختبار (يظهر للطالب)</Label>
            <Textarea
              id="desc"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="resize-none h-24 rounded-xl focus-visible:ring-primary/20"
              placeholder="وصف مشوق للاختبار..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="grade" className="font-bold text-slate-700">المرحلة / الصف</Label>
              <Input
                id="grade"
                value={config.grade}
                onChange={(e) => setConfig({ ...config, grade: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject" className="font-bold text-slate-700">المادة</Label>
              <Input
                id="subject"
                value={config.subject}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="h-12 px-8 text-lg rounded-xl btn-primary-gradient shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all w-full md:w-auto"
            >
              {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
