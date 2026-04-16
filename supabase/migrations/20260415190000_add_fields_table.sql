-- ==========================================
-- Central domains + domain scoped validation
-- ==========================================

create table if not exists public.central_domains (
  id uuid primary key default gen_random_uuid(),
  grade_subject_id uuid not null references public.study_grade_subjects(id) on delete cascade,
  name text not null,
  slug text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_subject_id, name)
);

alter table public.central_domains enable row level security;

drop policy if exists "Public read central domains" on public.central_domains;
create policy "Public read central domains"
on public.central_domains
for select
using (is_active = true);

drop policy if exists "Admin manage central domains" on public.central_domains;
create policy "Admin manage central domains"
on public.central_domains
for all
using (public.is_admin())
with check (public.is_admin());

drop trigger if exists central_domains_set_updated_at on public.central_domains;
create trigger central_domains_set_updated_at
before update on public.central_domains
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_central_domains_grade_subject
on public.central_domains(grade_subject_id, sort_order, created_at);

alter table public.central_exam_questions
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.matching_game_questions
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.ordering_game_questions
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.speed_challenge_questions
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.stages_game_questions
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.wheel_sections
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.wheel_section_questions
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.attempts
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.game_attempts
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

alter table public.student_question_history
add column if not exists domain_id uuid references public.central_domains(id) on delete set null;

do $$
declare
  v_default_grade_subject_id uuid;
  v_physics_id uuid;
  v_chemistry_id uuid;
  v_electricity_id uuid;
  v_track_type_exists boolean := false;
begin
  select id into v_default_grade_subject_id
  from public.study_grade_subjects
  order by sort_order, created_at
  limit 1;

  insert into public.central_domains (grade_subject_id, name, slug, sort_order)
  values
    (v_default_grade_subject_id, U&'\0641\064A\0632\064A\0627\0621', 'physics', 1),
    (v_default_grade_subject_id, U&'\0643\064A\0645\064A\0627\0621', 'chemistry', 2),
    (v_default_grade_subject_id, U&'\0643\0647\0631\0628\0627\0621', 'electricity', 3)
  on conflict (grade_subject_id, name) do update
  set slug = excluded.slug,
      sort_order = excluded.sort_order;

  select id into v_physics_id
  from public.central_domains
  where grade_subject_id = v_default_grade_subject_id
    and name = U&'\0641\064A\0632\064A\0627\0621'
  limit 1;

  select id into v_chemistry_id
  from public.central_domains
  where grade_subject_id = v_default_grade_subject_id
    and name = U&'\0643\064A\0645\064A\0627\0621'
  limit 1;

  select id into v_electricity_id
  from public.central_domains
  where grade_subject_id = v_default_grade_subject_id
    and name = U&'\0643\0647\0631\0628\0627\0621'
  limit 1;

  -- Check if track_type column exists on central_exam_questions
  select exists(
    select 1 from information_schema.columns
    where table_name = 'central_exam_questions' and column_name = 'track_type'
  ) into v_track_type_exists;

  if v_track_type_exists then
    update public.central_exam_questions
    set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
        track_type = 'central',
        domain_id = coalesce(domain_id, v_physics_id);
  else
    update public.central_exam_questions
    set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
        domain_id = coalesce(domain_id, v_physics_id);
  end if;

  update public.stages_game_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = case when track_type = 'central' then 'central' else track_type end,
      domain_id = case
        when track_type = 'central' then coalesce(domain_id, v_physics_id)
        else null
      end;

  update public.wheel_sections
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'central',
      domain_id = coalesce(domain_id, v_physics_id);

  update public.wheel_section_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'central',
      domain_id = coalesce(domain_id, v_physics_id);

  update public.matching_game_questions
  set domain_id = null
  where track_type = 'nafis';

  update public.ordering_game_questions
  set domain_id = null
  where track_type = 'nafis';

  update public.speed_challenge_questions
  set domain_id = null
  where track_type = 'nafis';

  update public.attempts
  set domain_id = null
  where track_type = 'nafis';

  update public.game_attempts
  set domain_id = case
        when track_type = 'central' then coalesce(domain_id, v_physics_id)
        else null
      end;

  update public.student_question_history
  set domain_id = case
        when track_type = 'central' then coalesce(domain_id, v_physics_id)
        else null
      end;
end $$;

create or replace function public.enforce_selection_scope()
returns trigger
language plpgsql
as $$
declare
  v_domain_grade_subject_id uuid;
begin
  if new.grade_subject_id is null then
    raise exception 'grade_subject_id is required';
  end if;

  if new.track_type not in ('nafis', 'central') then
    raise exception 'track_type must be nafis or central';
  end if;

  if new.track_type = 'central' and new.domain_id is null then
    raise exception 'domain_id is required for central track';
  end if;

  if new.track_type = 'nafis' and new.domain_id is not null then
    raise exception 'domain_id is only allowed for central track';
  end if;

  if new.domain_id is not null then
    select grade_subject_id into v_domain_grade_subject_id
    from public.central_domains
    where id = new.domain_id;

    if v_domain_grade_subject_id is null then
      raise exception 'domain_id does not exist';
    end if;

    if new.grade_subject_id <> v_domain_grade_subject_id then
      raise exception 'domain_id does not belong to grade_subject_id';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists central_exam_questions_enforce_selection_scope on public.central_exam_questions;
create trigger central_exam_questions_enforce_selection_scope
before insert or update on public.central_exam_questions
for each row
execute function public.enforce_selection_scope();

drop trigger if exists matching_game_questions_enforce_selection_scope on public.matching_game_questions;
create trigger matching_game_questions_enforce_selection_scope
before insert or update on public.matching_game_questions
for each row
execute function public.enforce_selection_scope();

drop trigger if exists ordering_game_questions_enforce_selection_scope on public.ordering_game_questions;
create trigger ordering_game_questions_enforce_selection_scope
before insert or update on public.ordering_game_questions
for each row
execute function public.enforce_selection_scope();

drop trigger if exists speed_challenge_questions_enforce_selection_scope on public.speed_challenge_questions;
create trigger speed_challenge_questions_enforce_selection_scope
before insert or update on public.speed_challenge_questions
for each row
execute function public.enforce_selection_scope();

drop trigger if exists stages_game_questions_enforce_selection_scope on public.stages_game_questions;
create trigger stages_game_questions_enforce_selection_scope
before insert or update on public.stages_game_questions
for each row
execute function public.enforce_selection_scope();

drop trigger if exists wheel_sections_enforce_selection_scope on public.wheel_sections;
create trigger wheel_sections_enforce_selection_scope
before insert or update on public.wheel_sections
for each row
execute function public.enforce_selection_scope();

drop trigger if exists wheel_section_questions_enforce_selection_scope on public.wheel_section_questions;
create trigger wheel_section_questions_enforce_selection_scope
before insert or update on public.wheel_section_questions
for each row
execute function public.enforce_selection_scope();

drop trigger if exists attempts_enforce_selection_scope on public.attempts;
create trigger attempts_enforce_selection_scope
before insert or update on public.attempts
for each row
execute function public.enforce_selection_scope();

drop trigger if exists game_attempts_enforce_selection_scope on public.game_attempts;
create trigger game_attempts_enforce_selection_scope
before insert or update on public.game_attempts
for each row
execute function public.enforce_selection_scope();

drop trigger if exists student_question_history_enforce_selection_scope on public.student_question_history;
create trigger student_question_history_enforce_selection_scope
before insert or update on public.student_question_history
for each row
execute function public.enforce_selection_scope();

-- Recreate unique index with domain_id now that it exists
drop index if exists public.idx_student_question_history_unique_scope;

create unique index if not exists idx_student_question_history_unique_scope
on public.student_question_history(
  user_id,
  question_id,
  game_type,
  track_type,
  grade_subject_id,
  domain_id
) nulls not distinct;

create index if not exists idx_central_exam_questions_domain_scope
on public.central_exam_questions(grade_subject_id, domain_id, active, order_index);

create index if not exists idx_matching_game_questions_domain_scope
on public.matching_game_questions(grade_subject_id, track_type, domain_id, is_active);

create index if not exists idx_ordering_game_questions_domain_scope
on public.ordering_game_questions(grade_subject_id, track_type, domain_id, is_active);

create index if not exists idx_speed_challenge_questions_domain_scope
on public.speed_challenge_questions(grade_subject_id, track_type, domain_id, is_active);

create index if not exists idx_stages_game_questions_domain_scope
on public.stages_game_questions(grade_subject_id, track_type, domain_id, is_active);

create index if not exists idx_wheel_sections_domain_scope
on public.wheel_sections(grade_subject_id, track_type, domain_id, is_active);

create index if not exists idx_wheel_section_questions_domain_scope
on public.wheel_section_questions(grade_subject_id, track_type, domain_id, is_active);

create index if not exists idx_attempts_domain_scope
on public.attempts(track_type, grade_subject_id, domain_id, created_at desc);

create index if not exists idx_game_attempts_domain_scope
on public.game_attempts(track_type, grade_subject_id, domain_id, created_at desc);

create index if not exists idx_student_question_history_domain_scope
on public.student_question_history(user_id, game_type, track_type, grade_subject_id, domain_id);



