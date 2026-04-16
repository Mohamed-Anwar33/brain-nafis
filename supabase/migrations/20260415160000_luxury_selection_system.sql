-- ==========================================
-- Academic catalog + base selection context
-- ==========================================

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.study_grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_grade_subjects (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.study_grades(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_id, subject_id)
);

alter table public.study_grades enable row level security;
alter table public.study_subjects enable row level security;
alter table public.study_grade_subjects enable row level security;

drop policy if exists "Public read study grades" on public.study_grades;
create policy "Public read study grades"
on public.study_grades
for select
using (is_active = true);

drop policy if exists "Public read study subjects" on public.study_subjects;
create policy "Public read study subjects"
on public.study_subjects
for select
using (is_active = true);

drop policy if exists "Public read study grade subjects" on public.study_grade_subjects;
create policy "Public read study grade subjects"
on public.study_grade_subjects
for select
using (is_active = true);

drop policy if exists "Admin manage study grades" on public.study_grades;
create policy "Admin manage study grades"
on public.study_grades
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin manage study subjects" on public.study_subjects;
create policy "Admin manage study subjects"
on public.study_subjects
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin manage study grade subjects" on public.study_grade_subjects;
create policy "Admin manage study grade subjects"
on public.study_grade_subjects
for all
using (public.is_admin())
with check (public.is_admin());

drop trigger if exists study_grades_set_updated_at on public.study_grades;
create trigger study_grades_set_updated_at
before update on public.study_grades
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists study_subjects_set_updated_at on public.study_subjects;
create trigger study_subjects_set_updated_at
before update on public.study_subjects
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists study_grade_subjects_set_updated_at on public.study_grade_subjects;
create trigger study_grade_subjects_set_updated_at
before update on public.study_grade_subjects
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_study_grades_sort_order
on public.study_grades(sort_order, created_at);

create index if not exists idx_study_subjects_sort_order
on public.study_subjects(sort_order, created_at);

create index if not exists idx_study_grade_subjects_grade_subject
on public.study_grade_subjects(grade_id, subject_id);

do $$
declare
  v_grade_id uuid;
  v_subject_id uuid;
begin
  insert into public.study_grades (name, slug, sort_order)
  values (U&'\062B\0627\0644\062B \0645\062A\0648\0633\0637', 'third-intermediate', 1)
  on conflict (slug) do update
  set name = excluded.name
  returning id into v_grade_id;

  if v_grade_id is null then
    select id into v_grade_id
    from public.study_grades
    where slug = 'third-intermediate'
    limit 1;
  end if;

  insert into public.study_subjects (name, slug, sort_order)
  values (U&'\0639\0644\0648\0645', 'science', 1)
  on conflict (slug) do update
  set name = excluded.name
  returning id into v_subject_id;

  if v_subject_id is null then
    select id into v_subject_id
    from public.study_subjects
    where slug = 'science'
    limit 1;
  end if;

  insert into public.study_grade_subjects (grade_id, subject_id, label, sort_order)
  values (
    v_grade_id,
    v_subject_id,
    U&'\062B\0627\0644\062B \0645\062A\0648\0633\0637 - \0639\0644\0648\0645',
    1
  )
  on conflict (grade_id, subject_id) do update
  set label = excluded.label;
end $$;

alter table public.questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central'));

alter table public.matching_game_questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central'));

alter table public.ordering_game_questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central'));

alter table public.speed_challenge_questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central'));

alter table public.stages_game_questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'central' check (track_type in ('nafis', 'central'));

alter table public.wheel_sections
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'central' check (track_type in ('nafis', 'central'));

alter table public.wheel_section_questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'central' check (track_type in ('nafis', 'central'));

alter table public.attempts
add column if not exists created_at timestamptz default now(),
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central')),
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists selection_snapshot jsonb not null default '{}'::jsonb;

alter table public.game_attempts
add column if not exists created_at timestamptz default now(),
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central')),
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists selection_snapshot jsonb not null default '{}'::jsonb;

do $$
declare
  v_default_grade_subject_id uuid;
begin
  select id into v_default_grade_subject_id
  from public.study_grade_subjects
  order by sort_order, created_at
  limit 1;

  update public.questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'nafis';

  update public.matching_game_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'nafis';

  update public.ordering_game_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'nafis';

  update public.speed_challenge_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'nafis';

  update public.stages_game_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = coalesce(track_type, 'central');

  update public.wheel_sections
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = coalesce(track_type, 'central');

  update public.wheel_section_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = coalesce(track_type, 'central');

  update public.attempts
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = coalesce(track_type, 'nafis')
  where grade_subject_id is null or track_type is null;

  update public.game_attempts
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = case
        when game_type in ('central_exam', 'wheel_science', 'stages') then 'central'
        else 'nafis'
      end
  where grade_subject_id is null or track_type is null;
end $$;

create index if not exists idx_questions_grade_subject_active
on public.questions(grade_subject_id, active);

create index if not exists idx_matching_game_questions_scope
on public.matching_game_questions(grade_subject_id, track_type, is_active);

create index if not exists idx_ordering_game_questions_scope
on public.ordering_game_questions(grade_subject_id, track_type, is_active);

create index if not exists idx_speed_challenge_questions_scope
on public.speed_challenge_questions(grade_subject_id, track_type, is_active);

create index if not exists idx_stages_game_questions_scope
on public.stages_game_questions(grade_subject_id, track_type, is_active);

create index if not exists idx_wheel_sections_scope
on public.wheel_sections(grade_subject_id, track_type, is_active);

create index if not exists idx_wheel_section_questions_scope
on public.wheel_section_questions(grade_subject_id, track_type, is_active);

create index if not exists idx_attempts_selection_scope
on public.attempts(track_type, grade_subject_id, created_at desc);

create index if not exists idx_game_attempts_selection_scope
on public.game_attempts(track_type, grade_subject_id, created_at desc);


