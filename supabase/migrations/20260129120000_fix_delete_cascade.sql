-- Drop existing constraints
ALTER TABLE public.attempt_questions DROP CONSTRAINT IF EXISTS attempt_questions_question_id_fkey;
ALTER TABLE public.attempt_answers DROP CONSTRAINT IF EXISTS attempt_answers_question_id_fkey;
ALTER TABLE public.attempt_answers DROP CONSTRAINT IF EXISTS attempt_answers_selected_choice_id_fkey;

-- Re-add constraints with ON DELETE CASCADE
ALTER TABLE public.attempt_questions
  ADD CONSTRAINT attempt_questions_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.attempt_answers
  ADD CONSTRAINT attempt_answers_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.attempt_answers
  ADD CONSTRAINT attempt_answers_selected_choice_id_fkey
  FOREIGN KEY (selected_choice_id) REFERENCES public.choices(id) ON DELETE CASCADE;
