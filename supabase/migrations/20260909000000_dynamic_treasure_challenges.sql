-- Migration: Make treasure challenges count dynamic in submit_treasure_step and finalize_treasure_attempt
-- Allows any number of challenges (1 to N) per adventure

-- 0. Ensure answer_payload column exists in treasure_step_requests
ALTER TABLE public.treasure_step_requests 
ADD COLUMN IF NOT EXISTS answer_payload JSONB;

-- 1. Update submit_treasure_step to dynamically compute total challenges
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
    v_ver RECORD;
    v_challenge RECORD;
    v_existing_request RECORD;
    v_time_limit INT;
    v_total_steps INT := 3;
    v_step_key TEXT := 'step_' || p_step;
    v_current_step_attempts INT;
    v_is_correct BOOLEAN := false;
    v_points_earned INT := 0;
    v_next_step INT;
    v_next_phase TEXT;
    v_result_payload JSONB;
    
    v_expected_choice_id TEXT;
    v_submitted_choice_id TEXT;
    v_expected_order JSONB;
    v_submitted_order JSONB;
    v_target_x NUMERIC;
    v_target_y NUMERIC;
    v_tolerance NUMERIC;
    v_click_x NUMERIC;
    v_click_y NUMERIC;
    v_dist NUMERIC;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: User is not authenticated.';
    END IF;

    IF p_client_request_id IS NULL THEN
        RAISE EXCEPTION 'REQUEST_ID_REQUIRED: client_request_id is mandatory for idempotent submissions.';
    END IF;

    SELECT result_payload INTO v_result_payload
    FROM public.treasure_step_requests
    WHERE session_id = p_session_id AND client_request_id = p_client_request_id;

    IF v_result_payload IS NOT NULL THEN
        RETURN v_result_payload;
    END IF;

    SELECT * INTO v_session
    FROM public.treasure_active_sessions
    WHERE id = p_session_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Session % not found.', p_session_id;
    END IF;

    IF v_session.status <> 'active' THEN
        RAISE EXCEPTION 'SESSION_CLOSED: Session status is %.', v_session.status;
    END IF;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_session.adventure_version_id;

    v_time_limit := COALESCE((v_ver.environment_config->>'time_limit_seconds')::INT, 600);

    IF now() > (v_session.started_at + (v_time_limit * interval '1 second')) THEN
        UPDATE public.treasure_active_sessions
        SET status = 'expired',
            ended_at = now(),
            updated_at = now()
        WHERE id = p_session_id;

        RAISE EXCEPTION 'SESSION_EXPIRED: The time limit of % seconds has elapsed.', v_time_limit;
    END IF;

    IF v_session.current_challenge_step <> p_step THEN
        RAISE EXCEPTION 'OUT_OF_SEQUENCE_STEP: Current challenge step is %, received %.', v_session.current_challenge_step, p_step;
    END IF;

    SELECT * INTO v_challenge
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id AND step = p_step;

    IF v_challenge.id IS NULL THEN
        RAISE EXCEPTION 'CHALLENGE_NOT_FOUND: Step % challenge is not configured.', p_step;
    END IF;

    -- Compute dynamic total steps for this adventure version
    SELECT count(*) INTO v_total_steps
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id;

    IF v_total_steps < 1 THEN
        v_total_steps := 3;
    END IF;

    v_current_step_attempts := COALESCE((v_session.step_attempts->>v_step_key)::INT, 0) + 1;

    IF v_challenge.challenge_type = 'mcq' THEN
        v_expected_choice_id := v_challenge.solution_payload->>'correct_choice_id';
        v_submitted_choice_id := p_answer->>'selected_choice_id';
        v_is_correct := (v_expected_choice_id IS NOT NULL AND v_expected_choice_id = v_submitted_choice_id);

    ELSIF v_challenge.challenge_type = 'ordering' THEN
        v_expected_order := v_challenge.solution_payload->'correct_order';
        v_submitted_order := p_answer->'submitted_order';
        v_is_correct := (v_expected_order IS NOT NULL AND v_expected_order = v_submitted_order);

    ELSIF v_challenge.challenge_type = 'hotspot' THEN
        v_target_x := (v_challenge.solution_payload->>'target_x_percent')::NUMERIC;
        v_target_y := (v_challenge.solution_payload->>'target_y_percent')::NUMERIC;
        v_tolerance := (v_challenge.solution_payload->>'tolerance_radius_percent')::NUMERIC;
        
        v_click_x := (p_answer->>'x_percent')::NUMERIC;
        v_click_y := (p_answer->>'y_percent')::NUMERIC;

        IF v_click_x IS NOT NULL AND v_click_y IS NOT NULL THEN
            v_dist := sqrt(power(v_click_x - v_target_x, 2) + power(v_click_y - v_target_y, 2));
            v_is_correct := (v_dist <= v_tolerance);
        ELSE
            v_is_correct := false;
        END IF;
    END IF;

    IF v_is_correct THEN
        IF v_current_step_attempts = 1 THEN
            v_points_earned := 30;
        ELSIF v_current_step_attempts = 2 THEN
            v_points_earned := 25;
        ELSE
            v_points_earned := 15;
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
        IF v_current_step_attempts >= 3 THEN
            v_next_step := p_step + 1;
            IF v_next_step > v_total_steps THEN
                v_next_phase := 'treasure';
            ELSE
                v_next_phase := 'challenges';
            END IF;

            UPDATE public.treasure_active_sessions
            SET current_challenge_step = v_next_step,
                current_phase = v_next_phase,
                step_attempts = jsonb_set(step_attempts, ARRAY[v_step_key], to_jsonb(v_current_step_attempts)),
                updated_at = now()
            WHERE id = p_session_id;

            v_result_payload := jsonb_build_object(
                'is_correct', false,
                'points_earned', 0,
                'attempts_taken', v_current_step_attempts,
                'current_challenge_step', v_next_step,
                'current_phase', v_next_phase,
                'exhausted_attempts', true,
                'explanation', jsonb_build_object(
                    'wrong_reason', v_challenge.wrong_reason,
                    'explanation_url', v_challenge.explanation_url
                )
            );
        ELSE
            UPDATE public.treasure_active_sessions
            SET step_attempts = jsonb_set(step_attempts, ARRAY[v_step_key], to_jsonb(v_current_step_attempts)),
                updated_at = now()
            WHERE id = p_session_id;

            v_result_payload := jsonb_build_object(
                'is_correct', false,
                'points_earned', 0,
                'attempts_taken', v_current_step_attempts,
                'current_challenge_step', p_step,
                'current_phase', 'challenges',
                'explanation', CASE WHEN v_current_step_attempts >= 2 THEN
                    jsonb_build_object(
                        'wrong_reason', v_challenge.wrong_reason,
                        'explanation_url', v_challenge.explanation_url
                    )
                    ELSE null END
            );
        END IF;
    END IF;

    INSERT INTO public.treasure_step_requests (
        session_id,
        client_request_id,
        step,
        answer_payload,
        result_payload
    )
    VALUES (
        p_session_id,
        p_client_request_id,
        p_step,
        p_answer,
        v_result_payload
    );

    RETURN v_result_payload;
END;
$$;


-- 2. Update finalize_treasure_attempt to dynamically calculate total_questions
CREATE OR REPLACE FUNCTION public.finalize_treasure_attempt(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_adv RECORD;
    v_ver RECORD;
    v_time_limit INT;
    v_total_steps INT := 3;
    v_correct_count INT := 0;
    v_elapsed_seconds INT;
    v_speed_bonus INT := 0;
    v_final_score INT := 0;
    v_is_passed BOOLEAN := false;
    v_is_certificate_eligible BOOLEAN := false;
    v_attempt_id UUID;
    v_challenges_snapshot JSONB;
    v_metadata_snapshot JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: User is not authenticated.';
    END IF;

    SELECT * INTO v_session
    FROM public.treasure_active_sessions
    WHERE id = p_session_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Active session % not found.', p_session_id;
    END IF;

    IF v_session.status = 'completed' THEN
        SELECT id INTO v_attempt_id
        FROM public.game_attempts
        WHERE metadata->>'session_id' = p_session_id::TEXT
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'already_finalized', true,
            'attempt_id', v_attempt_id,
            'session_id', p_session_id,
            'final_score', v_session.accumulated_score
        );
    END IF;

    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = v_session.adventure_id;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_session.adventure_version_id;

    -- Dynamic count of challenges
    SELECT count(*) INTO v_total_steps
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id;

    IF v_total_steps < 1 THEN
        v_total_steps := 3;
    END IF;

    v_time_limit := COALESCE((v_ver.environment_config->>'time_limit_seconds')::INT, 600);
    v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_session.started_at))::INT;

    IF v_elapsed_seconds < (v_time_limit * 0.5) AND v_session.accumulated_score > 0 THEN
        v_speed_bonus := 10;
    END IF;

    v_final_score := LEAST(100, v_session.accumulated_score + v_speed_bonus);
    v_is_passed := (v_final_score >= 60);
    v_is_certificate_eligible := (v_final_score >= 80);

    SELECT jsonb_agg(
        jsonb_build_object(
            'step', step,
            'challenge_type', challenge_type,
            'source_question_id', source_question_id,
            'prompt', prompt,
            'image_url', image_url,
            'attempts_taken', COALESCE((v_session.step_attempts->>('step_' || step))::INT, 0)
        ) ORDER BY step ASC
    )
    INTO v_challenges_snapshot
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id;

    v_metadata_snapshot := jsonb_build_object(
        'session_id', p_session_id,
        'adventure_id', v_adv.id,
        'adventure_title', v_adv.title,
        'adventure_version_id', v_ver.id,
        'version_number', v_ver.version_number,
        'track_type', v_adv.track_type,
        'grade_subject_id', v_adv.grade_subject_id,
        'domain_id', v_adv.domain_id,
        'duration_seconds', v_elapsed_seconds,
        'base_score', v_session.accumulated_score,
        'speed_bonus', v_speed_bonus,
        'final_score', v_final_score,
        'is_passed', v_is_passed,
        'is_certificate_eligible', v_is_certificate_eligible,
        'challenges_snapshot', v_challenges_snapshot,
        'sealed_at', now()
    );

    INSERT INTO public.game_attempts (
        user_id,
        game_type,
        track_type,
        grade_subject_id,
        domain_id,
        score,
        correct_count,
        wrong_count,
        total_questions,
        duration_seconds,
        metadata,
        created_at
    )
    VALUES (
        v_user_id,
        'treasure',
        COALESCE(v_adv.track_type, 'nafis'),
        v_adv.grade_subject_id,
        v_adv.domain_id,
        v_final_score,
        v_total_steps,
        0,
        v_total_steps,
        v_elapsed_seconds,
        v_metadata_snapshot,
        now()
    )
    RETURNING id INTO v_attempt_id;

    UPDATE public.treasure_active_sessions
    SET status = 'completed',
        ended_at = now(),
        current_phase = 'completed',
        accumulated_score = v_final_score,
        updated_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', v_attempt_id,
        'session_id', p_session_id,
        'final_score', v_final_score,
        'base_score', v_session.accumulated_score,
        'speed_bonus', v_speed_bonus,
        'duration_seconds', v_elapsed_seconds,
        'is_passed', v_is_passed,
        'is_certificate_eligible', v_is_certificate_eligible
    );
END;
$$;
