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
              <div className="text-center mb-8 sm:mb-14">
                {/* Logo Presentation - Blended Seamlessly with Background */}
                <div className="relative max-w-lg mx-auto flex items-center justify-center mb-6 group animate-in zoom-in duration-700">
                  {/* Organic circular soft aura behind the logo */}
                  <div className="absolute inset-0 m-auto w-72 sm:w-96 h-40 sm:h-52 bg-gradient-to-tr from-sky-400/25 via-indigo-400/25 to-purple-400/20 rounded-full blur-3xl pointer-events-none -z-10" />
                  
                  {/* Logo image blended smoothly into the background without cutting off details */}
                  <div
                    className="relative w-full overflow-hidden flex items-center justify-center"
                    style={{
                      WebkitMaskImage: "radial-gradient(ellipse 92% 88% at 50% 50%, black 70%, transparent 100%)",
                      maskImage: "radial-gradient(ellipse 92% 88% at 50% 50%, black 70%, transparent 100%)",
                    }}
                  >
                    <img
                      src="/logo.jpg"
                      alt="SCIRISE Logo"
                      className="w-full h-auto max-h-52 sm:max-h-64 object-contain mx-auto mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Brand Title & Taglines */}
                <div className="space-y-3 mb-6">
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-sky-600 to-blue-700">
                      SCIRISE
                    </span>
                  </h1>

                  <div className="flex items-center justify-center gap-2 text-xs sm:text-base font-black tracking-widest text-[#1e3a8a]">
                    <span>تعلمي</span>
                    <span>•</span>
                    <span>تدربي</span>
                    <span>•</span>
                    <span>ارتقي</span>
                    <span className="text-slate-300 mx-1">|</span>
                    <span className="text-slate-500 font-bold tracking-wider">LEARN • PRACTICE • RISE</span>
                  </div>
                </div>

                {/* Requested Official Educational Statement */}
                <div className="max-w-2xl mx-auto mb-6 px-4 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 border border-indigo-100/80 shadow-sm">
                  <p className="text-sm sm:text-lg md:text-xl font-bold text-slate-800 leading-relaxed">
                    منصة تعليمية تفاعلية لتنمية المهارات العلمية ورفع نواتج التعلم والاستعداد للاختبارات الوطنية ( نافس ) والمركزية
                  </p>
                </div>

                {/* School & Teacher Information */}
                <div className="space-y-3 mb-8">
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800">
                    المتوسطة <span className="text-primary">الثانية والثمانون</span>
                  </h2>
                  <div className="flex justify-center">
                    <div className="bg-white/90 px-6 py-2.5 rounded-xl border border-slate-100 shadow-sm text-sm sm:text-lg text-slate-600">
                      <span>معلمة المادة: </span>
                      <span className="font-black text-slate-900">أ/ هيفا السلمي</span>
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
