import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Save, Loader2, HelpCircle, Mail, AlertTriangle, CheckCircle2, FileQuestion, Gamepad2, Timer, Puzzle, Layers, Key, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSettings() {
  const [questionCount, setQuestionCount] = useState(20);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [activeQuestionsCount, setActiveQuestionsCount] = useState(0);

  // New Game Settings
  const [matchingPairs, setMatchingPairs] = useState(6);
  const [speedDuration, setSpeedDuration] = useState(60);
  const [orderingLimit, setOrderingLimit] = useState(10);
  const [activeOrderingCount, setActiveOrderingCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from("settings")
          .select("exam_question_count")
          .eq("id", 1)
          .single();

        if (settings) setQuestionCount(settings.exam_question_count);

        // Fetch app_settings
        const { data: appSettings } = await supabase
          .from("app_settings")
          .select("key, value");

        if (appSettings) {
          appSettings.forEach(setting => {
            if (setting.key === 'admin_email') setNotificationEmail(setting.value);
            if (setting.key === 'matching_pairs_count') setMatchingPairs(parseInt(setting.value) || 6);
            if (setting.key === 'speed_challenge_duration') setSpeedDuration(parseInt(setting.value) || 60);
            if (setting.key === 'ordering_questions_limit') setOrderingLimit(parseInt(setting.value) || 10);
          });
        }

        // Fetch counts
        const { count: qCount } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("active", true);
        setActiveQuestionsCount(qCount || 0);

        const { count: oCount } = await supabase.from("ordering_game_questions").select("*", { count: "exact", head: true }).eq("is_active", true);
        setActiveOrderingCount(oCount || 0);

      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (questionCount < 1) {
      toast.error("يجب اختيار سؤال واحد على الأقل للاختبار");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Save core settings (Syncing legacy table + new logic)
      const { error: settingsError } = await supabase
        .from("settings")
        .update({
          exam_question_count: questionCount,
          notification_email: notificationEmail
        })
        .eq("id", 1);

      if (settingsError) throw settingsError;

      // 2. Save app_settings keys
      // Robust strategy: Delete potentially duplicate keys first, then insert fresh.
      const keysToUpdate = ["admin_email", "matching_pairs_count", "speed_challenge_duration", "ordering_questions_limit"];

      const { error: deleteError } = await supabase
        .from("app_settings")
        .delete()
        .in("key", keysToUpdate);

      if (deleteError) console.warn("Cleanup error (ignorable):", deleteError);

      const upsertData = [
        { key: "admin_email", value: notificationEmail },
        { key: "matching_pairs_count", value: matchingPairs.toString() },
        { key: "speed_challenge_duration", value: speedDuration.toString() },
        { key: "ordering_questions_limit", value: orderingLimit.toString() }
      ];

      const { error: insertError } = await supabase
        .from("app_settings")
        .insert(upsertData);

      if (insertError) throw insertError;

      toast.success("تم تحديث وحفظ جميع الإعدادات بنجاح");

    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!notificationEmail) {
      toast.error("يرجى إدخال البريد الإلكتروني أولاً");
      return;
    }

    setIsTesting(true);

    try {
      // First, save current settings
      await handleSave();

      // Create a test attempt in database temporarily
      const { data: testAttempt, error: attemptError } = await supabase
        .from("attempts")
        .insert({
          student_name: "اختبار النظام",
          score: 18,
          question_count: 20,
          total_penalty: 3,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          teacher_email_sent: false
        })
        .select()
        .single();

      if (attemptError || !testAttempt) {
        throw new Error("فشل إنشاء اختبار تجريبي");
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke("exam-finish", {
        body: { attempt_id: testAttempt.id }
      });

      // Clean up test attempt
      await supabase.from("attempts").delete().eq("id", testAttempt.id);

      console.log("Test email result:", data);

      if (error) {
        console.error("Test email error:", error);
        toast.error(`فشل الاختبار: ${error.message}`);
        return;
      }

      // Check email status from response
      if (data?.email_status === "sent_gmail_smtp") {
        toast.success("✅ تم إرسال البريد التجريبي بنجاح عبر Gmail! تحقق من صندوق الوارد.");
      } else if (data?.email_status?.startsWith("skipped")) {
        toast.warning(`⚠️ تم تخطي الإرسال: ${data.debug || 'تحقق من الإعدادات'}`);
      } else {
        toast.error(`❌ فشل الإرسال: ${data?.debug || 'خطأ غير معروف'}`);
      }

    } catch (err: any) {
      console.error("Error testing email:", err);
      toast.error(`حدث خطأ: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          <p className="text-muted-foreground animate-pulse">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إعدادات النظام</h1>
          <p className="text-gray-500">تحكم كامل في الاختبارات والألعاب</p>
        </div>
      </div>

      <Tabs defaultValue="exam" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-14 p-1 bg-slate-100/80 rounded-2xl mb-8">
          <TabsTrigger value="exam" className="rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
            <FileQuestion className="w-4 h-4 ml-2" /> الاختبار الرئيسي
          </TabsTrigger>
          <TabsTrigger value="games" className="rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
            <Gamepad2 className="w-4 h-4 ml-2" /> إعدادات الألعاب
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
            <Mail className="w-4 h-4 ml-2" /> الإشعارات
          </TabsTrigger>
        </TabsList>

        {/* --- Exam Settings --- */}
        <TabsContent value="exam" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/40 overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileQuestion className="w-6 h-6" /></div>
                <div>
                  <CardTitle>نظام الاختبار العام</CardTitle>
                  <CardDescription>عدد الأسئلة العشوائية لكل محاولة طالب</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-bold text-slate-800">إجمالي الأسئلة في بنك الأسئلة</p>
                    <p className="text-xs text-slate-500">الأسئلة النشطة فقط</p>
                  </div>
                </div>
                <span className="text-3xl font-black text-slate-800 bg-white px-6 py-2 rounded-xl border">{activeQuestionsCount}</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label>عدد الأسئلة لكل اختبار</Label>
                  <span className="text-2xl font-bold text-primary">{questionCount}</span>
                </div>
                <Slider value={[questionCount]} onValueChange={(val) => setQuestionCount(val[0])} min={5} max={100} step={1} className="py-2" />
                <div className="flex gap-2 justify-center pt-2">
                  {[10, 20, 30, 50].map(val => (
                    <Button key={val} variant="ghost" size="sm" onClick={() => setQuestionCount(val)} className="rounded-full px-4 border">{val}</Button>
                  ))}
                </div>
                {questionCount > activeQuestionsCount && (
                  <div className="flex gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>تنبيه: العدد المطلوب أكبر من المتاح. سيظهر للطالب أقصى عدد ممكن ({activeQuestionsCount}) حتى إضافة المزيد.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Games Settings --- */}
        <TabsContent value="games" className="grid gap-6 md:grid-cols-2">
          {/* Matching Game */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-lg">لعبة المطابقة</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>عدد الأزواج في الجولة</Label>
                  <span className="font-bold text-purple-600">{matchingPairs}</span>
                </div>
                <Slider value={[matchingPairs]} onValueChange={(v) => setMatchingPairs(v[0])} min={3} max={12} step={1} />
                <p className="text-xs text-muted-foreground">ينصح بـ 6 أزواج للشاشات الصغيرة و 8-10 للكبيرة.</p>
              </div>
            </CardContent>
          </Card>

          {/* Speed Challenge */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-red-500" />
                <CardTitle className="text-lg">تحدي السرعة</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>مدة التحدي (ثانية)</Label>
                  <span className="font-bold text-red-600">{speedDuration}</span>
                </div>
                <Slider value={[speedDuration]} onValueChange={(v) => setSpeedDuration(v[0])} min={30} max={300} step={10} />
                <div className="flex gap-2 justify-end">
                  {[60, 90, 120].map(val => (
                    <Button key={val} variant="ghost" size="sm" onClick={() => setSpeedDuration(val)} className="h-6 text-xs">{val} ث</Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ordering Puzzle */}
          <Card className="border-0 shadow-md md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-lg">لغز الترتيب</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>عدد الألغاز (الأسئلة)</Label>
                  <span className="font-bold text-emerald-600">{orderingLimit}</span>
                </div>
                <Slider value={[orderingLimit]} onValueChange={(v) => setOrderingLimit(v[0])} min={1} max={50} step={1} />
                <p className="text-xs text-muted-foreground">عدد الألغاز المتاحة حالياً: {activeOrderingCount}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Notifications --- */}
        <TabsContent value="notifications">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Mail className="w-6 h-6" /></div>
                <div>
                  <CardTitle>تنبيهات البريد الإلكتروني</CardTitle>
                  <CardDescription>إرسال تقارير النتائج تلقائياً</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>البريد الإلكتروني للمسؤول</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="pr-10 h-12"
                    placeholder="example@school.com"
                  />
                </div>
                <p className="text-xs text-slate-500">سيتم إرسال نتيجة كل طالب فور انتهائه من الاختبار إلى هذا البريد.</p>
              </div>


              <div className="pt-6 border-t">
                <Button
                  onClick={handleTestEmail}
                  disabled={isTesting || !notificationEmail}
                  variant="outline"
                  className="w-full h-12 border-2 border-primary/30 hover:bg-primary/5"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 ml-2" />
                      اختبار إرسال البريد الإلكتروني
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 text-center mt-2">
                  سيتم إرسال بريد تجريبي إلى العنوان المدخل أعلاه
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <div className="sticky bottom-4 z-50">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-14 text-lg font-bold rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all bg-gradient-to-r from-primary to-indigo-600"
        >
          {isSaving ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <Save className="w-5 h-5 ml-2" />}
          حفظ كافة التغييرات
        </Button>
      </div>
    </div>
  );
}
