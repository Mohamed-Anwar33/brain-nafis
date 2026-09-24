import { supabase } from "@/integrations/supabase/client";
import { applySelectionFilters } from "@/lib/selection-scope";
import { SelectionContext } from "@/types/selection";

export interface CentralExamConfig {
  id: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  is_active: boolean;
}

export interface CentralExamQuestion {
  id: string;
  text: string;
  image_url: string | null;
  active: boolean;
  order_index: number;
  stage_number?: number | null;
  created_at?: string;
  track_type?: "nafis" | "central";
  grade_subject_id?: string | null;
  domain_id?: string | null;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  choices?: CentralExamChoice[];
}

export interface CentralExamChoice {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  image_url?: string | null;
}

export type CentralExamChoiceInput = Omit<
  CentralExamChoice,
  "id" | "question_id"
>;

// ==========================================
// Config Services
// ==========================================

export async function getCentralExamConfig(): Promise<CentralExamConfig | null> {
  const { data, error } = await supabase
    .from("central_exam_configs")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    if (error.code !== "PGRST116") { // Skip "Row not found" error logging
      console.error("Error fetching central exam config:", error);
    }
    return null;
  }
  return data as unknown as CentralExamConfig;
}

export async function updateCentralExamConfig(config: Partial<CentralExamConfig>): Promise<boolean> {
  const { id, ...updates } = config;
  
  if (!id) return false;

  const { error } = await supabase
    .from("central_exam_configs")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating config:", error);
    return false;
  }
  
  return true;
}

export async function toggleCentralExam(id: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("central_exam_configs")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("Error toggling config:", error);
    return false;
  }
  return true;
}

// ==========================================
// Question Services
// ==========================================

export async function getCentralExamQuestions(context?: SelectionContext) {
  let query = supabase
    .from("central_exam_questions")
    .select(`
      *,
      choices:central_exam_choices(*)
    `)
    .order("order_index", { ascending: true });

  if (context) {
    query = applySelectionFilters(query, context);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching questions:", error);
    throw error;
  }

  return data as CentralExamQuestion[];
}

export async function createCentralExamQuestion(
  question: Omit<CentralExamQuestion, 'id' | 'choices'>,
  choices: CentralExamChoiceInput[]
) {
  // Build a safe payload containing only recognized columns on central_exam_questions
  const insertPayload: Record<string, unknown> = {
    text: question.text,
    image_url: question.image_url || null,
    active: question.active ?? true,
    order_index: question.order_index ?? 0,
    track_type: question.track_type || "central",
    grade_subject_id: question.grade_subject_id || null,
    domain_id: question.domain_id || null,
    wrong_reason: question.wrong_reason || null,
    explanation_url: question.explanation_url || null,
  };

  let { data: qData, error: qError } = await supabase
    .from("central_exam_questions")
    .insert(insertPayload)
    .select()
    .single();

  // If explanation_url column is not yet present on remote DB, fallback gracefully
  if (qError && (qError.code === "42703" || qError.message?.includes("explanation_url") || qError.message?.includes("PGRST204"))) {
    if (qError.message?.includes("explanation_url") || qError.code === "42703") {
      const fallbackReason = question.explanation_url
        ? (question.wrong_reason ? `${question.wrong_reason}\n${question.explanation_url}` : question.explanation_url)
        : question.wrong_reason || null;
      delete insertPayload.explanation_url;
      insertPayload.wrong_reason = fallbackReason;
      const retry = await supabase
        .from("central_exam_questions")
        .insert(insertPayload)
        .select()
        .single();
      qData = retry.data;
      qError = retry.error;
    }
  }

  // General fallback: if any unexpected column error occurred, retry with essential fields
  if (qError && (qError.code === "42703" || qError.code === "PGRST204")) {
    console.warn("Retrying central question insert with essential payload due to schema mismatch:", qError);
    const minimalPayload: Record<string, unknown> = {
      text: question.text,
      image_url: question.image_url || null,
      active: question.active ?? true,
      order_index: question.order_index ?? 0,
      track_type: "central",
      grade_subject_id: question.grade_subject_id || null,
      domain_id: question.domain_id || null,
      wrong_reason: question.wrong_reason || null,
    };
    const retry = await supabase
      .from("central_exam_questions")
      .insert(minimalPayload)
      .select()
      .single();
    qData = retry.data;
    qError = retry.error;
  }

  if (qError) {
    console.error("Error creating central exam question:", qError);
    throw qError;
  }

  const inserted = qData as unknown as { id: string };
  const choicesToInsert = choices.map(c => ({
    text: c.text!,
    is_correct: !!c.is_correct,
    image_url: c.image_url || null,
    question_id: inserted.id
  }));

  const { error: cError } = await supabase
    .from("central_exam_choices")
    .insert(choicesToInsert);

  if (cError) {
    console.error("Error inserting central exam choices:", cError);
    // Cleanup created question to avoid orphan question without choices
    await supabase.from("central_exam_questions").delete().eq("id", inserted.id);
    throw cError;
  }

  return qData;
}

export async function updateCentralExamQuestion(
  questionId: string,
  question: Partial<CentralExamQuestion>,
  choices?: (Partial<CentralExamChoice> & { id?: string })[]
) {
  const updatePayload: Record<string, unknown> = {};
  if (question.text !== undefined) updatePayload.text = question.text;
  if (question.image_url !== undefined) updatePayload.image_url = question.image_url || null;
  if (question.active !== undefined) updatePayload.active = question.active;
  if (question.order_index !== undefined) updatePayload.order_index = question.order_index;
  if (question.track_type !== undefined) updatePayload.track_type = question.track_type;
  if (question.grade_subject_id !== undefined) updatePayload.grade_subject_id = question.grade_subject_id || null;
  if (question.domain_id !== undefined) updatePayload.domain_id = question.domain_id || null;
  if (question.wrong_reason !== undefined) updatePayload.wrong_reason = question.wrong_reason || null;
  if (question.explanation_url !== undefined) updatePayload.explanation_url = question.explanation_url || null;

  let { error: qError } = await supabase
    .from("central_exam_questions")
    .update(updatePayload)
    .eq("id", questionId);

  // If explanation_url column is not yet present on remote DB, fallback gracefully
  if (qError && (qError.code === "42703" || qError.message?.includes("explanation_url"))) {
    const fallbackReason = question.explanation_url
      ? (question.wrong_reason ? `${question.wrong_reason}\n${question.explanation_url}` : question.explanation_url)
      : question.wrong_reason || null;
    delete updatePayload.explanation_url;
    updatePayload.wrong_reason = fallbackReason;
    const retry = await supabase
      .from("central_exam_questions")
      .update(updatePayload)
      .eq("id", questionId);
    qError = retry.error;
  }

  if (qError) {
    console.error("Error updating central exam question:", qError);
    throw qError;
  }

  if (choices && choices.length > 0) {
    // Basic sync: delete old, insert new (for simplicity and safety)
    const { error: delError } = await supabase
      .from("central_exam_choices")
      .delete()
      .eq('question_id', questionId);

    if (delError) {
      console.error("Error deleting old choices:", delError);
      throw delError;
    }

    const choicesToInsert = choices.map(c => ({
      text: c.text!,
      is_correct: !!c.is_correct,
      image_url: c.image_url || null,
      question_id: questionId
    }));

    const { error: insError } = await supabase
      .from("central_exam_choices")
      .insert(choicesToInsert);

    if (insError) {
      console.error("Error inserting updated choices:", insError);
      throw insError;
    }
  }

  return true;
}

export async function deleteCentralExamQuestion(questionId: string) {
  // First delete associated choices to be safe if CASCADE is not configured
  await supabase.from("central_exam_choices").delete().eq("question_id", questionId);
  const { error } = await supabase
    .from("central_exam_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    console.error("Error deleting central exam question:", error);
    throw error;
  }
  return true;
}
