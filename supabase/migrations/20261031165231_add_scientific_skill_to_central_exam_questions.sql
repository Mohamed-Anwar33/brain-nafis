alter table public.central_exam_questions
  add column if not exists scientific_skill text;

create index if not exists idx_central_exam_questions_skill
  on public.central_exam_questions (grade_subject_id, domain_id, scientific_skill)
  where active = true and scientific_skill is not null;
