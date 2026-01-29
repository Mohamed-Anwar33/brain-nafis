import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ResultScreen } from "@/components/exam/ResultScreen";
import { ExamResult } from "@/types/exam";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      if (!attemptId) {
        navigate("/");
        return;
      }

      // Try sessionStorage first
      const cached = sessionStorage.getItem(`result_${attemptId}`);
      if (cached) {
        setResult(JSON.parse(cached));
        setIsLoading(false);
        return;
      }

      // Fetch from database
      try {
        const { data, error } = await supabase
          .from("attempts")
          .select("*")
          .eq("id", attemptId)
          .maybeSingle();

        if (error || !data) {
          navigate("/");
          return;
        }

        setResult({
          student_name: data.student_name,
          score: data.score,
          question_count: data.question_count,
          total_penalty: data.total_penalty ?? 0,
          started_at: data.started_at ?? "",
          finished_at: data.finished_at ?? "",
        });
      } catch (err) {
        console.error("Error loading result:", err);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadResult();
  }, [attemptId, navigate]);

  if (isLoading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل النتيجة...</p>
        </div>
      </div>
    );
  }

  return <ResultScreen result={result} />;
}
