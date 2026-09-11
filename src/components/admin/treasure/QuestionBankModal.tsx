import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, CheckCircle2, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface BankQuestion {
  id: string;
  text: string;
  image_url?: string | null;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  source: "central" | "nafis";
  choices: {
    id: string;
    text: string;
    is_correct: boolean;
    image_url?: string | null;
  }[];
}

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeSubjectId?: string;
  trackType?: "nafis" | "central";
  onSelectQuestion: (question: BankQuestion) => void;
}

export function QuestionBankModal({
  isOpen,
  onClose,
  gradeSubjectId,
  trackType = "nafis",
  onSelectQuestion,
}: QuestionBankModalProps) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<"all" | "central" | "nafis">("all");

  useEffect(() => {
    if (!isOpen) return;

    const fetchBankQuestions = async () => {
      setLoading(true);
      try {
        const results: BankQuestion[] = [];

        // 1. Fetch from Central Exam Questions if applicable
        if (selectedSource === "all" || selectedSource === "central") {
          let centralQuery = (supabase as any)
            .from("central_exam_questions")
            .select("*, choices:central_exam_choices(*)")
            .limit(40);

          if (gradeSubjectId) {
            centralQuery = centralQuery.eq("grade_subject_id", gradeSubjectId);
          }

          const { data: centralData, error: cErr } = await centralQuery;
          if (!cErr && centralData) {
            centralData.forEach((q: any) => {
              results.push({
                id: q.id,
                text: q.text,
                image_url: q.image_url,
                wrong_reason: q.wrong_reason,
                explanation_url: q.explanation_url,
                source: "central",
                choices: (q.choices || []).map((c: any) => ({
                  id: c.id,
                  text: c.text,
                  is_correct: !!c.is_correct,
                  image_url: c.image_url,
                })),
              });
            });
          }
        }

        // 2. Fetch from General / Nafis Questions if applicable
        if (selectedSource === "all" || selectedSource === "nafis") {
          let nafisQuery = (supabase as any)
            .from("questions")
            .select("*, choices(*)")
            .limit(40);

          if (gradeSubjectId) {
            nafisQuery = nafisQuery.eq("grade_subject_id", gradeSubjectId);
          }

          const { data: nafisData, error: nErr } = await nafisQuery;
          if (!nErr && nafisData) {
            nafisData.forEach((q: any) => {
              results.push({
                id: q.id,
                text: q.text,
                image_url: q.image_url,
                wrong_reason: q.wrong_reason,
                explanation_url: q.explanation_url,
                source: "nafis",
                choices: (q.choices || []).map((c: any) => ({
                  id: c.id,
                  text: c.text,
                  is_correct: !!c.is_correct,
                  image_url: c.image_url,
                })),
              });
            });
          }
        }

        setQuestions(results);
      } catch (err) {
        console.error("Failed to load questions from bank:", err);
        toast.error("فشل تحميل الأسئلة من البنك");
      } finally {
        setLoading(false);
      }
    };

    fetchBankQuestions();
  }, [isOpen, gradeSubjectId, selectedSource]);

  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    return (
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.choices.some((c) => c.text.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6" dir="rtl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  بنك أسئلة المنصة والاختبار المركزي
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  اختر أي سؤال مضاف مسبقاً في المنصة لاستيراده فوراً داخل مغامرة الكنز
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              <Button
                type="button"
                size="sm"
                variant={selectedSource === "all" ? "default" : "ghost"}
                className="text-xs h-7 px-2.5"
                onClick={() => setSelectedSource("all")}
              >
                الكل
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedSource === "central" ? "default" : "ghost"}
                className="text-xs h-7 px-2.5"
                onClick={() => setSelectedSource("central")}
              >
                المركزي
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedSource === "nafis" ? "default" : "ghost"}
                className="text-xs h-7 px-2.5"
                onClick={() => setSelectedSource("nafis")}
              >
                نافس / المنصة
              </Button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في نص السؤال أو الخيارات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-sm"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">جاري جلب الأسئلة من بنك المنصة...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-bold">لم يتم العثور على أسئلة مطابقة</p>
              <p className="text-xs">تأكد من اختيار الصف والمادة أو جرب كلمة بحث أخرى</p>
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <Card
                key={`${q.source}-${q.id}`}
                className="p-4 border hover:border-amber-500/50 hover:shadow-md transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          q.source === "central"
                            ? "border-violet-400 text-violet-700 bg-violet-50 text-[10px]"
                            : "border-blue-400 text-blue-700 bg-blue-50 text-[10px]"
                        }
                      >
                        {q.source === "central" ? "اختبار مركزي" : "أسئلة نافس / المنصة"}
                      </Badge>
                      {q.image_url && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <ImageIcon className="w-3 h-3" />
                          <span>يحتوي صورة</span>
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-foreground leading-snug">{q.text}</h4>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      onSelectQuestion(q);
                      onClose();
                      toast.success("تم استيراد السؤال بنجاح!");
                    }}
                    className="shrink-0 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs font-bold text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>استيراد هذا السؤال</span>
                  </Button>
                </div>

                {/* Choices preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {q.choices.map((choice, cIdx) => (
                    <div
                      key={choice.id || cIdx}
                      className={`text-xs p-2 rounded-lg border flex items-center gap-1.5 ${
                        choice.is_correct
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-muted/30 border-border text-muted-foreground"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center font-bold text-[10px]">
                        {String.fromCharCode(1571 + cIdx)}
                      </span>
                      <span className="truncate flex-1">{choice.text}</span>
                      {choice.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
