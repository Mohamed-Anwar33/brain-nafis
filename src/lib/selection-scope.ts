import { PostgrestFilterBuilder } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { buildSelectionSnapshot } from "@/lib/selection-context";
import { SelectionContext } from "@/types/selection";

type QueryLike = PostgrestFilterBuilder<
  Database["public"],
  Record<string, unknown>,
  Record<string, unknown>[],
  unknown
>;

export type ScopedHistoryGameType =
  | "exam"
  | "matching"
  | "ordering"
  | "speed"
  | "stages"
  | "wheel_science"
  | "central_exam";

interface ScopeColumnOptions {
  trackColumn?: string;
  gradeSubjectColumn?: string;
  domainColumn?: string;
}

export function getScopedPayload(context: SelectionContext) {
  return {
    track_type: context.trackType,
    grade_subject_id: context.gradeSubjectId,
    domain_id: context.trackType === "central" ? context.domainId || null : null,
    selection_snapshot: buildSelectionSnapshot(context),
  };
}

export function applySelectionFilters<TQuery extends QueryLike>(
  query: TQuery,
  context: SelectionContext,
  options?: ScopeColumnOptions,
) {
  const trackColumn = options?.trackColumn ?? "track_type";
  const gradeSubjectColumn = options?.gradeSubjectColumn ?? "grade_subject_id";
  const domainColumn = options?.domainColumn ?? "domain_id";

  let scopedQuery = query.eq(trackColumn, context.trackType).eq(
    gradeSubjectColumn,
    context.gradeSubjectId,
  );

  if (context.trackType === "central" && context.domainId) {
    scopedQuery = scopedQuery.eq(domainColumn, context.domainId);
  }

  return scopedQuery;
}

function withHistoryScope<TQuery extends QueryLike>(
  query: TQuery,
  userId: string,
  gameType: ScopedHistoryGameType,
  context: SelectionContext,
) {
  let scopedQuery = query
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .eq("track_type", context.trackType)
    .eq("grade_subject_id", context.gradeSubjectId);

  if (context.trackType === "central" && context.domainId) {
    scopedQuery = scopedQuery.eq("domain_id", context.domainId);
  }

  return scopedQuery;
}

export async function getScopedHistoryIds(
  userId: string,
  gameType: ScopedHistoryGameType,
  context: SelectionContext,
) {
  const query = withHistoryScope(
    supabase.from("student_question_history").select("question_id"),
    userId,
    gameType,
    context,
  );

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return new Set((data || []).map((item) => item.question_id));
}

export async function resetScopedHistory(
  userId: string,
  gameType: ScopedHistoryGameType,
  context: SelectionContext,
) {
  const query = withHistoryScope(
    supabase.from("student_question_history").delete(),
    userId,
    gameType,
    context,
  );

  const { error } = await query;
  if (error) {
    throw error;
  }
}

export async function recordScopedHistory(
  userId: string,
  gameType: ScopedHistoryGameType,
  questionIds: string[],
  context: SelectionContext,
) {
  if (questionIds.length === 0) {
    return;
  }

  const rows = questionIds.map((questionId) => ({
    user_id: userId,
    question_id: questionId,
    game_type: gameType,
    ...getScopedPayload(context),
  }));

  const { error } = await supabase
    .from("student_question_history")
    .upsert(rows, {
      onConflict:
        "user_id,question_id,game_type,track_type,grade_subject_id,domain_id",
      ignoreDuplicates: true,
    });

  if (error) {
    throw error;
  }
}
