import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SelectionScopeFields } from "@/components/admin/SelectionScopeFields";
import { HotspotVisualEditor } from "./HotspotVisualEditor";
import { QuestionBankModal } from "./QuestionBankModal";
import { treasureService } from "@/services/treasureService";
import { SelectionScopeValue } from "@/types/selection";
import { ChallengeType, TreasureAdventure } from "@/types/treasure";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  ArrowUp,
  ArrowDown,
  BookOpen,
  FileQuestion,
  HelpCircle,
  Sparkles,
  Image as ImageIcon,
  X,
  PlayCircle,
} from "lucide-react";

interface TreasureAdventureFormProps {
  initialAdventure?: TreasureAdventure | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export interface AdminQuestionItem {
  id: string;
  type: ChallengeType;
  prompt: string;
  wrong_reason: string;
  explanation_url: string;
  choices: { id: string; text: string; is_correct: boolean; image_url?: string }[];
  items: { id: string; text: string; imageUrl?: string }[];
  image_url: string;
  target_x: number;
  target_y: number;
  tolerance: number;
  uploading_image?: boolean;
}

export function TreasureAdventureForm({
  initialAdventure,
  onSuccess,
  onCancel,
}: TreasureAdventureFormProps) {
  const [loading, setLoading] = useState(false);

  // 1. Basic Metadata (Scope & Title only - zero fluff!)
  const [scope, setScope] = useState<SelectionScopeValue>({
    trackType: initialAdventure?.track_type || "nafis",
    gradeId: "",
    subjectId: "",
    gradeSubjectId: initialAdventure?.grade_subject_id || "",
    domainId: initialAdventure?.domain_id || "",
  });
  const [title, setTitle] = useState(initialAdventure?.title || "");

  // 2. Questions List
  const [questions, setQuestions] = useState<AdminQuestionItem[]>(() => {
    // Check if initial adventure has challenges
    const version = initialAdventure?.draft_version || initialAdventure?.published_version || initialAdventure?.versions?.[0];
    if (version?.challenges && version.challenges.length > 0) {
      return version.challenges.map((ch, idx) => ({
        id: `q-${idx + 1}-${Date.now()}`,
        type: ch.challenge_type,
        prompt: ch.prompt || "",
        wrong_reason: ch.wrong_reason || "",
        explanation_url: ch.explanation_url || "",
        choices:
          ch.challenge_type === "mcq" && ch.content_payload?.choices
            ? ch.content_payload.choices.map((c: any) => ({
                id: c.id,
                text: c.text,
                is_correct: ch.solution_payload?.correct_choice_id === c.id,
                image_url: c.image_url,
              }))
            : [
                { id: "c1", text: "", is_correct: true },
                { id: "c2", text: "", is_correct: false },
                { id: "c3", text: "", is_correct: false },
                { id: "c4", text: "", is_correct: false },
              ],
        items:
          ch.challenge_type === "ordering" && ch.content_payload?.items
            ? ch.content_payload.items
            : [
                { id: "item-1", text: "" },
                { id: "item-2", text: "" },
                { id: "item-3", text: "" },
              ],
        image_url: ch.image_url || ch.content_payload?.image_url || "",
        target_x: ch.solution_payload?.target_x_percent || 50,
        target_y: ch.solution_payload?.target_y_percent || 50,
        tolerance: ch.solution_payload?.tolerance_radius_percent || 8,
      }));
    }

    // Default 3 starter questions
    return [
      {
        id: "q-1",
        type: "mcq",
        prompt: "",
        wrong_reason: "",
        explanation_url: "",
        choices: [
          { id: "c1", text: "", is_correct: true },
          { id: "c2", text: "", is_correct: false },
          { id: "c3", text: "", is_correct: false },
          { id: "c4", text: "", is_correct: false },
        ],
        items: [],
        image_url: "",
        target_x: 50,
        target_y: 50,
        tolerance: 8,
      },
      {
        id: "q-2",
        type: "ordering",
        prompt: "",
        wrong_reason: "",
        explanation_url: "",
        choices: [],
        items: [
          { id: "item-1", text: "" },
          { id: "item-2", text: "" },
          { id: "item-3", text: "" },
        ],
        image_url: "",
        target_x: 50,
        target_y: 50,
        tolerance: 8,
      },
      {
        id: "q-3",
        type: "hotspot",
        prompt: "",
        wrong_reason: "",
        explanation_url: "",
        choices: [],
        items: [],
        image_url: "",
        target_x: 50,
        target_y: 50,
        tolerance: 8,
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<string>("q-0");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [targetQuestionIndexForImport, setTargetQuestionIndexForImport] = useState<number | null>(null);

  const handleSelectBankQuestion = (bankQ: any) => {
    const formattedChoices =
      bankQ.choices?.length > 0
        ? bankQ.choices.map((c: any, i: number) => ({
            id: c.id || `c${i + 1}`,
            text: c.text,
            is_correct: !!c.is_correct,
            image_url: c.image_url,
          }))
        : [
            { id: "c1", text: "", is_correct: true },
            { id: "c2", text: "", is_correct: false },
            { id: "c3", text: "", is_correct: false },
            { id: "c4", text: "", is_correct: false },
          ];

    if (targetQuestionIndexForImport !== null && targetQuestionIndexForImport < questions.length) {
      updateQuestion(targetQuestionIndexForImport, {
        type: "mcq",
        prompt: bankQ.text,
        image_url: bankQ.image_url || "",
        wrong_reason: bankQ.wrong_reason || "",
        explanation_url: bankQ.explanation_url || "",
        choices: formattedChoices,
      });
      toast.success(`تم استبدال السؤال رقم ${targetQuestionIndexForImport + 1} بالسؤال المستورد بنجاح`);
    } else {
      const newIdx = questions.length;
      const newQ: AdminQuestionItem = {
        id: `q-${Date.now()}`,
        type: "mcq",
        prompt: bankQ.text,
        wrong_reason: bankQ.wrong_reason || "",
        explanation_url: bankQ.explanation_url || "",
        choices: formattedChoices,
        items: [],
        image_url: bankQ.image_url || "",
        target_x: 50,
        target_y: 50,
        tolerance: 8,
      };
      setQuestions((prev) => [...prev, newQ]);
      setActiveTab(`q-${newIdx}`);
      toast.success(`تمت إضافة السؤال المستورد كسؤال رقم ${newIdx + 1}`);
    }
  };

  // Keep active tab in bounds if questions change
  useEffect(() => {
    if (questions.length > 0 && !questions.some((_, i) => `q-${i}` === activeTab)) {
      setActiveTab("q-0");
    }
  }, [questions.length, activeTab]);

  // Add Question
  const handleAddQuestion = (type: ChallengeType) => {
    const newIdx = questions.length;
    const newQ: AdminQuestionItem = {
      id: `q-${Date.now()}`,
      type,
      prompt: "",
      wrong_reason: "",
      explanation_url: "",
      choices:
        type === "mcq"
          ? [
              { id: "c1", text: "", is_correct: true },
              { id: "c2", text: "", is_correct: false },
              { id: "c3", text: "", is_correct: false },
              { id: "c4", text: "", is_correct: false },
            ]
          : [],
      items:
        type === "ordering"
          ? [
              { id: "item-1", text: "" },
              { id: "item-2", text: "" },
              { id: "item-3", text: "" },
            ]
          : [],
      image_url: "",
      target_x: 50,
      target_y: 50,
      tolerance: 8,
    };

    setQuestions((prev) => [...prev, newQ]);
    setActiveTab(`q-${newIdx}`);
    toast.success(`تمت إضافة السؤال رقم ${newIdx + 1}`);
  };

  // Remove Question
  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("يجب الإبقاء على سؤال واحد على الأقل");
      return;
    }

    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    const nextTabIdx = Math.max(0, index - 1);
    setActiveTab(`q-${nextTabIdx}`);
    toast.info("تم حذف السؤال");
  };

  // Reorder Questions
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const copy = [...questions];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setQuestions(copy);
    setActiveTab(`q-${targetIndex}`);
  };

  // Update specific question
  const updateQuestion = (index: number, updates: Partial<AdminQuestionItem>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Handle Image Upload
  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
      return;
    }

    try {
      updateQuestion(index, { uploading_image: true });
      const url = await treasureService.uploadHotspotImage(file);
      updateQuestion(index, { image_url: url, uploading_image: false });
      toast.success("تم رفع الصورة بنجاح");
    } catch (err: any) {
      updateQuestion(index, { uploading_image: false });
      toast.error(err.message || "فشل رفع الصورة");
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scope.gradeSubjectId) {
      toast.error("يرجى اختيار الصف والمادة أولاً");
      return;
    }

    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان المغامرة");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;

      if (!q.prompt.trim()) {
        toast.error(`يرجى كتابة نص السؤال رقم ${qNum}`);
        setActiveTab(`q-${i}`);
        return;
      }

      if (q.type === "mcq") {
        if (!q.choices || q.choices.some((c) => !c.text.trim())) {
          toast.error(`يرجى إكمال خيارات السؤال رقم ${qNum}`);
          setActiveTab(`q-${i}`);
          return;
        }
        if (!q.choices.some((c) => c.is_correct)) {
          toast.error(`يرجى تحديد الإجابة الصحيحة في السؤال رقم ${qNum}`);
          setActiveTab(`q-${i}`);
          return;
        }
      } else if (q.type === "ordering") {
        if (!q.items || q.items.length < 2 || q.items.some((item) => !item.text.trim())) {
          toast.error(`يرجى كتابة عناصر الترتيب في السؤال رقم ${qNum}`);
          setActiveTab(`q-${i}`);
          return;
        }
      } else if (q.type === "hotspot") {
        if (!q.image_url) {
          toast.error(`يرجى رفع صورة المخطط العلمي للسؤال رقم ${qNum}`);
          setActiveTab(`q-${i}`);
          return;
        }
      }
    }

    try {
      setLoading(true);

      const formattedChallenges = questions.map((q, idx) => {
        let content_payload: Record<string, any> = {};
        let solution_payload: Record<string, any> = {};

        if (q.type === "mcq") {
          content_payload = {
            choices: q.choices.map((c) => ({
              id: c.id,
              text: c.text,
              image_url: c.image_url,
            })),
          };
          solution_payload = {
            correct_choice_id: q.choices.find((c) => c.is_correct)?.id,
          };
        } else if (q.type === "ordering") {
          content_payload = {
            items: q.items,
            drop_labels: [],
          };
          solution_payload = {
            correct_order: q.items.map((item) => item.id),
          };
        } else if (q.type === "hotspot") {
          content_payload = {
            image_url: q.image_url,
          };
          solution_payload = {
            target_x_percent: q.target_x,
            target_y_percent: q.target_y,
            tolerance_radius_percent: q.tolerance,
          };
        }

        return {
          step: idx + 1,
          challenge_type: q.type,
          source_question_id: crypto.randomUUID(),
          prompt: q.prompt,
          image_url: q.image_url || null,
          wrong_reason: q.wrong_reason || null,
          explanation_url: q.explanation_url || null,
          content_payload,
          solution_payload,
        };
      });

      if (initialAdventure?.id) {
        await treasureService.updateAdventure(initialAdventure.id, {
          title,
          track_type: scope.trackType || "nafis",
          grade_subject_id: scope.gradeSubjectId,
          domain_id: scope.domainId || null,
          challenges: formattedChallenges,
        });
        toast.success(`تم تحديث المغامرة وحفظ ${questions.length} أسئلة بنجاح!`);
      } else {
        await treasureService.createAdventure({
          title,
          description: "",
          track_type: scope.trackType || "nafis",
          grade_subject_id: scope.gradeSubjectId,
          domain_id: scope.domainId || null,
          story_clue: "ابحث عن المفتاح الأثري في أنحاء الجزيرة لحل الألغاز وفتح البوابة الأسطورية",
          environment_config: {
            theme: "ancient_ruins",
            key_node: "statue",
            time_limit_seconds: 600,
          },
          challenges: formattedChallenges,
        });
        toast.success(`تم إنشاء المغامرة مع ${questions.length} أسئلة بنجاح!`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
      {/* 1. Clean Top Header: Subject, Grade & Title only */}
      <Card className="border shadow-xs bg-muted/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm border-b pb-2">
            <BookOpen className="w-4 h-4" />
            <span>بيانات المادة وعنوان المغامرة</span>
          </div>

          <SelectionScopeFields value={scope} onChange={setScope} />

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="adv-title" className="font-bold text-xs">عنوان المغامرة / التحدي</Label>
            <Input
              id="adv-title"
              placeholder="مثال: مغامرة حالات المادة وتحولاتها"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Questions Management Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600" />
          <span className="font-black text-sm text-foreground">الأسئلة ({questions.length} أسئلة)</span>
        </div>

        {/* Action Buttons: Question Bank + Quick Add Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setTargetQuestionIndexForImport(null);
              setIsBankModalOpen(true);
            }}
            className="text-xs h-8 gap-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:brightness-110 text-white shadow-xs font-bold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📚 استيراد سؤال من بنك المنصة</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleAddQuestion("mcq")}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ سؤال اختيار (MCQ)</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleAddQuestion("ordering")}
            className="text-xs h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ سؤال ترتيب</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleAddQuestion("hotspot")}
            className="text-xs h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ سؤال نقطة على صورة</span>
          </Button>
        </div>
      </div>

      {/* 3. Simple Question Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1.5 w-full bg-muted/60 p-1.5 rounded-xl h-auto">
          {questions.map((q, idx) => (
            <TabsTrigger
              key={q.id}
              value={`q-${idx}`}
              className="text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold">السؤال {idx + 1}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal opacity-80">
                {q.type === "mcq" ? "اختيار" : q.type === "ordering" ? "ترتيب" : "نقطة"}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {questions.map((q, index) => {
          const qNum = index + 1;
          return (
            <TabsContent key={q.id} value={`q-${index}`} className="space-y-4 pt-3">
              <Card className="border-2 border-amber-500/30">
                <CardHeader className="p-4 pb-2 border-b bg-muted/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-600 text-white font-bold text-sm px-2.5 py-0.5">
                        السؤال {qNum} من {questions.length}
                      </Badge>
                      <Select
                        value={q.type}
                        onValueChange={(val: ChallengeType) => {
                          updateQuestion(index, {
                            type: val,
                            choices:
                              val === "mcq" && q.choices.length === 0
                                ? [
                                    { id: "c1", text: "", is_correct: true },
                                    { id: "c2", text: "", is_correct: false },
                                    { id: "c3", text: "", is_correct: false },
                                    { id: "c4", text: "", is_correct: false },
                                  ]
                                : q.choices,
                            items:
                              val === "ordering" && q.items.length === 0
                                ? [
                                    { id: "item-1", text: "" },
                                    { id: "item-2", text: "" },
                                    { id: "item-3", text: "" },
                                  ]
                                : q.items,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-[150px] font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">اختيار من متعدد</SelectItem>
                          <SelectItem value="ordering">ترتيب تسلسلي</SelectItem>
                          <SelectItem value="hotspot">نقطة على صورة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Controls: Import, Move Up/Down, Delete */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs gap-1 border-amber-500/40 text-amber-900 bg-amber-50/50 hover:bg-amber-100"
                        onClick={() => {
                          setTargetQuestionIndexForImport(index);
                          setIsBankModalOpen(true);
                        }}
                        title="استيراد سؤال من بنك المنصة واستبدال هذا السؤال"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>استيراد سؤال جاهز</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={index === 0}
                        onClick={() => handleMove(index, "up")}
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5 ml-1" /> لأعلى
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={index === questions.length - 1}
                        onClick={() => handleMove(index, "down")}
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5 ml-1" /> لأسفل
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 px-2.5 text-xs gap-1 mr-1"
                        disabled={questions.length <= 1}
                        onClick={() => handleRemoveQuestion(index)}
                        title="حذف السؤال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Question Text */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-sm">نص السؤال</Label>
                    <Textarea
                      placeholder="اكتب نص السؤال هنا..."
                      value={q.prompt}
                      onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                      rows={2}
                      className="text-base"
                      required
                    />
                  </div>

                  {/* Question Image (for MCQ & general) */}
                  {q.type === "mcq" && (
                    <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-xs flex items-center gap-1.5 text-muted-foreground">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                          <span>صورة السؤال (اختياري - مطابقة لنظام المنصة):</span>
                        </Label>
                        {q.image_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuestion(index, { image_url: "" })}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-7 px-2 gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف الصورة</span>
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(index, e)}
                          disabled={q.uploading_image}
                          className="max-w-xs text-xs h-9"
                        />
                        {q.uploading_image && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري رفع الصورة...
                          </div>
                        )}
                      </div>

                      {q.image_url && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-white flex items-center justify-center p-1 shadow-xs">
                            <img src={q.image_url} alt="Question preview" className="max-h-full max-w-full object-contain rounded" />
                          </div>
                          <span className="text-xs text-emerald-700 font-medium">✓ تم إرفاق صورة السؤال بنجاح</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. MCQ Choices */}
                  {q.type === "mcq" && (
                    <div className="space-y-2.5">
                      <Label className="font-bold text-xs text-muted-foreground">
                        خيارات الإجابة (حدد الدائرة الخضراء للإجابة الصحيحة):
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.choices.map((choice, cIdx) => {
                          const letters = ["أ", "ب", "ج", "د"];
                          const letter = letters[cIdx] || `${cIdx + 1}`;
                          return (
                            <div
                              key={choice.id}
                              className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                choice.is_correct
                                  ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-400"
                                  : "border-border bg-card"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                    choice.is_correct
                                      ? "bg-emerald-600 text-white"
                                      : "bg-muted text-foreground"
                                  }`}
                                >
                                  {letter}
                                </div>

                                <input
                                  type="radio"
                                  name={`correct-choice-${q.id}`}
                                  checked={choice.is_correct}
                                  onChange={() => {
                                    const updatedChoices = q.choices.map((c, i) => ({
                                      ...c,
                                      is_correct: i === cIdx,
                                    }));
                                    updateQuestion(index, { choices: updatedChoices });
                                  }}
                                  className="w-4 h-4 text-emerald-600 cursor-pointer shrink-0"
                                />

                                <Input
                                  placeholder={`نص الخيار (${letter})`}
                                  value={choice.text}
                                  onChange={(e) => {
                                    const updatedChoices = [...q.choices];
                                    updatedChoices[cIdx] = { ...updatedChoices[cIdx], text: e.target.value };
                                    updateQuestion(index, { choices: updatedChoices });
                                  }}
                                  className="h-9 text-sm flex-1"
                                  required
                                />

                                {choice.is_correct && (
                                  <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">
                                    صحيحة
                                  </Badge>
                                )}
                              </div>

                              {/* Optional choice image */}
                              <div className="flex items-center justify-between pl-1 pt-1 border-t border-muted/50 text-[11px]">
                                <label className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3 text-amber-600" />
                                  <span>{choice.image_url ? "تغيير صورة الخيار" : "+ صورة للخيار"}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        const url = await treasureService.uploadHotspotImage(file);
                                        const updatedChoices = [...q.choices];
                                        updatedChoices[cIdx] = { ...updatedChoices[cIdx], image_url: url };
                                        updateQuestion(index, { choices: updatedChoices });
                                        toast.success("تم رفع صورة الخيار بنجاح");
                                      } catch (err: any) {
                                        toast.error(err.message || "فشل رفع الصورة");
                                      }
                                    }}
                                  />
                                </label>

                                {choice.image_url && (
                                  <div className="flex items-center gap-1.5">
                                    <img
                                      src={choice.image_url}
                                      alt="Choice"
                                      className="w-6 h-6 object-contain rounded border bg-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedChoices = [...q.choices];
                                        updatedChoices[cIdx] = { ...updatedChoices[cIdx], image_url: undefined };
                                        updateQuestion(index, { choices: updatedChoices });
                                      }}
                                      className="text-rose-500 hover:text-rose-700"
                                      title="حذف صورة الخيار"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Ordering Items */}
                  {q.type === "ordering" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-xs text-muted-foreground">
                          عناصر الترتيب (اكتبها بالترتيب الصحيح):
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newItems = [
                              ...q.items,
                              { id: `item-${Date.now()}`, text: "" },
                            ];
                            updateQuestion(index, { items: newItems });
                          }}
                          className="text-xs h-7 text-primary"
                        >
                          <Plus className="w-3 h-3 ml-1" /> إضافة عنصر
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {q.items.map((item, itemIdx) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Badge variant="outline" className="w-7 h-7 rounded-lg flex items-center justify-center font-bold">
                              {itemIdx + 1}
                            </Badge>
                            <Input
                              placeholder={`العنصر رقم ${itemIdx + 1} بالترتيب الصحيح`}
                              value={item.text}
                              onChange={(e) => {
                                const newItems = [...q.items];
                                newItems[itemIdx] = { ...newItems[itemIdx], text: e.target.value };
                                updateQuestion(index, { items: newItems });
                              }}
                              required
                            />
                            {q.items.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 shrink-0"
                                onClick={() => {
                                  const newItems = q.items.filter((_, i) => i !== itemIdx);
                                  updateQuestion(index, { items: newItems });
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Hotspot Diagram */}
                  {q.type === "hotspot" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Label className="font-bold text-xs shrink-0">رفع صورة المخطط:</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(index, e)}
                          disabled={q.uploading_image}
                          className="max-w-xs"
                        />
                        {q.uploading_image && (
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الرفع...
                          </div>
                        )}
                      </div>

                      {q.image_url ? (
                        <HotspotVisualEditor
                          imageUrl={q.image_url}
                          targetX={q.target_x}
                          targetY={q.target_y}
                          toleranceRadius={q.tolerance}
                          onChange={({ targetX, targetY, toleranceRadius }) => {
                            updateQuestion(index, {
                              target_x: targetX,
                              target_y: targetY,
                              tolerance: toleranceRadius,
                            });
                          }}
                        />
                      ) : (
                        <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-muted-foreground/60" />
                          <span>ارفع صورة المخطط العلمي لتحديد النقطة الفعالة</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Educational Explanation Section - Identical to Central Exam Form */}
                  <div className="pt-3 border-t space-y-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                      <span>القسم التربوي والتوضيحي (مطابق للنظام المعتمد بالمنصة):</span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">توضيح الإجابة وسبب الخطأ (wrong_reason):</Label>
                      <Input
                        placeholder="مثال: الإجابة الصحيحة لأن الجسيمات في الحالة الصلبة متقاربة وتهتز مكانها..."
                        value={q.wrong_reason}
                        onChange={(e) => updateQuestion(index, { wrong_reason: e.target.value })}
                        className="text-xs h-9 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>رابط فيديو شرح السؤال والدرس (explanation_url):</span>
                      </Label>
                      <Input
                        placeholder="مثال: https://www.youtube.com/watch?v=... أو رابط مباشر"
                        value={q.explanation_url}
                        onChange={(e) => updateQuestion(index, { explanation_url: e.target.value })}
                        className="text-xs h-9 bg-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px] font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 ml-2" />
              حفظ الأسئلة ({questions.length} أسئلة)
            </>
          )}
        </Button>
      </div>

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={isBankModalOpen}
        onClose={() => {
          setIsBankModalOpen(false);
          setTargetQuestionIndexForImport(null);
        }}
        gradeSubjectId={scope.gradeSubjectId}
        trackType={scope.trackType || "nafis"}
        onSelectQuestion={handleSelectBankQuestion}
      />
    </form>
  );
}
