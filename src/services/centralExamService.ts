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
  track_type?: "nafis" | "central";
  grade_subject_id?: string | null;
  domain_id?: string | null;
  wrong_reason?: string | null;
  choices?: CentralExamChoice[];
}

export interface CentralExamChoice {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
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
  const { data: qData, error: qError } = await supabase
    .from("central_exam_questions")
    .insert(question)
    .select()
    .single();

  if (qError) throw qError;

  const inserted = qData as unknown as { id: string };
  const choicesToInsert = choices.map(c => ({
    ...c,
    question_id: inserted.id
  }));

  const { error: cError } = await supabase
    .from("central_exam_choices")
    .insert(choicesToInsert);

  if (cError) throw cError;

  return qData;
}

export async function updateCentralExamQuestion(
  questionId: string,
  question: Partial<CentralExamQuestion>,
  choices?: (Partial<CentralExamChoice> & { id?: string })[]
) {
  const { error: qError } = await supabase
    .from("central_exam_questions")
    .update(question)
    .eq("id", questionId);

  if (qError) throw qError;

  if (choices && choices.length > 0) {
    // Basic sync: delete old, insert new (for simplicity and safety)
    const { error: delError } = await supabase
      .from("central_exam_choices")
      .delete()
      .eq('question_id', questionId);

    if (delError) throw delError;

    const choicesToInsert = choices.map(c => ({
      text: c.text!,
      is_correct: c.is_correct || false,
      question_id: questionId
    }));

    const { error: insError } = await supabase
      .from("central_exam_choices")
      .insert(choicesToInsert);

    if (insError) throw insError;
  }

  return true;
}

export async function deleteCentralExamQuestion(questionId: string) {
  const { error } = await supabase
    .from("central_exam_questions")
    .delete()
    .eq("id", questionId);

  if (error) throw error;
  return true;
}
