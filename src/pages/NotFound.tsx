import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Ghost, Home, Search, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 font-cairo" dir="rtl">

      {/* Animated Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[80px] animate-pulse delay-700"></div>
      </div>

      {/* Floating Icons Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <Ghost className="absolute top-20 right-20 w-16 h-16 text-slate-400 animate-bounce duration-[3000ms]" />
        <Search className="absolute bottom-40 left-20 w-12 h-12 text-blue-400 animate-bounce duration-[4000ms] delay-500" />
        <AlertCircle className="absolute top-40 left-1/4 w-10 h-10 text-red-400 animate-bounce duration-[3500ms] delay-200" />
        <Sparkles className="absolute bottom-20 right-1/3 w-14 h-14 text-yellow-400 animate-bounce duration-[4500ms] delay-700" />
      </div>

      {/* Main Content Card - Glassmorphism */}
      <div className="relative z-10 p-8 max-w-md w-full mx-4">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2rem] p-10 text-center transform transition-all hover:scale-[1.02] duration-500">

          {/* 404 Visual */}
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-2xl opacity-20 rounded-full"></div>
            <h1 className="relative text-[8rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600 select-none drop-shadow-sm">
              404
            </h1>
            <Ghost className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-white/10 rotate-12" />
          </div>

          {/* Text Content */}
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 px-4">
            عفواً... الصفحة تائهة!
          </h2>

          <p className="text-slate-500 text-lg mb-8 leading-relaxed">
            يبدو أن الصفحة التي تبحث عنها قد اختفت في الفضاء الرقمي، أو ربما أخذت استراحة قصيرة.
          </p>

          {/* Action Button */}
          <Link to="/">
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 rounded-full px-8 py-6 text-lg font-bold group transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <Home className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>

        {/* Footer Decor */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm font-medium">
            كود الخطأ: 404 Not Found
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
