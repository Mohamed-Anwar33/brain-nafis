import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PremiumBackground from "@/components/ui/PremiumBackground";

interface StartScreenProps {
  onStart: (studentName: string) => Promise<void>;
  isLoading: boolean;
}

export function StartScreen({ onStart, isLoading }: StartScreenProps) {
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");

  const validateName = (name: string): boolean => {
    const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
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
    <PremiumBackground>
      <div className="min-h-screen py-8 sm:py-12 px-4 flex items-center justify-center">
        <div className="container max-w-4xl mx-auto">
          <div className="bg-white/50 backdrop-blur-[40px] p-6 sm:p-10 md:p-20 rounded-[2.5rem] md:rounded-[4rem] border border-white shadow-[0_32px_128px_-12px_rgba(0,0,0,0.06)] animate-in zoom-in slide-in-from-bottom-10 duration-1000 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="text-center mb-8 sm:mb-16">
                <div className="relative inline-flex items-center justify-center w-32 h-32 sm:w-56 sm:h-56 mb-6 sm:mb-10 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
                  <div className="relative w-full h-full p-4 sm:p-6 bg-white rounded-[2rem] sm:rounded-[3rem] shadow-xl animate-in zoom-in duration-700 hover:rotate-6 transition-transform border border-slate-100">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                </div>

                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tighter leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600">
                    براين ساينس
                  </span>
                </h1>

                <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
                  <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-slate-800">
                    المتوسطة <span className="text-indigo-600">الرابعة والعشرون</span> بجدة
                  </h2>
                  <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm sm:text-xl md:text-2xl text-slate-500">
                    <div className="bg-white/80 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                      <p>
                        معلمة المادة: <span className="font-black text-slate-800">هيفا السلمي</span>
                      </p>
                    </div>
                    <div className="bg-white/80 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                      <p>
                        قائدة المدرسة: <span className="font-black text-slate-800">تهاني السفياني</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
                <div className="space-y-3 sm:space-y-4">
                  <Label
                    htmlFor="studentName"
                    className="text-xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-4 block mr-2"
                  >
                    الاسم الثلاثي:
                  </Label>
                  <div className="relative group">
                    <Input
                      id="studentName"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="أدخل اسمك الثلاثي الكامل"
                      className="h-16 sm:h-24 text-xl sm:text-3xl md:text-4xl text-center rounded-2xl sm:rounded-[2rem] border-2 sm:border-4 border-slate-100 bg-white/80 text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white transition-all duration-300 outline-none shadow-sm"
                      dir="rtl"
                    />
                  </div>
                  {error && (
                    <p className="text-rose-500 text-sm sm:text-xl font-bold animate-pulse mr-4">
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !studentName.trim()}
                  className="w-full h-16 sm:h-24 text-xl sm:text-4xl font-black rounded-2xl sm:rounded-[2rem] bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-indigo-600/20 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isLoading ? (
                    <span className="flex items-center gap-3 sm:gap-4 text-white">
                      <Brain className="animate-spin h-7 w-7 sm:h-12 sm:w-12" />
                      جاري تجهيز عالمك...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3 sm:gap-4 text-white">
                      <Sparkles className="w-7 h-7 sm:w-10 sm:h-10" />
                      انطلق للتحدي
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
}
