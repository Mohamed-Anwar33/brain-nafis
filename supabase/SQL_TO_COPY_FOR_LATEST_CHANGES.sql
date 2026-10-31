-- SQL required by the latest scientific-activities updates.
-- The app filters by domain_id; existing activity rows still need their
-- correct domain assigned in the admin panel if those values are currently NULL.

begin;

alter table public.scientific_readings
  add column if not exists domain_id uuid references public.central_domains(id) on delete set null,
  add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
  add column if not exists image_url text;

alter table public.virtual_lab_activities
  add column if not exists domain_id uuid references public.central_domains(id) on delete set null,
  add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null;

commit;
