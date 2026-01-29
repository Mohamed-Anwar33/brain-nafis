import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface CSVRow {
  question_text: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correct_choice_index: number;
  isValid: boolean;
  error?: string;
}

interface CSVImportProps {
  onComplete: () => void;
}

export function CSVImport({ onComplete }: CSVImportProps) {
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const results: CSVRow[] = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("question") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));

      if (parts.length < 6) {
        results.push({
          question_text: parts[0] || "",
          choice1: parts[1] || "",
          choice2: parts[2] || "",
          choice3: parts[3] || "",
          choice4: parts[4] || "",
          correct_choice_index: parseInt(parts[5]) || 0,
          isValid: false,
          error: "عدد الأعمدة غير كافٍ",
        });
        continue;
      }

      const correctIndex = parseInt(parts[5]);
      const isValid =
        parts[0].length > 0 &&
        parts[1].length > 0 &&
        parts[2].length > 0 &&
        correctIndex >= 1 &&
        correctIndex <= 4;

      results.push({
        question_text: parts[0],
        choice1: parts[1],
        choice2: parts[2],
        choice3: parts[3] || "",
        choice4: parts[4] || "",
        correct_choice_index: correctIndex,
        isValid,
        error: isValid ? undefined : "بيانات غير صالحة",
      });
    }

    return results;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setRows(parsed);
    } catch (err) {
      toast.error("حدث خطأ أثناء قراءة الملف");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("لا توجد صفوف صالحة للاستيراد");
      return;
    }

    setIsImporting(true);

    try {
      for (const row of validRows) {
        // Create question
        const { data: question, error: qError } = await supabase
          .from("questions")
          .insert({ text: row.question_text, active: true })
          .select()
          .single();

        if (qError) throw qError;

        // Create choices
        const choices = [
          { question_id: question.id, text: row.choice1, is_correct: row.correct_choice_index === 1 },
          { question_id: question.id, text: row.choice2, is_correct: row.correct_choice_index === 2 },
        ];

        if (row.choice3) {
          choices.push({ question_id: question.id, text: row.choice3, is_correct: row.correct_choice_index === 3 });
        }
        if (row.choice4) {
          choices.push({ question_id: question.id, text: row.choice4, is_correct: row.correct_choice_index === 4 });
        }

        const { error: cError } = await supabase.from("choices").insert(choices);
        if (cError) throw cError;
      }

      toast.success(`تم استيراد ${validRows.length} سؤال بنجاح`);
      onComplete();
    } catch (err) {
      console.error("Error importing:", err);
      toast.error("حدث خطأ أثناء الاستيراد");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.filter(r => !r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 rounded-xl bg-secondary/50">
        <h4 className="font-semibold mb-2">تنسيق الملف</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          يرجى رفع ملف Excel (CSV) يحتوي على البيانات التالية بالترتيب:
          <br />
          <span className="font-medium text-foreground">1. نص السؤال</span>
          <br />
          <span className="font-medium text-foreground">2. الخيارات الأربعة</span> (كل خيار في عمود منفصل)
          <br />
          <span className="font-medium text-foreground">3. رقم الإجابة الصحيحة</span> (من 1 إلى 4)
        </p>
      </div>

      {/* File Input */}
      <div className="space-y-2">
        <Label htmlFor="csv-file">اختر ملف CSV</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <>
          {/* Stats */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span>{validCount} صالح</span>
            </div>
            {invalidCount > 0 && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span>{invalidCount} غير صالح</span>
              </div>
            )}
          </div>

          {/* Table Preview */}
          <div className="max-h-64 overflow-auto border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>السؤال</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {row.question_text}
                    </TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <span className="text-xs text-destructive">{row.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {rows.length > 10 && (
            <p className="text-sm text-muted-foreground text-center">
              ... و {rows.length - 10} صف إضافي
            </p>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={isImporting || validCount === 0}
            className="w-full h-12 text-base font-semibold rounded-xl btn-primary-gradient"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري الاستيراد...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 ml-2" />
                استيراد {validCount} سؤال
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
