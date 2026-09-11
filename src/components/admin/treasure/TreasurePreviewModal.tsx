import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPreviewResponse } from "@/types/treasure";
import {
  Sparkles,
  MapPin,
  HelpCircle,
  Video,
  Eye,
  CheckCircle2,
  Clock,
  Key,
  DoorClosed,
} from "lucide-react";

interface TreasurePreviewModalProps {
  previewData: AdminPreviewResponse | null;
  open: boolean;
  onClose: () => void;
}

export function TreasurePreviewModal({
  previewData,
  open,
  onClose,
}: TreasurePreviewModalProps) {
  const [activeStep, setActiveStep] = useState<string>("1");

  if (!previewData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <DialogTitle className="text-xl font-bold">
                معاينة محاكاة المشرف: {previewData.adventure_title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={previewData.is_draft ? "outline" : "default"}>
                {previewData.is_draft ? "نسخة مسودة (Draft)" : "نسخة معتمدة (Published)"}
              </Badge>
              <Badge variant="secondary">الإصدار: v{previewData.version_number}</Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Narrative & Environment Configuration Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border text-sm">
          <div className="md:col-span-2 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>تلميح اللغز السري (Story Clue):</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {previewData.story_clue}
            </p>
          </div>

          <div className="space-y-1.5 border-r pr-4">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>الإعدادات البيئية:</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>المظهر: {previewData.environment_config.theme}</div>
              <div>موقع المفتاح: {previewData.environment_config.key_node}</div>
              <div>الوقت المتاح: {previewData.environment_config.time_limit_seconds} ثانية</div>
            </div>
          </div>
        </div>

        {/* Challenge Tabs */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              أختام البوابة المقفلة ({previewData.challenges.length} تحديات)
            </h4>
            <Badge variant="outline" className="text-xs">
              إجمالي التحديات: {previewData.challenges.length}
            </Badge>
          </div>

          <Tabs value={activeStep} onValueChange={setActiveStep} className="w-full">
            <TabsList className="flex flex-wrap gap-1 w-full bg-muted/40 p-1 rounded-xl h-auto">
              {previewData.challenges.map((ch, idx) => (
                <TabsTrigger
                  key={ch.step}
                  value={String(ch.step)}
                  className="flex-1 min-w-[120px] text-xs py-2"
                >
                  الختم {ch.step}: {ch.challenge_type === "mcq" ? "اختيار متعدد" : ch.challenge_type === "ordering" ? "ترتيب تسلسلي" : "نقطة فعالة"}
                </TabsTrigger>
              ))}
            </TabsList>

            {previewData.challenges.map((ch) => (
              <TabsContent key={ch.step} value={String(ch.step)} className="space-y-4 pt-3">
                <div className="border rounded-xl p-5 bg-card space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Badge variant="outline" className="font-mono">
                      الختم {ch.step} من {previewData.challenges.length}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-semibold">
                      النوع: {ch.challenge_type.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-lg text-foreground">{ch.prompt}</h5>
                    {ch.image_url && (
                      <div className="max-w-md mx-auto aspect-video rounded-lg overflow-hidden border">
                        <img
                          src={ch.image_url}
                          alt="Challenge"
                          className="w-full h-full object-contain bg-black/5"
                        />
                      </div>
                    )}
                  </div>

                  {/* Challenge Specific Preview */}
                  {ch.challenge_type === "mcq" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {ch.content.choices?.map((choice) => {
                        const isCorrect =
                          ch.solution_preview.correct_choice_id === choice.id;
                        return (
                          <div
                            key={choice.id}
                            className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
                              isCorrect
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 font-bold ring-1 ring-emerald-400"
                                : "bg-muted/20 border-border text-foreground"
                            }`}
                          >
                            <span>{choice.text}</span>
                            {isCorrect && (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                الإجابة الصحيحة
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {ch.challenge_type === "ordering" && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-muted-foreground">
                        الترتيب المعتمد للحل:
                      </div>
                      <div className="flex flex-col gap-2">
                        {ch.solution_preview.correct_order?.map(
                          (orderId: string, idx: number) => {
                            const item = ch.content.items?.find((i) => i.id === orderId);
                            return (
                              <div
                                key={orderId}
                                className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm flex items-center gap-3"
                              >
                                <Badge className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
                                  {idx + 1}
                                </Badge>
                                <span className="font-medium text-foreground">
                                  {item?.text || orderId}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {ch.challenge_type === "hotspot" && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-semibold text-muted-foreground">
                        معاينة منطقة الاستهداف المقبولة:
                      </div>
                      <div className="relative max-w-lg mx-auto aspect-video rounded-lg overflow-hidden border bg-muted/20">
                        {ch.image_url && (
                          <img
                            src={ch.image_url}
                            alt="Hotspot Diagram"
                            className="w-full h-full object-contain"
                          />
                        )}
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-500/30 flex items-center justify-center shadow-lg"
                          style={{
                            left: `${ch.solution_preview.target_x_percent}%`,
                            top: `${ch.solution_preview.target_y_percent}%`,
                            width: `${(ch.solution_preview.tolerance_radius_percent || 8) * 2}%`,
                            height: `${(ch.solution_preview.tolerance_radius_percent || 8) * 2}%`,
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
                        </div>
                      </div>
                      <div className="text-center font-mono text-xs text-muted-foreground">
                        المركز: X={ch.solution_preview.target_x_percent}% , Y=
                        {ch.solution_preview.target_y_percent}% | نصف القطر=
                        {ch.solution_preview.tolerance_radius_percent}%
                      </div>
                    </div>
                  )}

                  {/* Explanations & Videos */}
                  {(ch.wrong_reason || ch.explanation_url) && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs space-y-2 mt-3">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" />
                        شرح التعزيز عند الخطأ (Explanation Modal Preview):
                      </div>
                      {ch.wrong_reason && <p className="text-muted-foreground">{ch.wrong_reason}</p>}
                      {ch.explanation_url && (
                        <div className="flex items-center gap-1 text-primary font-mono truncate">
                          <Video className="w-3.5 h-3.5" /> {ch.explanation_url}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            إغلاق المعاينة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
