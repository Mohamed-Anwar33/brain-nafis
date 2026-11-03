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

-- Skill labels used by central exam questions and saved student skill analytics.
alter table public.central_exam_questions
  add column if not exists scientific_skill text;

create index if not exists idx_central_exam_questions_skill
  on public.central_exam_questions (grade_subject_id, domain_id, scientific_skill)
  where active = true and scientific_skill is not null;

-- Keep the treasure certificate and subject point behind the same perfect-run
-- criteria: every challenge correct, exactly 100 points, and under five minutes.
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
  v_final_score integer;
  v_all_correct boolean;
  v_eligible boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_final_result := public.finalize_treasure_attempt(p_session_id);

  select adventure.grade_subject_id, session.started_at, session.ended_at,
         session.accumulated_score, count(challenge.id)::integer,
         coalesce(bool_and(exists (
           select 1 from public.treasure_step_requests request
           where request.session_id = session.id
             and request.step = challenge.step
             and request.response_payload->>'is_correct' = 'true'
         )), false)
  into v_grade_subject_id, v_started_at, v_ended_at,
       v_final_score, v_total_steps, v_all_correct
  from public.treasure_active_sessions session
  join public.treasure_adventures adventure on adventure.id = session.adventure_id
  join public.treasure_adventure_version_challenges challenge on challenge.adventure_version_id = session.adventure_version_id
  where session.id = p_session_id and session.user_id = auth.uid() and session.status = 'completed'
  group by adventure.grade_subject_id, session.started_at, session.ended_at, session.accumulated_score;

  v_eligible := v_total_steps > 0
    and v_final_score = 100
    and v_all_correct
    and v_started_at is not null
    and v_ended_at is not null
    and v_ended_at < v_started_at + interval '5 minutes'
    and v_grade_subject_id is not null;

  if v_eligible then
    v_point_result := public.claim_treasure_subject_point(p_session_id);
  end if;

  -- Correct the legacy >=80% value written by finalize_treasure_attempt.
  update public.game_attempts
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('is_certificate_eligible', v_eligible)
  where user_id = auth.uid() and metadata->>'session_id' = p_session_id::text;

  return coalesce(v_final_result, '{}'::jsonb) || jsonb_build_object(
    'is_certificate_eligible', v_eligible,
    'subject_point_eligible', v_eligible,
    'subject_point_awarded', coalesce((v_point_result->>'awarded')::boolean, false),
    'subject_point', v_point_result->'points',
    'subject_point_grade_subject_id', v_point_result->'grade_subject_id'
  );
end;
$$;

revoke all on function public.finalize_treasure_with_subject_point(uuid) from public;
grant execute on function public.finalize_treasure_with_subject_point(uuid) to authenticated;
