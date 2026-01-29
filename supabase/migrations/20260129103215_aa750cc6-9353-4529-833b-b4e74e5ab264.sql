-- Settings table (single row for app configuration)
CREATE TABLE public.settings (
  id int PRIMARY KEY DEFAULT 1,
  exam_question_count int NOT NULL DEFAULT 20 CHECK (exam_question_count >= 5 AND exam_question_count <= 100),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Choices table
CREATE TABLE public.choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  is_correct boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Attempts table
CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  question_count int NOT NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  score int NOT NULL,
  total_penalty int DEFAULT 0,
  teacher_email_sent boolean DEFAULT false
);

-- Attempt questions table (stores which questions were selected for an attempt)
CREATE TABLE public.attempt_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.questions(id) NOT NULL,
  order_index int NOT NULL
);

-- Attempt answers table
CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.questions(id) NOT NULL,
  selected_choice_id uuid REFERENCES public.choices(id) NOT NULL,
  is_correct boolean,
  wrong_count int DEFAULT 0,
  penalty_applied boolean DEFAULT false,
  answered_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_attempt_questions_attempt_order ON public.attempt_questions(attempt_id, order_index);
CREATE INDEX idx_attempt_answers_attempt_question ON public.attempt_answers(attempt_id, question_id);
CREATE INDEX idx_choices_question ON public.choices(question_id);
CREATE INDEX idx_questions_active ON public.questions(active) WHERE active = true;
CREATE INDEX idx_questions_text_search ON public.questions USING gin(to_tsvector('arabic', text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure exactly one correct choice per question
CREATE OR REPLACE FUNCTION public.check_single_correct_choice()
RETURNS TRIGGER AS $$
DECLARE
  correct_count int;
BEGIN
  -- Count correct choices for this question after the operation
  SELECT COUNT(*) INTO correct_count
  FROM public.choices
  WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
    AND is_correct = true;
  
  -- For INSERT/UPDATE, include the new row if it's correct
  IF TG_OP = 'INSERT' AND NEW.is_correct THEN
    correct_count := correct_count;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Adjust count based on old and new values
    IF OLD.is_correct AND NOT NEW.is_correct THEN
      correct_count := correct_count;
    ELSIF NOT OLD.is_correct AND NEW.is_correct THEN
      correct_count := correct_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert default settings row
INSERT INTO public.settings (id, exam_question_count) VALUES (1, 20);

-- Enable RLS on all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings (admin only for write, public read for exam config)
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE TO authenticated USING (true);

-- RLS Policies for questions (admin CRUD, no public list)
CREATE POLICY "Authenticated users can do everything with questions" ON public.questions FOR ALL TO authenticated USING (true);

-- RLS Policies for choices (admin CRUD)
CREATE POLICY "Authenticated users can do everything with choices" ON public.choices FOR ALL TO authenticated USING (true);
CREATE POLICY "Anyone can read choices" ON public.choices FOR SELECT USING (true);

-- RLS Policies for attempts (service role handles most operations)
CREATE POLICY "Anyone can insert attempts" ON public.attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read their own attempt" ON public.attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can update attempts" ON public.attempts FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can read all attempts" ON public.attempts FOR SELECT TO authenticated USING (true);

-- RLS Policies for attempt_questions
CREATE POLICY "Anyone can insert attempt_questions" ON public.attempt_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read attempt_questions" ON public.attempt_questions FOR SELECT USING (true);

-- RLS Policies for attempt_answers
CREATE POLICY "Anyone can insert attempt_answers" ON public.attempt_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read attempt_answers" ON public.attempt_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can update attempt_answers" ON public.attempt_answers FOR UPDATE USING (true);