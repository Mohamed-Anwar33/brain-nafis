alter table public.questions
  add column if not exists scientific_skill text,
  add column if not exists scientific_concept text;

alter table public.attempt_answers
  add column if not exists response_order integer,
  add column if not exists is_practice boolean not null default false;

create index if not exists idx_questions_skill_concept
  on public.questions (grade_subject_id, domain_id, scientific_skill, scientific_concept)
  where active = true;

create index if not exists idx_attempt_answers_attempt_order
  on public.attempt_answers (attempt_id, response_order);

create table if not exists public.scientific_readings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  passage text not null,
  domain_id uuid references public.central_domains(id) on delete set null,
  grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.scientific_reading_questions (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.scientific_readings(id) on delete cascade,
  text text not null,
  choices jsonb not null default '[]'::jsonb,
  question_order integer not null default 0
);

create table if not exists public.scientific_reading_answer_keys (
  question_id uuid primary key references public.scientific_reading_questions(id) on delete cascade,
  correct_choice_id text not null
);

create table if not exists public.virtual_lab_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  domain_id uuid references public.central_domains(id) on delete set null,
  grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
  scientific_concept text,
  instructions text not null default '',
  simulation_url text not null,
  display_mode text not null default 'external' check (display_mode in ('external', 'iframe')),
  before_question text not null,
  before_choices jsonb not null default '[]'::jsonb,
  after_question text not null,
  after_choices jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.virtual_lab_answer_keys (
  activity_id uuid primary key references public.virtual_lab_activities(id) on delete cascade,
  before_correct_answer text not null,
  after_correct_answer text not null
);

-- Keep answer keys private even when activity and question content is publicly readable.
insert into public.scientific_reading_answer_keys (question_id, correct_choice_id)
select q.id, choice->>'id'
from public.scientific_reading_questions q
cross join lateral jsonb_array_elements(q.choices) choice
where choice->>'correct' = 'true'
on conflict (question_id) do nothing;

update public.scientific_reading_questions q
set choices = coalesce((
  select jsonb_agg(jsonb_build_object('id', choice->>'id', 'text', choice->>'text') order by ordinal)
  from jsonb_array_elements(q.choices) with ordinality as item(choice, ordinal)
), '[]'::jsonb);

-- Older deployments may have stored answer keys on the public activity table.
-- Read those columns only when they actually exist; fresh schemas intentionally
-- keep them out of virtual_lab_activities entirely.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'virtual_lab_activities'
      and column_name = 'before_correct_answer'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'virtual_lab_activities'
      and column_name = 'after_correct_answer'
  ) then
    execute $migration$
      insert into public.virtual_lab_answer_keys (activity_id, before_correct_answer, after_correct_answer)
      select id, before_correct_answer, after_correct_answer
      from public.virtual_lab_activities
      where before_correct_answer is not null and after_correct_answer is not null
      on conflict (activity_id) do nothing
    $migration$;
  end if;
end;
$$;

alter table public.virtual_lab_activities drop column if exists before_correct_answer;
alter table public.virtual_lab_activities drop column if exists after_correct_answer;

alter table public.scientific_readings enable row level security;
alter table public.scientific_reading_questions enable row level security;
alter table public.scientific_reading_answer_keys enable row level security;
alter table public.virtual_lab_activities enable row level security;
alter table public.virtual_lab_answer_keys enable row level security;

create policy "Anyone can read active scientific readings" on public.scientific_readings for select using (active = true);
create policy "Admins manage scientific readings" on public.scientific_readings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Anyone can read questions for active readings" on public.scientific_reading_questions for select using (
  exists (select 1 from public.scientific_readings r where r.id = reading_id and r.active = true)
);
create policy "Admins manage scientific reading questions" on public.scientific_reading_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage scientific reading answer keys" on public.scientific_reading_answer_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Anyone can read active virtual labs" on public.virtual_lab_activities for select using (active = true);
create policy "Admins manage virtual labs" on public.virtual_lab_activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage virtual lab answer keys" on public.virtual_lab_answer_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.virtual_lab_attempts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.virtual_lab_activities(id) on delete cascade,
  student_id uuid default auth.uid(),
  student_name text,
  before_answer text,
  after_answer text,
  mastered boolean not null default false,
  simulation_opened_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.virtual_lab_attempts enable row level security;
create policy "Users read own virtual lab attempts" on public.virtual_lab_attempts for select to authenticated using (student_id = auth.uid() or public.is_admin());

create table if not exists public.scientific_reading_attempts (
  id uuid primary key default gen_random_uuid(),
  reading_question_id uuid not null references public.scientific_reading_questions(id) on delete cascade,
  student_id uuid default auth.uid(),
  selected_choice_id text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

alter table public.scientific_reading_attempts enable row level security;
create policy "Students create own scientific reading answers" on public.scientific_reading_attempts for insert to authenticated with check (student_id = auth.uid());
create policy "Users read own scientific reading answers" on public.scientific_reading_attempts for select to authenticated using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Students create own scientific reading answers" on public.scientific_reading_attempts;

create or replace function public.submit_scientific_reading_answer(p_question_id uuid, p_choice_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_correct boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from scientific_reading_questions q
    cross join lateral jsonb_array_elements(q.choices) choice
    where q.id = p_question_id and choice->>'id' = p_choice_id
  ) then raise exception 'Choice unavailable'; end if;
  select correct_choice_id = p_choice_id into v_correct
  from scientific_reading_answer_keys where question_id = p_question_id;
  if v_correct is null then raise exception 'Question answer key not found'; end if;
  insert into scientific_reading_attempts (reading_question_id, student_id, selected_choice_id, is_correct)
  values (p_question_id, auth.uid(), p_choice_id, v_correct);
  return v_correct;
end;
$$;

create or replace function public.start_virtual_lab_attempt(p_activity_id uuid, p_before_answer text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_attempt_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from virtual_lab_activities where id = p_activity_id and active = true) then raise exception 'Activity unavailable'; end if;
  if not exists (
    select 1 from virtual_lab_activities a
    cross join lateral jsonb_array_elements(a.before_choices) choice
    where a.id = p_activity_id and choice->>'id' = p_before_answer
  ) then raise exception 'Prediction choice unavailable'; end if;
  insert into virtual_lab_attempts (activity_id, student_id, before_answer)
  values (p_activity_id, auth.uid(), p_before_answer) returning id into v_attempt_id;
  return v_attempt_id;
end;
$$;

create or replace function public.mark_virtual_lab_opened(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update virtual_lab_attempts set simulation_opened_at = now()
  where id = p_attempt_id and student_id = auth.uid();
  if not found then raise exception 'Attempt unavailable'; end if;
end;
$$;

create or replace function public.submit_virtual_lab_answer(p_attempt_id uuid, p_after_answer text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_correct boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update virtual_lab_attempts a
  set after_answer = p_after_answer,
      mastered = (k.after_correct_answer = p_after_answer),
      completed_at = now()
  from virtual_lab_answer_keys k
  where a.id = p_attempt_id and a.student_id = auth.uid()
    and a.simulation_opened_at is not null and a.before_answer is not null
    and k.activity_id = a.activity_id
  returning a.mastered into v_correct;
  if v_correct is null then raise exception 'Complete the prediction and open the simulation first'; end if;
  return v_correct;
end;
$$;

revoke all on function public.submit_scientific_reading_answer(uuid, text) from public;
revoke all on function public.start_virtual_lab_attempt(uuid, text) from public;
revoke all on function public.mark_virtual_lab_opened(uuid) from public;
revoke all on function public.submit_virtual_lab_answer(uuid, text) from public;
grant execute on function public.submit_scientific_reading_answer(uuid, text) to authenticated;
grant execute on function public.start_virtual_lab_attempt(uuid, text) to authenticated;
grant execute on function public.mark_virtual_lab_opened(uuid) to authenticated;
grant execute on function public.submit_virtual_lab_answer(uuid, text) to authenticated;
