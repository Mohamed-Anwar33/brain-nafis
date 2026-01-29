import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StartScreen } from "@/components/exam/StartScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async (studentName: string) => {
    setIsLoading(true);

    const startExam = async (retryCount = 0): Promise<void> => {
      try {
        const { data, error } = await supabase.functions.invoke("exam-start", {
          body: { student_name: studentName },
        });

        if (error) {
          // Check for 401 Unauthorized
          if (error instanceof Error && error.message.includes("401") && retryCount === 0) {
            console.log("Encountered 401, signing out and retrying...");
            await supabase.auth.signOut();
            return startExam(1);
          }
          throw error;
        }

        if (data.error) {
          toast.error(data.error);
          return;
        }

        // Store exam data in sessionStorage for fast access
        sessionStorage.setItem(`exam_${data.attempt_id}`, JSON.stringify(data));

        // Navigate to exam
        navigate(`/exam/${data.attempt_id}`);
      } catch (err: any) {
        // Also catch if it throws directly
        if (err?.context?.status === 401 && retryCount === 0) {
          console.log("Caught 401 exception, signing out and retrying...");
          await supabase.auth.signOut();
          return startExam(1);
        }

        console.error("Error starting exam:", err);
        toast.error("حدث خطأ أثناء بدء الاختبار. يرجى المحاولة مرة أخرى.");
      }
    };

    await startExam();
    setIsLoading(false);
  };

  return <StartScreen onStart={handleStart} isLoading={isLoading} />;
};

export default Index;
