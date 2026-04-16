-- ==========================================
-- Exam enhancements + scoped history
-- ==========================================

alter table public.questions
add column if not exists wrong_reason text;

alter table public.central_exam_questions
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists track_type text not null default 'central' check (track_type in ('nafis', 'central')),
add column if not exists wrong_reason text;

alter table public.student_question_history
add column if not exists track_type text not null default 'nafis' check (track_type in ('nafis', 'central')),
add column if not exists grade_subject_id uuid references public.study_grade_subjects(id) on delete set null,
add column if not exists selection_snapshot jsonb not null default '{}'::jsonb;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'student_question_history'
      and con.contype = 'f'
      and att.attname = 'question_id'
  loop
    execute format(
      'alter table public.student_question_history drop constraint %I',
      constraint_name
    );
  end loop;

  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'student_question_history'
      and con.contype in ('c', 'u')
      and (
        pg_get_constraintdef(con.oid) ilike '%game_type%'
        or con.conname = 'student_question_history_user_id_question_id_game_type_key'
      )
  loop
    execute format(
      'alter table public.student_question_history drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_question_history_game_type_check'
  ) then
    alter table public.student_question_history
    add constraint student_question_history_game_type_check
    check (
      game_type in (
        'exam',
        'matching',
        'ordering',
        'speed',
        'stages',
        'wheel_science',
        'central_exam'
      )
    );
  end if;
end $$;

do $$
declare
  v_default_grade_subject_id uuid;
begin
  select id into v_default_grade_subject_id
  from public.study_grade_subjects
  order by sort_order, created_at
  limit 1;

  update public.central_exam_questions
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = 'central';

  update public.student_question_history
  set grade_subject_id = coalesce(grade_subject_id, v_default_grade_subject_id),
      track_type = coalesce(track_type, 'nafis')
  where grade_subject_id is null or track_type is null;
end $$;

drop index if exists public.idx_student_question_history_unique_scope;

create unique index if not exists idx_student_question_history_unique_scope
on public.student_question_history(
  user_id,
  question_id,
  game_type,
  track_type,
  grade_subject_id
) nulls not distinct;

create index if not exists idx_student_question_history_scope
on public.student_question_history(user_id, game_type, track_type, grade_subject_id);

create index if not exists idx_central_exam_questions_scope
on public.central_exam_questions(grade_subject_id, track_type, active, order_index);

-- domain_id index moved to migration 20260415190000
