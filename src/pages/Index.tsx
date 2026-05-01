import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StartScreen } from "@/components/exam/StartScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import PremiumBackground from "@/components/ui/PremiumBackground";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { error } = await supabase.auth.getSession();

      if (
        error?.message.includes("Invalid Refresh Token") ||
        error?.message.includes("Refresh Token Not Found")
      ) {
        console.log("Stale session detected, clearing...");
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Session check error:", error);
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  const handleStart = async (studentName: string) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      console.log("Starting anonymous login flow...", { enteredName: studentName });

      // Shared classroom devices can keep the previous student's anonymous session
      // in localStorage. Always create a fresh user before saving the entered name.
      await supabase.auth.signOut();

      const { data, error: authErr } = await supabase.auth.signInAnonymously();

      if (authErr) {
        console.error("Anonymous Sign-in Error:", authErr);
        if (authErr.message.includes("Anonymous sign-ins are disabled")) {
          setAuthError("AuthDisabled");
          setIsLoading(false);
          return;
        }
        throw authErr;
      }

      if (!data.session?.user) {
        throw new Error("فشل إنشاء جلسة للمستخدم");
      }

      const { error: profileError } = await supabase
        .from("student_profiles")
        .upsert({
          id: data.session.user.id,
          full_name: studentName,
          stage: "default",
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error("Profile Upsert Error:", profileError);
        toast.error("فشل حفظ بيانات الطالب. يرجى المحاولة مرة أخرى.");
        throw profileError;
      }

      navigate("/student/dashboard");
    } catch (err) {
      console.error("Error in handleStart:", err);
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      setIsLoading(false);
    }
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
