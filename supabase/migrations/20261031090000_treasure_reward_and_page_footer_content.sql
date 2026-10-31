create or replace function public.claim_treasure_subject_point(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_grade_subject_id uuid;
  v_game_attempt_id uuid;
  v_current_step integer;
  v_total_steps integer;
  v_session_status text;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_all_correct boolean;
  v_elapsed_seconds integer;
  v_point public.treasure_subject_points%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select adventure.grade_subject_id, session.current_challenge_step, session.status,
         session.started_at, session.ended_at, count(challenge.id)::integer,
         coalesce(bool_and(exists (
           select 1 from public.treasure_step_requests request
           where request.session_id = session.id
             and request.step = challenge.step
             and request.response_payload->>'is_correct' = 'true'
         )), false)
  into v_grade_subject_id, v_current_step, v_session_status,
       v_started_at, v_ended_at, v_total_steps, v_all_correct
  from public.treasure_active_sessions session
  join public.treasure_adventures adventure on adventure.id = session.adventure_id
  join public.treasure_adventure_version_challenges challenge on challenge.adventure_version_id = session.adventure_version_id
  where session.id = p_session_id and session.user_id = v_user_id
  group by adventure.grade_subject_id, session.current_challenge_step, session.status,
           session.started_at, session.ended_at;

  if v_grade_subject_id is null or v_session_status <> 'completed' then
    raise exception 'Completed treasure session not found';
  end if;
  if v_current_step <= v_total_steps then
    raise exception 'Complete every challenge before claiming the subject point';
  end if;

  v_elapsed_seconds := greatest(0, extract(epoch from (v_ended_at - v_started_at))::integer);
  if v_elapsed_seconds >= 300 or not v_all_correct then
    raise exception 'Answer every challenge correctly and complete the adventure in under five minutes';
  end if;

  select attempt.id into v_game_attempt_id
  from public.game_attempts attempt
  where attempt.user_id = v_user_id and attempt.metadata->>'session_id' = p_session_id::text
  order by attempt.created_at desc limit 1;
  if v_game_attempt_id is null then raise exception 'Finalized treasure result not found'; end if;

  update public.game_attempts
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('subject_bonus_eligible', true)
  where id = v_game_attempt_id and user_id = v_user_id;

  insert into public.treasure_subject_points(session_id, game_attempt_id, student_id, grade_subject_id, points)
  values (p_session_id, v_game_attempt_id, v_user_id, v_grade_subject_id, 1)
  on conflict (session_id) do update
    set game_attempt_id = coalesce(public.treasure_subject_points.game_attempt_id, excluded.game_attempt_id);

  select * into v_point from public.treasure_subject_points
  where session_id = p_session_id and student_id = v_user_id;

  update public.game_attempts
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'subject_bonus_points', v_point.points,
    'subject_bonus_grade_subject_id', v_point.grade_subject_id,
    'subject_bonus_eligible', true
  )
  where id = v_point.game_attempt_id and user_id = v_user_id;

  return jsonb_build_object('awarded', true, 'points', v_point.points, 'grade_subject_id', v_point.grade_subject_id);
end;
$$;

create or replace function public.finalize_treasure_with_subject_point(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final_result jsonb;
  v_point_result jsonb := jsonb_build_object('awarded', false, 'points', null, 'grade_subject_id', null);
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_grade_subject_id uuid;
  v_total_steps integer;
  v_all_correct boolean;
  v_elapsed_seconds integer;
  v_eligible boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_final_result := public.finalize_treasure_attempt(p_session_id);

  select adventure.grade_subject_id, session.started_at, session.ended_at,
         count(challenge.id)::integer,
         coalesce(bool_and(exists (
           select 1 from public.treasure_step_requests request
           where request.session_id = session.id
             and request.step = challenge.step
             and request.response_payload->>'is_correct' = 'true'
         )), false)
  into v_grade_subject_id, v_started_at, v_ended_at, v_total_steps, v_all_correct
  from public.treasure_active_sessions session
  join public.treasure_adventures adventure on adventure.id = session.adventure_id
  join public.treasure_adventure_version_challenges challenge on challenge.adventure_version_id = session.adventure_version_id
  where session.id = p_session_id and session.user_id = auth.uid() and session.status = 'completed'
  group by adventure.grade_subject_id, session.started_at, session.ended_at;

  v_elapsed_seconds := greatest(0, extract(epoch from (v_ended_at - v_started_at))::integer);
  v_eligible := v_total_steps > 0
    and v_all_correct
    and v_elapsed_seconds < 300
    and v_grade_subject_id is not null;

  if v_eligible then
    v_point_result := public.claim_treasure_subject_point(p_session_id);
  end if;

  return coalesce(v_final_result, '{}'::jsonb) || jsonb_build_object(
    'subject_point_eligible', v_eligible,
    'subject_point_awarded', coalesce((v_point_result->>'awarded')::boolean, false),
    'subject_point', v_point_result->'points',
    'subject_point_grade_subject_id', v_point_result->'grade_subject_id'
  );
end;
$$;

revoke all on function public.claim_treasure_subject_point(uuid) from public;
grant execute on function public.claim_treasure_subject_point(uuid) to authenticated;
revoke all on function public.finalize_treasure_with_subject_point(uuid) from public;
grant execute on function public.finalize_treasure_with_subject_point(uuid) to authenticated;

-- Allow students to read only the non-sensitive text blocks shown in the shared page footer.
drop policy if exists "Students can read public footer text" on public.app_settings;
create policy "Students can read public footer text"
  on public.app_settings for select to anon, authenticated
  using (key in ('footer_topic_teacher_title', 'footer_topic_teacher_body', 'footer_topic_platform_title', 'footer_topic_platform_body'));
grant select (key, value) on public.app_settings to anon, authenticated;

-- Preserve the skill assigned when a student answered, even if an admin later edits that question.
alter table public.attempt_answers
  add column if not exists scientific_skill text;

update public.attempt_answers answer
set scientific_skill = question.scientific_skill
from public.questions question
where answer.question_id = question.id
  and answer.scientific_skill is null
  and question.scientific_skill is not null;
