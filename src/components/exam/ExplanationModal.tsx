import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseExplanationUrl, extractUrlFromText } from "@/lib/video-parser";
import { ExternalLink, PlayCircle, HelpCircle, Video, BookOpen, Sparkles } from "lucide-react";

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionText: string;
  wrongReason?: string | null;
  explanationUrl?: string | null;
}

export function ExplanationModal({
  isOpen,
  onClose,
  questionText,
  wrongReason,
  explanationUrl,
}: ExplanationModalProps) {
  // If explanationUrl is not provided, try to extract one from wrongReason
  const effectiveUrl = explanationUrl || extractUrlFromText(wrongReason);
  const media = parseExplanationUrl(effectiveUrl);

  // Clean wrongReason text if it contains raw url that was already extracted
  const cleanWrongReason = wrongReason
    ? wrongReason.replace(/https?:\/\/[^\s]+/g, "").trim()
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white/95 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-3xl" dir="rtl">
        <DialogHeader className="space-y-3 text-right">
          <div className="flex items-center gap-2 text-primary font-black text-xl">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <PlayCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">
              شرح وتوضيح السؤال
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="font-bold text-slate-900 ml-1">السؤال:</span> {questionText}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Wrong reason explanation if available */}
          {(cleanWrongReason || (wrongReason && !media)) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-right space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>توضيح الإجابة الصحيحة:</span>
              </div>
              <p className="text-sm sm:text-base text-amber-950 leading-relaxed font-medium">
                {cleanWrongReason || wrongReason}
              </p>
            </div>
          )}

          {/* Media Player or Embed */}
          {media && media.isValid && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Video className="w-4 h-4 text-primary" />
                  <span>
                    {media.type === 'youtube'
                      ? 'فيديو الشرح (يوتيوب)'
                      : media.type === 'vimeo'
                      ? 'فيديو الشرح (فيميو)'
                      : media.type === 'direct_video'
                      ? 'مقطع الشرح التعليمي'
                      : `رابط الشرح (${media.platformName})`}
                  </span>
                </div>
                <a
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-xl"
                >
                  <span>فتح في نافذة جديدة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Embed Container for YouTube / Vimeo / Direct Video */}
              {(media.type === 'youtube' || media.type === 'vimeo' || media.type === 'direct_video') && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video flex items-center justify-center relative shadow-inner">
                  {media.type === 'youtube' && (
                    <iframe
                      src={media.embedUrl}
                      title="شرح السؤال"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}

                  {media.type === 'vimeo' && (
                    <iframe
                      src={media.embedUrl}
                      title="شرح السؤال"
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}

                  {media.type === 'direct_video' && (
                    <video
                      src={media.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    >
                      متصفحك لا يدعم تشغيل الفيديو مباشرة.
                    </video>
                  )}
                </div>
              )}

              {/* Web link / Educational platform card (Madrasati / Ain / Saudi Educational Platform) */}
              {media.type === 'web_link' && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 text-right space-y-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h4 className="font-black text-slate-900 text-base">
                          {media.platformName}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        يتوفر شرح وافٍ لهذا الدرس عبر المنصة التعليمية السعودية الرسمية. يمكنك الانتقال مباشرة لمشاهدة محتوى الدرس كاملاً.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-100">
                    <p className="text-xs text-slate-500 font-mono truncate max-w-full sm:max-w-xs" dir="ltr">
                      {media.url}
                    </p>
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-black hover:opacity-95 transition-all text-sm shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95"
                    >
                      <span>الانتقال لشرح الدرس الآن 🎓</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* If no valid media but link exists */}
          {(!media || !media.isValid) && effectiveUrl && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-right flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-blue-900 text-sm">رابط الشرح المتاح:</p>
                <p className="text-xs text-blue-700 truncate max-w-xs sm:max-w-md" dir="ltr">{effectiveUrl}</p>
              </div>
              <a
                href={effectiveUrl.startsWith('http') ? effectiveUrl : `https://${effectiveUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-sm"
              >
                <span>زيارة الشرح</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-900 text-white"
          >
            إغلاق ومتابعة الاختبار
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
