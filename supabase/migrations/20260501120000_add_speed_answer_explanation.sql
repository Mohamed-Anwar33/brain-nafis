alter table public.speed_challenge_questions
add column if not exists answer_explanation text default null;
