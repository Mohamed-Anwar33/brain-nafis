export interface Choice {
  id: string;
  text: string;
  is_correct?: boolean;
  image_url?: string;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
  image_url?: string;
  wrong_reason?: string | null;
  stage_number?: number | null;
}

export interface ExamQuestion extends Question {
  order_index: number;
}

export interface AttemptData {
  attempt_id: string;
  student_name: string;
  question_count: number;
  score: number;
  selection_snapshot?: Record<string, unknown>;
  questions: ExamQuestion[];
}

export interface AnswerResponse {
  correct: boolean;
  score: number;
  wrong_count?: number;
  penalty_applied?: boolean;
}

export interface ExamResult {
  student_name: string;
  score: number;
  question_count: number;
  total_penalty: number;
  started_at: string;
  finished_at: string;
}

export interface Settings {
  exam_question_count: number;
  updated_at: string;
}
