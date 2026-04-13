import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Target, Sparkles, BookOpen, Gamepad2, PlayCircle, Zap, Crown, Star, ArrowLeft, GraduationCap, Atom, Brain, Rocket, Check } from "lucide-react";
import { getCentralExamConfig, CentralExamConfig } from "@/services/centralExamService";
import { SaudiLoader } from "@/components/ui/SaudiLoader";

export default function CentralExamIntro() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<CentralExamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await getCentralExamConfig();
      if (!data || !data.is_active) {
        navigate("/student/dashboard"); // Redirect if not active
      } else {
        setConfig(data);
      }
    } catch (e) {
      navigate("/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><SaudiLoader /></div>;
  if (!config) return null;

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleStartExam = () => {
    // Navigate to the traditional premium exam UI
    navigate("/central-exam/play");
  };

  const handleStartGames = () => {
    // Navigate to Challenge Games page showing all 5 games
    navigate("/central-exam/games");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100 flex flex-col" dir="rtl">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-violet-300/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        
        {/* Animated floating shapes */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 30}px`,
              height: `${20 + Math.random() * 30}px`,
              background: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'][Math.floor(Math.random() * 6)],
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.15,
              filter: 'blur(2px)'
            }}
          />
        ))}
      </div>

      {/* Top Navigation Bar */}
      <div className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-white/50 px-4 py-4">
        <div className="container max-w-6xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/student/dashboard")} 
            className="text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-full px-4"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            <span className="font-bold">العودة للوحة التحكم</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-700 hidden sm:block">الاختبار المركزي</span>
          </div>
        </div>
      </div>

      <div className="flex-1 container max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Hero Header */}
        <div className="text-center space-y-6 mb-12 animate-in slide-in-from-top-8 duration-700">
          <div className="inline-flex items-center justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-1 shadow-2xl shadow-purple-500/30 animate-pulse">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Brain className="w-12 h-12 text-violet-600" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 text-3xl animate-bounce">✨</div>
              <div className="absolute -bottom-1 -left-2 text-2xl animate-bounce delay-100">⭐</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
              {config.title}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
              {config.description}
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  s === step 
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30 scale-110' 
                    : s < step 
                      ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white' 
                      : 'bg-slate-200 text-slate-400'
                }`}>
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-1 rounded-full transition-all duration-300 ${s < step ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Steps Container */}
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
          
          {/* Step 1: Grade Selection */}
          {step === 1 && (
            <Card className="w-full bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-purple-500/20 p-8 md:p-12 animate-in zoom-in duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 opacity-50" />
              
              <div className="relative z-10 text-center space-y-8">
                <div className="inline-flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
                    <GraduationCap className="w-10 h-10 text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-orange-600 font-bold text-sm">
                    الخطوة الأولى
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800">اختر مرحلتك الدراسية</h2>
                </div>
                
                <div 
                  onClick={handleNextStep}
                  className="cursor-pointer group relative bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-1 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="bg-white rounded-xl p-8 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-sm text-slate-500 font-medium mb-1">المرحلة الدراسية</p>
                      <p className="text-2xl md:text-3xl font-black text-slate-800">{config.grade}</p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ChevronRight className="w-7 h-7 text-violet-600 rotate-180" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Subject Selection */}
          {step === 2 && (
            <Card className="w-full bg-white/90 backdrop-blur-xl border-0 shadow-2xl shadow-blue-500/20 p-8 md:p-12 animate-in slide-in-from-right-10 duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 opacity-50" />
              
              <div className="relative z-10 text-center space-y-8">
                <div className="inline-flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
                    <Atom className="w-10 h-10 text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-600 font-bold text-sm">
                    الخطوة الثانية
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800">اختر المادة الدراسية</h2>
                </div>
                
                <div 
                  onClick={handleNextStep}
                  className="cursor-pointer group relative bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 p-1 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="bg-white rounded-xl p-8 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-sm text-slate-500 font-medium mb-1">المادة الدراسية</p>
                      <p className="text-2xl md:text-3xl font-black text-slate-800">{config.subject}</p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ChevronRight className="w-7 h-7 text-blue-600 rotate-180" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 3: Game Mode Selection */}
          {step === 3 && (
            <div className="w-full animate-in slide-in-from-bottom-10 duration-500 space-y-8">
              <div className="text-center space-y-3">
                <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-600 font-bold text-sm">
                  الخطوة الأخيرة
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800">اختر طريقة التقييم</h2>
                <p className="text-slate-500">اختار الطريقة اللي تناسبك للتعرف على مستواك</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traditional Exam Card */}
                <Card 
                  onClick={handleStartExam}
                  className="cursor-pointer group bg-white/90 backdrop-blur-xl border-0 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10 p-8 text-center space-y-6">
                    <div className="inline-flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                        <PlayCircle className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-800">اختبار تفاعلي</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        واجهة اختبار ذكية مع إحصائيات دقيقة ومؤثرات بصرية رائعة
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold group-hover:gap-3 transition-all">
                      ابدأ الاختبار <ChevronRight className="w-5 h-5 rotate-180" />
                    </div>
                  </div>
                </Card>

                {/* Games Card */}
                <Card 
                  onClick={handleStartGames}
                  className="cursor-pointer group bg-white/90 backdrop-blur-xl border-0 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10 p-8 text-center space-y-6">
                    <div className="inline-flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                        <Gamepad2 className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-800">ألعاب التحدي</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        قيّم مستواك من خلال 5 ألعاب تفاعلية مشوقة و ممتعة
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-violet-600 font-bold group-hover:gap-3 transition-all">
                      ابدأ اللعب <ChevronRight className="w-5 h-5 rotate-180" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
