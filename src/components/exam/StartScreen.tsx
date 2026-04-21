import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, GraduationCap, Sparkles, Brain, Zap } from "lucide-react";
import { toast } from "sonner";
import PremiumBackground from "@/components/ui/PremiumBackground";

interface StartScreenProps {
  onStart: (studentName: string) => Promise<void>;
  isLoading: boolean;
  existingName?: string | null;
  onLogout?: () => void;
}

export function StartScreen({ onStart, isLoading, existingName, onLogout }: StartScreenProps) {
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
    <PremiumBackground>
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="container max-w-4xl mx-auto">
          <div className="bg-white/50 backdrop-blur-[40px] p-10 md:p-20 rounded-[4rem] border border-white shadow-[0_32px_128px_-12px_rgba(0,0,0,0.06)] animate-in zoom-in slide-in-from-bottom-10 duration-1000 relative overflow-hidden">
            {/* Background Accent Decorative - Cheery Colors */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-16">
                <div className="relative inline-flex items-center justify-center w-56 h-56 mb-10 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
                  <div className="relative w-full h-full p-6 bg-white rounded-[3rem] shadow-xl animate-in zoom-in duration-700 hover:rotate-6 transition-transform border border-slate-100">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600">
                    براين ساينس
                  </span>
                </h1>

                <div className="space-y-6 mb-12">
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800">المتوسطة <span className="text-indigo-600">الرابعة والعشرون</span> بجدة</h2>
                  <div className="flex flex-wrap justify-center gap-8 text-xl md:text-2xl text-slate-500">
                    <div className="bg-white/80 px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                      <p>معلمة المادة: <span className="font-black text-slate-800">هيفا السلمي</span></p>
                    </div>
                    <div className="bg-white/80 px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                      <p>قائدة المدرسة: <span className="font-black text-slate-800">تهاني السفياني</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features - Bright style */}
              <div className="grid grid-cols-2 gap-8 mb-16">
                <div className="flex items-center gap-6 p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100 transition-colors shadow-sm">
                  <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <span className="text-2xl font-black text-slate-800">أسئلة ممتعة</span>
                </div>
                <div className="flex items-center gap-6 p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100/50 hover:bg-emerald-100 transition-colors shadow-sm">
                  <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
                    <Zap className="w-8 h-8" />
                  </div>
                  <span className="text-2xl font-black text-slate-800">تحديات يومية</span>
                </div>
              </div>

              {existingName ? (
                <div className="space-y-10 text-center bg-white/60 p-12 rounded-[3.5rem] border border-slate-100 backdrop-blur-xl shadow-lg">
                  <div className="space-y-4">
                    <h3 className="text-4xl md:text-5xl font-black text-slate-900">
                      مرحباً يا <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-600 font-black">{existingName}</span> !
                    </h3>
                    <p className="text-2xl text-slate-500 font-bold tracking-wide">هل أنت مستعد للانطلاق في رحلتك المبهجة اليوم؟</p>
                  </div>
                  
                  <div className="grid gap-6">
                    <Button
                      onClick={() => onStart(existingName)}
                      disabled={isLoading}
                      className="w-full h-24 text-3xl font-black rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-emerald-600/20"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-3 text-white">
                          <Brain className="animate-spin h-10 w-10" />
                          جاري التحميل...
                        </span>
                      ) : (
                        <span className="text-white">نعم، انطلق الآن!</span>
                      )}
                    </Button>
                    
                    {onLogout && (
                      <Button
                        variant="ghost"
                        onClick={onLogout}
                        disabled={isLoading}
                        className="w-full h-20 text-2xl font-bold rounded-3xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                      >
                        لست أنت؟ تسجيل الخروج
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="space-y-4">
                    <Label htmlFor="studentName" className="text-3xl font-black text-slate-900 mb-4 block mr-2">
                      اسمك بطل المستقبل:
                    </Label>
                    <div className="relative group">
                      <Input
                        id="studentName"
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="أدخل اسمك الثلاثي الكامل"
                        className="h-24 text-3xl md:text-4xl text-center rounded-[2rem] border-4 border-slate-100 bg-white/80 text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white transition-all duration-300 outline-none shadow-sm"
                        dir="rtl"
                      />
                    </div>
                    {error && (
                      <p className="text-rose-500 text-xl font-bold animate-pulse mr-4">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !studentName.trim()}
                    className="w-full h-24 text-4xl font-black rounded-[2rem] bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-indigo-600/20 group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {isLoading ? (
                      <span className="flex items-center gap-4 text-white">
                        <Brain className="animate-spin h-12 w-12" />
                        جاري تجهيز عالمك...
                      </span>
                    ) : (
                      <span className="flex items-center gap-4 text-white">
                        <Sparkles className="w-10 h-10" />
                        ادخل العالم الجبار
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
}
