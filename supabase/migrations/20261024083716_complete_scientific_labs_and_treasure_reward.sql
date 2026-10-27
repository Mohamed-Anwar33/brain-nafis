-- Dynamic adventures can contain more than the original three challenge steps.
alter table public.treasure_active_sessions
  drop constraint if exists chk_treasure_session_step;
alter table public.treasure_active_sessions
  add constraint chk_treasure_session_step check (current_challenge_step >= 1);
-- Keep lab answer keys server-side while supporting the same question set before and after a video.
alter table public.virtual_lab_activities
  add column if not exists question_set jsonb not null default '[]'::jsonb;

alter table public.virtual_lab_answer_keys
  add column if not exists question_answer_keys jsonb not null default '{}'::jsonb;

alter table public.virtual_lab_attempts
  add column if not exists before_answers jsonb,
  add column if not exists after_answers jsonb,
  add column if not exists before_percent integer,
  add column if not exists after_percent integer,
  add column if not exists improvement_percent integer;

-- Preserve activities created with the previous two-question format.
update public.virtual_lab_activities activity
set question_set = jsonb_build_array(
  jsonb_build_object('id', 'legacy-before', 'text', activity.before_question, 'choices', activity.before_choices),
  jsonb_build_object('id', 'legacy-after', 'text', activity.after_question, 'choices', activity.after_choices)
)
where question_set = '[]'::jsonb;

update public.virtual_lab_answer_keys answer_key
set question_answer_keys = jsonb_build_object(
  'legacy-before', answer_key.before_correct_answer,
  'legacy-after', answer_key.after_correct_answer
)
where question_answer_keys = '{}'::jsonb;

create or replace function public.start_virtual_lab_question_set_attempt(
  p_activity_id uuid,
  p_before_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.virtual_lab_activities%rowtype;
  v_keys jsonb;
  v_attempt_id uuid;
  v_total integer;
  v_correct integer;
  v_answer jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_activity from public.virtual_lab_activities
    where id = p_activity_id and active = true;
  if not found then raise exception 'Activity unavailable'; end if;
  if jsonb_typeof(v_activity.question_set) <> 'array'
    or jsonb_array_length(v_activity.question_set) not between 4 and 5
    or jsonb_typeof(p_before_answers) <> 'array'
    or jsonb_array_length(p_before_answers) <> jsonb_array_length(v_activity.question_set) then
    raise exception 'Expected answers to all 4 or 5 lab questions';
  end if;
  select question_answer_keys into v_keys from public.virtual_lab_answer_keys
    where activity_id = p_activity_id;
  if v_keys is null then raise exception 'Lab answer key unavailable'; end if;
  for v_answer in select value from jsonb_array_elements(p_before_answers)
  loop
    if not exists (
      select 1 from jsonb_array_elements(v_activity.question_set) question
      cross join lateral jsonb_array_elements(question->'choices') choice
      where question->>'id' = v_answer->>'question_id'
        and choice->>'id' = v_answer->>'choice_id'
    ) then raise exception 'Answer choice unavailable'; end if;
  end loop;
  if (select count(distinct value->>'question_id') from jsonb_array_elements(p_before_answers))
    <> jsonb_array_length(v_activity.question_set) then
    raise exception 'Answer each question exactly once';
  end if;
  select count(*) into v_total from jsonb_array_elements(v_activity.question_set);
  select count(*) into v_correct from jsonb_array_elements(p_before_answers) answer
    where v_keys->>(answer->>'question_id') = answer->>'choice_id';
  insert into public.virtual_lab_attempts(activity_id, student_id, before_answers, before_percent)
    values (p_activity_id, auth.uid(), p_before_answers, round(v_correct * 100.0 / v_total)::integer)
    returning id into v_attempt_id;
  return jsonb_build_object('attempt_id', v_attempt_id, 'before_percent', round(v_correct * 100.0 / v_total)::integer);
end;
$$;

create or replace function public.submit_virtual_lab_question_set(
  p_attempt_id uuid,
  p_after_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.virtual_lab_attempts%rowtype;
  v_activity public.virtual_lab_activities%rowtype;
  v_keys jsonb;
  v_total integer;
  v_correct integer;
  v_before_percent integer;
  v_after_percent integer;
  v_answer jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_attempt from public.virtual_lab_attempts
    where id = p_attempt_id and student_id = auth.uid() for update;
  if not found or v_attempt.before_answers is null or v_attempt.simulation_opened_at is null then
    raise exception 'Complete the initial questions and open the video first';
  end if;
  if v_attempt.after_answers is not null then raise exception 'Post-video questions already submitted'; end if;
  select * into v_activity from public.virtual_lab_activities where id = v_attempt.activity_id and active = true;
  if not found or jsonb_typeof(p_after_answers) <> 'array'
    or jsonb_array_length(p_after_answers) <> jsonb_array_length(v_activity.question_set) then
    raise exception 'Answer the same question set after the video';
  end if;
  select question_answer_keys into v_keys from public.virtual_lab_answer_keys
    where activity_id = v_attempt.activity_id;
  for v_answer in select value from jsonb_array_elements(p_after_answers)
  loop
    if not exists (
      select 1 from jsonb_array_elements(v_activity.question_set) question
      cross join lateral jsonb_array_elements(question->'choices') choice
      where question->>'id' = v_answer->>'question_id'
        and choice->>'id' = v_answer->>'choice_id'
    ) then raise exception 'Answer choice unavailable'; end if;
  end loop;
  if (select count(distinct value->>'question_id') from jsonb_array_elements(p_after_answers))
    <> jsonb_array_length(v_activity.question_set)
    or exists (
      select 1 from jsonb_array_elements(v_attempt.before_answers) before_answer
      where not exists (select 1 from jsonb_array_elements(p_after_answers) after_answer
        where after_answer->>'question_id' = before_answer->>'question_id')
    ) then raise exception 'Answer each same question exactly once'; end if;
  select count(*) into v_total from jsonb_array_elements(v_activity.question_set);
  select count(*) into v_correct from jsonb_array_elements(p_after_answers) answer
    where v_keys->>(answer->>'question_id') = answer->>'choice_id';
  v_before_percent := v_attempt.before_percent;
  v_after_percent := round(v_correct * 100.0 / v_total)::integer;
  update public.virtual_lab_attempts
    set after_answers = p_after_answers,
        after_percent = v_after_percent,
        improvement_percent = v_after_percent - v_before_percent,
        mastered = v_after_percent = 100,
        completed_at = now()
    where id = p_attempt_id;
  return jsonb_build_object(
    'before_percent', v_before_percent,
    'after_percent', v_after_percent,
    'improvement_percent', v_after_percent - v_before_percent
  );
end;
$$;

revoke all on function public.start_virtual_lab_question_set_attempt(uuid, jsonb) from public;
revoke all on function public.submit_virtual_lab_question_set(uuid, jsonb) from public;
grant execute on function public.start_virtual_lab_question_set_attempt(uuid, jsonb) to authenticated;
grant execute on function public.submit_virtual_lab_question_set(uuid, jsonb) to authenticated;

-- The subject point is a separate, auditable reward attached to one completed adventure.
create table if not exists public.treasure_subject_points (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.treasure_active_sessions(id) on delete cascade,
  game_attempt_id uuid not null unique references public.game_attempts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  grade_subject_id uuid not null references public.study_grade_subjects(id) on delete restrict,
  points integer not null default 1 check (points = 1),
  awarded_at timestamptz not null default now()
);

-- Older deployments may already have the reward ledger without its attempt link.
-- Add the nullable FK for existing rows; newly claimed points always populate it.
alter table public.treasure_subject_points
  add column if not exists game_attempt_id uuid
  references public.game_attempts(id) on delete cascade;
create unique index if not exists treasure_subject_points_game_attempt_id_key
  on public.treasure_subject_points(game_attempt_id)
  where game_attempt_id is not null;
update public.treasure_subject_points reward
set game_attempt_id = attempt.id
from public.game_attempts attempt
where reward.game_attempt_id is null
  and attempt.user_id = reward.student_id
  and attempt.metadata->>'session_id' = reward.session_id::text;

alter table public.treasure_subject_points enable row level security;
drop policy if exists "Students read own treasure subject points"
  on public.treasure_subject_points;
create policy "Students read own treasure subject points"
  on public.treasure_subject_points for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin());

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
  v_point public.treasure_subject_points%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select adventure.grade_subject_id, session.current_challenge_step, count(challenge.id)::integer
  into v_grade_subject_id, v_current_step, v_total_steps
  from public.treasure_active_sessions session
  join public.treasure_adventures adventure on adventure.id = session.adventure_id
  join public.treasure_adventure_version_challenges challenge on challenge.adventure_version_id = session.adventure_version_id
  where session.id = p_session_id and session.user_id = v_user_id and session.status = 'completed'
  group by adventure.grade_subject_id, session.current_challenge_step;
  if v_grade_subject_id is null then raise exception 'Completed treasure session not found'; end if;
  if v_current_step <= v_total_steps then raise exception 'Complete every challenge before claiming the subject point'; end if;
  select attempt.id into v_game_attempt_id
  from public.game_attempts attempt
  where attempt.user_id = v_user_id and attempt.metadata->>'session_id' = p_session_id::text
  order by attempt.created_at desc limit 1;
  if v_game_attempt_id is null then raise exception 'Finalized treasure result not found'; end if;
  insert into public.treasure_subject_points(session_id, game_attempt_id, student_id, grade_subject_id, points)
  values (p_session_id, v_game_attempt_id, v_user_id, v_grade_subject_id, 1)
  on conflict (session_id) do update
    set game_attempt_id = coalesce(public.treasure_subject_points.game_attempt_id, excluded.game_attempt_id);
  select * into v_point from public.treasure_subject_points where session_id = p_session_id and student_id = v_user_id;
  update public.game_attempts
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'subject_bonus_points', v_point.points,
    'subject_bonus_grade_subject_id', v_point.grade_subject_id
  )
  where id = v_point.game_attempt_id and user_id = v_user_id;
  return jsonb_build_object('awarded', true, 'points', v_point.points, 'grade_subject_id', v_point.grade_subject_id);
end;
$$;

revoke all on function public.claim_treasure_subject_point(uuid) from public;
grant execute on function public.claim_treasure_subject_point(uuid) to authenticated;

-- Finalize the adventure and grant its subject point in the same transaction.
-- If the reward cannot be written, the finalization is rolled back too.
create or replace function public.finalize_treasure_with_subject_point(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final_result jsonb;
  v_point_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_final_result := public.finalize_treasure_attempt(p_session_id);
  v_point_result := public.claim_treasure_subject_point(p_session_id);
  return coalesce(v_final_result, '{}'::jsonb) || jsonb_build_object(
    'subject_point_awarded', coalesce((v_point_result->>'awarded')::boolean, false),
    'subject_point', v_point_result->'points',
    'subject_point_grade_subject_id', v_point_result->'grade_subject_id'
  );
end;
$$;

revoke all on function public.finalize_treasure_with_subject_point(uuid) from public;
grant execute on function public.finalize_treasure_with_subject_point(uuid) to authenticated;

-- Align persisted treasure answer payloads with both the current player controls and saved adventures.
CREATE OR REPLACE FUNCTION public.submit_treasure_step(
    p_session_id UUID,
    p_client_request_id UUID,
    p_step INT,
    p_answer JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_challenge RECORD;
    v_total_steps INT := 3;
    v_current_step_attempts INT;
    v_step_key TEXT := 'step_' || p_step;
    v_is_correct BOOLEAN := false;
    v_points_earned INT := 0;
    v_next_step INT;
    v_next_phase TEXT;
    v_req RECORD;
    v_result_payload JSONB;
    v_target_x NUMERIC;
    v_target_y NUMERIC;
    v_tolerance NUMERIC;
    v_click_x NUMERIC;
    v_click_y NUMERIC;
    v_dist NUMERIC;
    v_step_base INT;
    v_step_max INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: User is not authenticated.';
    END IF;

    -- 1. Check idempotency table
    SELECT * INTO v_req
    FROM public.treasure_step_requests
    WHERE client_request_id = p_client_request_id;

    IF v_req.id IS NOT NULL THEN
        RETURN v_req.response_payload;
    END IF;

    -- 2. Lock and retrieve session
    SELECT * INTO v_session
    FROM public.treasure_active_sessions
    WHERE id = p_session_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Active session % not found.', p_session_id;
    END IF;

    IF v_session.status != 'active' THEN
        RAISE EXCEPTION 'SESSION_INACTIVE: Session is currently %.', v_session.status;
    END IF;

    -- Count total steps for this adventure version
    SELECT count(*) INTO v_total_steps
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id;

    IF v_total_steps = 0 THEN
        v_total_steps := 3;
    END IF;

    -- Verify step order
    IF v_session.current_challenge_step != p_step THEN
        RAISE EXCEPTION 'OUT_OF_SEQUENCE_STEP: Expected step %, got %. Current challenge step is %.',
            v_session.current_challenge_step, p_step, v_session.current_challenge_step;
    END IF;

    -- 3. Retrieve challenge
    SELECT * INTO v_challenge
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id
      AND step = p_step;

    IF v_challenge.id IS NULL THEN
        RAISE EXCEPTION 'CHALLENGE_NOT_FOUND: Step % challenge not found.', p_step;
    END IF;

    -- 4. Track attempts
    v_current_step_attempts := COALESCE((v_session.step_attempts->>v_step_key)::INT, 0) + 1;

    -- 5. Validate Answer
    IF v_challenge.challenge_type = 'mcq' THEN
        v_is_correct := (p_answer->>'selected_choice_id' = v_challenge.solution_payload->>'correct_choice_id');

    ELSIF v_challenge.challenge_type = 'ordering' THEN
        v_is_correct := (
            COALESCE(p_answer->'ordered_item_ids', p_answer->'submitted_order')
            = COALESCE(v_challenge.solution_payload->'correct_order_ids', v_challenge.solution_payload->'correct_order')
        );

    ELSIF v_challenge.challenge_type = 'hotspot' THEN
        v_target_x := (v_challenge.solution_payload->>'target_x_percent')::NUMERIC;
        v_target_y := (v_challenge.solution_payload->>'target_y_percent')::NUMERIC;
        v_tolerance := COALESCE((v_challenge.solution_payload->>'tolerance_percent')::NUMERIC, 12);

        v_click_x := (p_answer->>'x_percent')::NUMERIC;
        v_click_y := (p_answer->>'y_percent')::NUMERIC;

        IF v_click_x IS NOT NULL AND v_click_y IS NOT NULL THEN
            v_dist := sqrt(power(v_click_x - v_target_x, 2) + power(v_click_y - v_target_y, 2));
            v_is_correct := (v_dist <= v_tolerance);
        ELSE
            v_is_correct := false;
        END IF;
    END IF;

    -- 6. Dynamic Point Calculation
    v_step_base := 100 / v_total_steps;
    IF p_step = v_total_steps THEN
        v_step_max := 100 - (v_step_base * (v_total_steps - 1));
    ELSE
        v_step_max := v_step_base;
    END IF;

    IF v_is_correct THEN
        -- Only advance to the next step when the answer is truly correct!
        IF v_current_step_attempts = 1 THEN
            v_points_earned := v_step_max;
        ELSIF v_current_step_attempts = 2 THEN
            v_points_earned := GREATEST(1, ROUND(v_step_max * 0.85)::INT);
        ELSE
            v_points_earned := GREATEST(1, ROUND(v_step_max * 0.65)::INT);
        END IF;

        v_next_step := p_step + 1;
        IF v_next_step > v_total_steps THEN
            v_next_phase := 'treasure';
        ELSE
            v_next_phase := 'challenges';
        END IF;

        UPDATE public.treasure_active_sessions
        SET current_challenge_step = v_next_step,
            current_phase = v_next_phase,
            accumulated_score = accumulated_score + v_points_earned,
            step_attempts = jsonb_set(step_attempts, ARRAY[v_step_key], to_jsonb(v_current_step_attempts)),
            updated_at = now()
        WHERE id = p_session_id;

        v_result_payload := jsonb_build_object(
            'is_correct', true,
            'points_earned', v_points_earned,
            'attempts_taken', v_current_step_attempts,
            'current_challenge_step', v_next_step,
            'current_phase', v_next_phase,
            'explanation', null
        );

    ELSE
        -- ❌ Wrong Answer:
        -- The student NEVER skips to the next question on a wrong answer.
        -- We remain on the current step, record the attempt, and provide the explanation/link immediately.
        UPDATE public.treasure_active_sessions
        SET step_attempts = jsonb_set(step_attempts, ARRAY[v_step_key], to_jsonb(v_current_step_attempts)),
            updated_at = now()
        WHERE id = p_session_id;

        v_result_payload := jsonb_build_object(
            'is_correct', false,
            'points_earned', 0,
            'attempts_taken', v_current_step_attempts,
            'exhausted_attempts', false,
            'current_challenge_step', p_step,
            'current_phase', 'challenges',
            'explanation', jsonb_build_object(
                'wrong_reason', v_challenge.wrong_reason,
                'explanation_url', v_challenge.explanation_url
            )
        );
    END IF;

    -- Record in idempotency table
    INSERT INTO public.treasure_step_requests (
        client_request_id,
        session_id,
        user_id,
        step,
        answer_payload,
        response_payload
    )
    VALUES (
        p_client_request_id,
        p_session_id,
        v_user_id,
        p_step,
        p_answer,
        v_result_payload
    )
    ON CONFLICT (client_request_id) DO NOTHING;

    RETURN v_result_payload;
END;
$$;
