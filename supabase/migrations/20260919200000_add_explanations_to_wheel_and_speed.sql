-- Add explanation_url and wrong_reason to wheel questions, and explanation_url to speed challenge questions
ALTER TABLE public.wheel_section_questions 
ADD COLUMN IF NOT EXISTS wrong_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS explanation_url TEXT DEFAULT NULL;

ALTER TABLE public.speed_challenge_questions 
ADD COLUMN IF NOT EXISTS explanation_url TEXT DEFAULT NULL;
