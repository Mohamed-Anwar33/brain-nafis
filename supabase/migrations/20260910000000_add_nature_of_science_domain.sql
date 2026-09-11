-- ===================================================================
-- Migration: Add Nature of Science (طبيعة العلم) Central Domain
-- ===================================================================

do $$
declare
  gs_rec record;
begin
  for gs_rec in
    select id from public.study_grade_subjects where is_active = true
  loop
    insert into public.central_domains (grade_subject_id, name, slug, sort_order, is_active)
    values (
      gs_rec.id,
      U&'\0637\0628\064A\0639\0629 \0627\0644\0639\0644\0645', -- طبيعة العلم
      'nature_of_science',
      6,
      true
    )
    on conflict (grade_subject_id, name) do update
    set slug = excluded.slug,
        sort_order = 6,
        is_active = true;
  end loop;
end $$;
