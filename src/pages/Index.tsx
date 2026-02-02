import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StartScreen } from "@/components/exam/StartScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useState(() => {
    checkSession();
  });

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from("student_profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          navigate("/student/dashboard");
        }
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setIsLoading(false);
    }
  }


  const [authError, setAuthError] = useState<string | null>(null);

  const handleStart = async (studentName: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      console.log("Starting anonymous login flow...");

      // 1. Ensure Auth Session (Anonymous)
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log("No active session, signing in anonymously...");
        const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();

        if (authErr) {
          console.error("Anonymous Sign-in Error:", authErr);
          if (authErr.message.includes("Anonymous sign-ins are disabled")) {
            setAuthError("AuthDisabled");
            setIsLoading(false);
            return;
          }
          throw authErr;
        }
        session = authData.session;
      }

      if (!session?.user) throw new Error("فشل إنشاء جلسة للمستخدم");

      // 2. Create/Update Profile with Name
      const { error: profileError } = await supabase
        .from("student_profiles")
        .upsert({
          id: session.user.id,
          full_name: studentName,
          stage: 'default',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Profile Upsert Error:", profileError);
        toast.error("فشل حفظ بيانات الطالب. يرجى المحاولة مرة أخرى.");
        throw profileError;
      }

      navigate("/student/dashboard");

    } catch (err: any) {
      console.error("Error in handleStart:", err);
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      setIsLoading(false);
    }
  };

  if (authError === "AuthDisabled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-r-4 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ تنبيه هام للمطور</h2>
          <p className="text-gray-700 mb-4">
            خاصية <strong>Anonymous Sign-ins</strong> غير مفعلة في مشروع Supabase الخاص بك.
          </p>
          <div className="bg-gray-100 p-4 rounded-md text-sm text-gray-800 mb-6">
            1. اذهب إلى <strong>Supabase Dashboard</strong><br />
            2. انتقل إلى <strong>Authentication</strong> &gt; <strong>Providers</strong><br />
            3. اضغط على <strong>Anonymous</strong> وقم بتفعيله (Enable).
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
    // Safety timeout: if loading takes too long (> 15s), show a retry button
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 15000);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-500 animate-pulse">جاري الاتصال...</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-500 hover:underline mt-4"
        >
          تحديث الصفحة في حال استغراق وقت طويل
        </button>
      </div>
    );
  }

  return <StartScreen onStart={handleStart} isLoading={isLoading} />;
};

export default Index;
