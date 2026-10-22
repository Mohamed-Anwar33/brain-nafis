import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ResultScreen } from "@/components/exam/ResultScreen";
import { ExamResult } from "@/types/exam";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AttemptRow {
  student_name: string;
  score: number;
  question_count: number;
  total_penalty?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  selection_snapshot?: Record<string, unknown> | null;
}

interface AttemptAnswerRow {
  question_id: string;
  is_correct: boolean | null;
  is_practice?: boolean | null;
  answered_at?: string | null;
  questions?: { scientific_skill?: string | null; scientific_concept?: string | null } | null;
}

function summarizeSkills(answers: AttemptAnswerRow[]) {
  const bySkill = new Map<string, { correct: number; total: number; concepts: Set<string> }>();
  const finalAnswers = new Map<string, AttemptAnswerRow>();
  for (const answer of answers) if (!answer.is_practice) finalAnswers.set(answer.question_id, answer);
  for (const answer of finalAnswers.values()) {
    if (answer.is_practice || !answer.questions?.scientific_skill) continue;
    const skill = answer.questions.scientific_skill;
    const row = bySkill.get(skill) || { correct: 0, total: 0, concepts: new Set<string>() };
    row.total += 1;
    if (answer.is_correct) row.correct += 1;
    if (answer.questions.scientific_concept) row.concepts.add(answer.questions.scientific_concept);
    bySkill.set(skill, row);
  }
  return Array.from(bySkill, ([skill, row]) => ({ skill, correct: row.correct, total: row.total, percentage: Math.round(row.correct / row.total * 100), concepts: Array.from(row.concepts) }));
}

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
        const cachedResult = JSON.parse(cached) as ExamResult;
        if (cachedResult.skill_analysis) {
          setResult(cachedResult);
          setIsLoading(false);
          return;
        }
        const { data: cachedAnswers } = await supabase.from("attempt_answers")
          .select("question_id,is_correct,is_practice,answered_at,questions(scientific_skill,scientific_concept)")
          .eq("attempt_id", attemptId).order("answered_at", { ascending: true });
        cachedResult.skill_analysis = summarizeSkills((cachedAnswers || []) as unknown as AttemptAnswerRow[]);
        setResult(cachedResult);
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

        const { data: answersData } = await supabase.from("attempt_answers")
          .select("question_id,is_correct,is_practice,answered_at,questions(scientific_skill,scientific_concept)")
          .eq("attempt_id", attemptId).order("answered_at", { ascending: true });

        const row = data as unknown as AttemptRow;
        const snapshot = row.selection_snapshot || {};
        setResult({
          attempt_id: attemptId,
          student_name: row.student_name || "طالب",
          score: row.score || 0,
          question_count: row.question_count || 40,
          total_penalty: row.total_penalty ?? 0,
          started_at: row.started_at ?? "",
          finished_at: row.finished_at ?? "",
          stages_completed: typeof snapshot.stages_completed === "number" ? snapshot.stages_completed : 4,
          total_stages: typeof snapshot.total_stages === "number" ? snapshot.total_stages : 4,
          selection_snapshot: snapshot,
          skill_analysis: summarizeSkills((answersData || []) as unknown as AttemptAnswerRow[]),
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
