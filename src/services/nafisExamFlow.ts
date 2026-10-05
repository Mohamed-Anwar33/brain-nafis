import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SelectionContext } from "@/types/selection";
import {
  applySelectionFilters,
  getScopedPayload,
} from "@/lib/selection-scope";
import { toast } from "sonner";
import { selectNafisRoundQuestions } from "@/lib/nafis-quick-quiz";

interface StartNafisRoundOptions {
  context: SelectionContext;
  nextStageStart: number; // e.g. 1, 5, 9, 13...
  studentName?: string;
  navigate: NavigateFunction;
}

export async function startNafisStagesRound({
  context,
  nextStageStart,
  studentName = "طالب",
  navigate,
}: StartNafisRoundOptions): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userId: string | null = session?.user?.id || null;
  if (!userId) {
    const { data: anonData } = await supabase.auth.signInAnonymously();
    userId = anonData?.user?.id || null;
  }

  // 1. Fetch available active questions
  const scopedQuestionsQuery = applySelectionFilters(
    supabase
      .from("questions")
      .select("*, choices(*)")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    context,
  );

  const { data: allQuestionsData, error: questionsError } = await scopedQuestionsQuery;

  if (questionsError) throw questionsError;

  const pool = (allQuestionsData || []) as any[];
  if (pool.length === 0) {
    toast.error("لا توجد أسئلة كافية في بنك الأسئلة حالياً لهذا المجال");
    return;
  }

  // Use a fixed question order, then split the student round into groups of ten.
  const { data: stageTitles, error: stagesError } = await supabase
    .from("stage_titles").select("stage_number, is_active, display_order");
  if (stagesError) throw stagesError;
  const stages = (stageTitles || []) as unknown as { stage_number: number; is_active: boolean | null; display_order: number | null }[];
  const displayOrder = Object.fromEntries(stages.map(stage => [stage.stage_number, stage.display_order ?? stage.stage_number]));
  const activePool = stages.length ? pool.filter(question =>
    stages.some(stage => stage.stage_number === (question.stage_number ?? 1) && stage.is_active !== false),
  ) : pool;
  const orderedQuestions = selectNafisRoundQuestions(activePool, nextStageStart, displayOrder);
  if (!orderedQuestions.length) {
    toast.error("لا توجد أسئلة متاحة لهذه المراحل في المجال المحدد");
    return;
  }
  const totalStages = Math.max(...orderedQuestions.map(q => q.stage_number ?? 1));

  // 5. Create attempt in database
  const scopedPayload = getScopedPayload(context);
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .insert({
      student_name: studentName,
      score: 0,
      question_count: orderedQuestions.length,
      ...scopedPayload,
      selection_snapshot: {
        ...scopedPayload.selection_snapshot,
        stage_start: nextStageStart,
        total_stages: totalStages,
        stages_completed: nextStageStart - 1,
        round_number: Math.floor((nextStageStart - 1) / 4) + 1,
      },
    })
    .select()
    .single();

  if (attemptError) {
    console.error("Error creating attempt:", attemptError);
    throw attemptError;
  }

  const attemptRow = attempt as unknown as { id: string };

  // 7. Map questions with their relative and absolute stage numbers
  const examQuestions = orderedQuestions.map((question, index: number) => {
    return {
      id: question.id,
      text: question.text,
      image_url: question.image_url,
      wrong_reason: question.wrong_reason,
      explanation_url: question.explanation_url,
      stage_number: question.stage_number ?? 1,
      order_index: index,
      choices: (question.choices || []).map((choice: any) => ({
        id: choice.id,
        text: choice.text,
        image_url: choice.image_url,
        is_correct: choice.is_correct,
      })),
    };
  });

  const attemptData = {
    attempt_id: attemptRow.id,
    student_name: studentName,
    question_count: examQuestions.length,
    score: 0,
    selection_snapshot: {
      ...scopedPayload.selection_snapshot,
      stage_start: nextStageStart,
      total_stages: totalStages,
      stages_completed: nextStageStart - 1,
      round_number: Math.floor((nextStageStart - 1) / 4) + 1,
    },
    questions: examQuestions,
  };

  sessionStorage.setItem(`exam_${attemptRow.id}`, JSON.stringify(attemptData));
  navigate(`/exam/${attemptRow.id}`);
}
