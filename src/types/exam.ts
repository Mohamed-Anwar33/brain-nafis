export interface Choice {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

export interface ExamQuestion extends Question {
  order_index: number;
}

export interface AttemptData {
  attempt_id: string;
  student_name: string;
  question_count: number;
  score: number;
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
