import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StartScreen } from "@/components/exam/StartScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import PremiumBackground from "@/components/ui/PremiumBackground";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Non-blocking background session health check
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (
        error?.message?.includes("Invalid Refresh Token") ||
        error?.message?.includes("Refresh Token Not Found")
      ) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch {
      // Non-fatal, do not block student
    }
  }

  const handleStart = async (studentName: string) => {
    const cleanName = studentName.trim();
    if (!cleanName) return;

    // 1. Instantaneous synchronous persistence so all pages know the student immediately
    localStorage.setItem("student_name", cleanName);
    sessionStorage.setItem("student_name", cleanName);

    // 2. Immediate optimistic transition to student dashboard (0ms latency!)
    navigate("/student/dashboard");

    // 3. Fast background persistence to Supabase
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData?.session?.user;

        if (!user) {
          const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
          if (!authErr && authData?.session?.user) {
            user = authData.session.user;
          }
        }

        if (user) {
          await supabase.from("student_profiles").upsert({
            id: user.id,
            full_name: cleanName,
            stage: "default",
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("Background student profile sync:", err);
      }
    })();
  };

  if (authError === "AuthDisabled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-r-4 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-4">تنبيه هام للمطور</h2>
          <p className="text-gray-700 mb-4">
            خاصية <strong>Anonymous Sign-ins</strong> غير مفعلة في مشروع Supabase.
          </p>
          <div className="bg-gray-100 p-4 rounded-md text-sm text-gray-800 mb-6">
            1. اذهب إلى <strong>Supabase Dashboard</strong>
            <br />
            2. انتقل إلى <strong>Authentication</strong> &gt; <strong>Providers</strong>
            <br />
            3. اضغط على <strong>Anonymous</strong> وقم بتفعيله.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 transition"
          >
            تم التفعيل، تحديث الصفحة
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 15000);

    return (
      <PremiumBackground>
        <div className="min-h-screen flex items-center justify-center flex-col gap-8">
          <SaudiLoader text="جاري تجهيز عالم التحدي..." />
          <button
            onClick={() => window.location.reload()}
            className="text-lg text-slate-400 hover:text-white hover:underline transition-colors mt-8 bg-transparent border-none cursor-pointer font-bold"
          >
            تحديث الصفحة إذا تأخر التحميل
          </button>
        </div>
      </PremiumBackground>
    );
  }

  return <StartScreen onStart={handleStart} isLoading={isLoading} />;
};

export default Index;
