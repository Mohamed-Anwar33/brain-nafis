-- ===================================================================
-- Migration: Add explanation_url and Central Domains (Biology & Earth)
-- ===================================================================

-- 1. Add explanation_url to questions and central_exam_questions
alter table public.questions
add column if not exists explanation_url text;

alter table public.central_exam_questions
add column if not exists explanation_url text;

-- 2. Add Biology and Earth Science central domains for default grade subjects
do $$
declare
  gs_rec record;
begin
  for gs_rec in
    select id from public.study_grade_subjects where is_active = true
  loop
    -- 2.1 Biology domain
    insert into public.central_domains (grade_subject_id, name, slug, sort_order, is_active)
    values (
      gs_rec.id,
      U&'\0627\0644\0623\062D\064A\0627\0621', -- الأحياء
      'biology',
      4,
      true
    )
    on conflict (grade_subject_id, name) do update
    set slug = excluded.slug,
        is_active = true;

    -- 2.2 Earth & Space Science domain
    insert into public.central_domains (grade_subject_id, name, slug, sort_order, is_active)
    values (
      gs_rec.id,
      U&'\0639\0644\0648\0645 \0627\0644\0623\0631\0636 \0648\0627\0644\0641\0636\0627\0621', -- علوم الأرض والفضاء
      'earth_science',
      5,
      true
    )
    on conflict (grade_subject_id, name) do update
    set slug = excluded.slug,
        is_active = true;
  end loop;
end $$;
