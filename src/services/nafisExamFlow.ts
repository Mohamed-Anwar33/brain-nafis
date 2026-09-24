import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SelectionContext } from "@/types/selection";
import {
  applySelectionFilters,
  getScopedPayload,
  getScopedHistoryIds,
  recordScopedHistory,
  resetScopedHistory,
} from "@/lib/selection-scope";
import { toast } from "sonner";

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

  let { data: allQuestionsData, error: questionsError } = await scopedQuestionsQuery;

  // Fallback: if no questions found with exact domain, try by grade_subject_id
  if ((!allQuestionsData || allQuestionsData.length === 0) && context.gradeSubjectId) {
    const fallbackRes = await supabase
      .from("questions")
      .select("*, choices(*)")
      .eq("active", true)
      .eq("grade_subject_id", context.gradeSubjectId);
    if (fallbackRes.data && fallbackRes.data.length > 0) {
      allQuestionsData = fallbackRes.data;
    }
  }

  // Fallback 2: Any active questions in the platform
  if (!allQuestionsData || allQuestionsData.length === 0) {
    const anyRes = await supabase
      .from("questions")
      .select("*, choices(*)")
      .eq("active", true)
      .limit(60);
    if (anyRes.data && anyRes.data.length > 0) {
      allQuestionsData = anyRes.data;
    }
  }

  if (questionsError && (!allQuestionsData || allQuestionsData.length === 0)) {
    throw questionsError;
  }

  const pool = (allQuestionsData || []) as any[];
  if (pool.length === 0) {
    toast.error("لا توجد أسئلة كافية في بنك الأسئلة حالياً لهذا المجال");
    return;
  }

  // 2. Filter out already seen questions for seamless continuous practice
  let availableQuestions = [...pool];
  if (userId) {
    try {
      const seenIds = await getScopedHistoryIds(userId, "exam", context);
      const unseen = pool.filter((q) => !seenIds.has(q.id));
      if (unseen.length >= 8) {
        availableQuestions = unseen;
      } else {
        // Reset history so questions loop endlessly
        await resetScopedHistory(userId, "exam", context);
        availableQuestions = pool;
      }
    } catch (e) {
      console.warn("History scoping warning, falling back to full pool:", e);
      availableQuestions = pool;
    }
  }

  // 3. Shuffle questions using Fisher-Yates
  const shuffled = [...availableQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 4. Determine batch questions (up to 40 questions, at least 4)
  const TARGET_QUESTIONS = Math.min(40, Math.max(4, shuffled.length));
  const STAGES_IN_ROUND = 4;
  const orderedQuestions = shuffled.slice(0, TARGET_QUESTIONS);
  const questionsPerStage = Math.max(1, Math.ceil(orderedQuestions.length / STAGES_IN_ROUND));
  const totalStages = nextStageStart + STAGES_IN_ROUND - 1; // e.g. 5 + 4 - 1 = 8

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

  // 6. Record seen question IDs
  if (userId) {
    try {
      await recordScopedHistory(
        userId,
        "exam",
        orderedQuestions.map((q) => q.id),
        context,
      );
    } catch (e) {
      console.warn("Error recording seen questions:", e);
    }
  }

  // 7. Map questions with their relative and absolute stage numbers
  const examQuestions = orderedQuestions.map((question, index: number) => {
    const stageOffset = Math.min(STAGES_IN_ROUND - 1, Math.floor(index / questionsPerStage));
    const stageNumber = nextStageStart + stageOffset;

    return {
      id: question.id,
      text: question.text,
      image_url: question.image_url,
      wrong_reason: question.wrong_reason,
      explanation_url: question.explanation_url,
      stage_number: stageNumber,
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
