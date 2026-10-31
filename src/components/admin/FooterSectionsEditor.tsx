import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const settingKeys = [
  "footer_topic_teacher_title",
  "footer_topic_teacher_body",
  "footer_topic_platform_title",
  "footer_topic_platform_body",
] as const;

type FooterContent = Record<(typeof settingKeys)[number], string>;

const defaults: FooterContent = {
  footer_topic_teacher_title: "عن المعلم أو المعلمة",
  footer_topic_teacher_body: "",
  footer_topic_platform_title: "عن براين ساينس",
  footer_topic_platform_body: "",
};

export function FooterSectionsEditor() {
  const [content, setContent] = useState<FooterContent>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from("app_settings").select("key,value").in("key", [...settingKeys]);
      if (error) {
        console.error("Could not load footer sections:", error);
        return;
      }
      setContent((current) => ({ ...current, ...Object.fromEntries((data || []).map((row) => [row.key, row.value || ""])) }));
    })();
  }, []);

  const setField = (key: keyof FooterContent, value: string) => setContent((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      settingKeys.map((key) => ({ key, value: content[key].trim() })),
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      console.error("Could not save footer sections:", error);
      toast.error("تعذر حفظ النصوص التعريفية");
      return;
    }
    toast.success("تم حفظ النصوص، وستظهر أسفل الصفحات");
    window.dispatchEvent(new Event("footer-content-updated"));
  };

  return (
    <Card className="border-indigo-200 shadow-sm">
      <CardHeader>
        <CardTitle>نصوص تعريفية أسفل الصفحات</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">اكتبي نبذة عن المعلم أو المعلمة، ثم تعريفًا بمنصة براين ساينس. تظهر النصوص أسفل الصفحات، وتُخفى أثناء الاختبارات.</p>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border bg-slate-50/70 p-4">
          <Label htmlFor="footer-teacher-title">عنوان القطعة الأولى</Label>
          <Input id="footer-teacher-title" value={content.footer_topic_teacher_title} onChange={(event) => setField("footer_topic_teacher_title", event.target.value)} placeholder="عن المعلم أو المعلمة" />
          <Label htmlFor="footer-teacher-body">النص التعريفي</Label>
          <Textarea id="footer-teacher-body" value={content.footer_topic_teacher_body} onChange={(event) => setField("footer_topic_teacher_body", event.target.value)} placeholder="الخبرات، التخصص، ورسالة المعلم..." className="min-h-32" />
        </section>
        <section className="space-y-3 rounded-xl border bg-slate-50/70 p-4">
          <Label htmlFor="footer-platform-title">عنوان القطعة الثانية</Label>
          <Input id="footer-platform-title" value={content.footer_topic_platform_title} onChange={(event) => setField("footer_topic_platform_title", event.target.value)} placeholder="عن براين ساينس" />
          <Label htmlFor="footer-platform-body">النص التعريفي</Label>
          <Textarea id="footer-platform-body" value={content.footer_topic_platform_body} onChange={(event) => setField("footer_topic_platform_body", event.target.value)} placeholder="نبذة عن المنصة وأهدافها..." className="min-h-32" />
        </section>
        <div className="md:col-span-2"><Button type="button" onClick={() => void save()} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "جارٍ الحفظ..." : "حفظ النصوص التعريفية"}</Button></div>
      </CardContent>
    </Card>
  );
}
