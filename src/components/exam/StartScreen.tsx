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
    if (words.length < 3) {
      setError("يرجى إدخال الاسم الثلاثي كاملاً (3 كلمات على الأقل)");
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
            <div className="inline-flex items-center justify-center w-48 h-48 mb-8 animate-in zoom-in duration-500">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
              <span className="text-primary relative inline-block">
                براين نافس
                <svg className="absolute w-full h-3 -bottom-1 right-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>

            <div className="space-y-2 mb-8 animate-fade-in delay-100">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">المتوسطة الرابعة والعشرون جدة</h2>
              <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base text-muted-foreground">
                <p>معلمة مادة العلوم: <span className="font-semibold text-primary">هيفاء شجيع السلمي</span></p>
                <span className="hidden md:inline">•</span>
                <p>قائدة المدرسة: <span className="font-semibold text-primary">تهاني السفياني</span></p>
              </div>
            </div>
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
                الاسم الثلاثي
              </Label>
              <Input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="أحمد محمد علي"
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
