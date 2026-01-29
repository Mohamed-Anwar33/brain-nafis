import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const [questionCount, setQuestionCount] = useState(20);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [activeQuestionsCount, setActiveQuestionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch current settings
        const { data: settings } = await supabase
          .from("settings")
          .select("exam_question_count, notification_email")
          .eq("id", 1)
          .single();

        if (settings) {
          setQuestionCount(settings.exam_question_count);
          setNotificationEmail(settings.notification_email || "");
        }

        // Fetch active questions count
        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("active", true);

        setActiveQuestionsCount(count || 0);
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    // Validate
    if (questionCount < 5 || questionCount > 100) {
      toast.error("عدد الأسئلة يجب أن يكون بين 5 و 100");
      return;
    }

    if (questionCount > activeQuestionsCount) {
      toast.error(`عدد الأسئلة يجب ألا يتجاوز عدد الأسئلة النشطة (${activeQuestionsCount})`);
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("settings")
        .update({
          exam_question_count: questionCount,
          notification_email: notificationEmail
        })
        .eq("id", 1);

      if (error) throw error;

      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground mt-2">ضبط إعدادات الاختبار</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>عدد أسئلة الاختبار</CardTitle>
              <CardDescription>
                حدد عدد الأسئلة التي سيتم سحبها عشوائياً لكل اختبار
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 rounded-xl bg-secondary">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">ملاحظة:</span> عدد الأسئلة النشطة الحالي هو{" "}
              <span className="font-bold text-primary">{activeQuestionsCount}</span> سؤال.
              يجب أن يكون عدد أسئلة الاختبار أقل أو يساوي هذا العدد.
            </p>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">عدد الأسئلة</Label>
              <Input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(100, Math.max(5, parseInt(e.target.value) || 5)))}
                className="w-20 h-10 text-center font-bold"
                min={5}
                max={100}
              />
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={(value) => setQuestionCount(value[0])}
              min={5}
              max={Math.min(100, Math.max(5, activeQuestionsCount))}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>5</span>
              <span>{Math.min(100, activeQuestionsCount)}</span>
            </div>
          </div>

          {/* Warning */}
          {questionCount > activeQuestionsCount && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                ⚠️ عدد الأسئلة المحدد ({questionCount}) أكبر من عدد الأسئلة النشطة ({activeQuestionsCount}).
                يرجى إضافة المزيد من الأسئلة أو تقليل العدد المطلوب.
              </p>
            </div>
          )}

          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <SettingsIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">البريد الإلكتروني للإشعارات</CardTitle>
                <CardDescription>
                  سيتم إرسال نتائج الاختبارات إلى هذا البريد
                </CardDescription>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-email">البريد الإلكتروني</Label>
              <Input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="example@school.com"
                className="max-w-md"
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || questionCount > activeQuestionsCount}
            className="w-full h-12 text-base font-semibold rounded-xl btn-primary-gradient"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
