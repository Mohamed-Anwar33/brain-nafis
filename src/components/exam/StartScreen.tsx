import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StartScreenProps {
  onStart: (studentName: string) => Promise<void>;
  isLoading: boolean;
}

export function StartScreen({ onStart, isLoading }: StartScreenProps) {
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");

  const validateName = (name: string): boolean => {
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 4) {
      setError("يرجى إدخال الاسم الرباعي كاملاً (4 كلمات على الأقل)");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateName(studentName)) {
      return;
    }

    try {
      await onStart(studentName.trim());
    } catch (err) {
      toast.error("حدث خطأ أثناء بدء الاختبار");
    }
  };

  return (
    <div className="hero-section">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="card-elevated p-8 md:p-12 animate-bounce-in">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              بنك الاختبارات
            </h1>
            <p className="text-muted-foreground text-lg">
              اختبر معلوماتك وتعلم من أخطائك
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">أسئلة متنوعة</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">نتائج فورية</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="studentName" className="text-base font-medium">
                الاسم الرباعي
              </Label>
              <Input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="أحمد محمد علي حسن"
                className="h-14 text-lg rounded-xl border-2 focus:border-primary transition-colors"
                dir="rtl"
              />
              {error && (
                <p className="text-destructive text-sm animate-fade-in">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !studentName.trim()}
              className="w-full h-14 text-lg font-semibold rounded-xl btn-primary-gradient"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  جاري التحميل...
                </span>
              ) : (
                "ابدأ الاختبار"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
