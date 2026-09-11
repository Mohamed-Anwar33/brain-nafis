-- ==============================================================================
-- Migration: Fix Treasure Scoring to 100% and Persist Student Name in Game Attempts
-- ==============================================================================

-- 1. Update submit_treasure_step to scale points dynamically so perfect run = 100%
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
    v_step_key TEXT := p_step::TEXT;
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
        v_is_correct := (p_answer->'ordered_item_ids' = v_challenge.solution_payload->'correct_order_ids');

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

    -- 6. Dynamic Point Calculation: Solving all steps on first attempt gives exactly 100 points
    v_step_base := 100 / v_total_steps;
    IF p_step = v_total_steps THEN
        v_step_max := 100 - (v_step_base * (v_total_steps - 1));
    ELSE
        v_step_max := v_step_base;
    END IF;

    IF v_is_correct THEN
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
                'exhausted_attempts', true,
                'current_challenge_step', v_next_step,
                'current_phase', v_next_phase,
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
                'exhausted_attempts', false,
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

    -- Record idempotency
    INSERT INTO public.treasure_step_requests (
        client_request_id,
        session_id,
        step,
        answer_payload,
        response_payload
    )
    VALUES (
        p_client_request_id,
        p_session_id,
        p_step,
        p_answer,
        v_result_payload
    );

    RETURN v_result_payload;
END;
$$;


-- 2. Update finalize_treasure_attempt to save real student_name and guarantee 100% on perfect runs
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
    v_profile_name TEXT;
    v_session RECORD;
    v_adv RECORD;
    v_ver RECORD;
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

    -- Fetch student profile name
    SELECT full_name INTO v_profile_name
    FROM public.student_profiles
    WHERE id = v_user_id;

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

    IF v_total_steps = 0 THEN
        v_total_steps := 3;
    END IF;

    v_elapsed_seconds := GREATEST(1, EXTRACT(EPOCH FROM (now() - v_session.started_at))::INT);

    -- Calculate speed bonus
    IF v_elapsed_seconds <= 120 THEN
        v_speed_bonus := 10;
    ELSIF v_elapsed_seconds <= 240 THEN
        v_speed_bonus := 5;
    ELSE
        v_speed_bonus := 0;
    END IF;

    -- Final score capped at 100; if all locks were unlocked on 1st attempt, accumulated_score is already 100
    v_final_score := LEAST(100, v_session.accumulated_score + v_speed_bonus);
    
    -- If user accumulated 90+ points and finished all challenges, award 100
    IF v_session.accumulated_score >= 90 THEN
        v_final_score := 100;
    END IF;

    v_is_passed := (v_final_score >= 60);
    v_is_certificate_eligible := (v_final_score >= 80);

    SELECT jsonb_agg(
        jsonb_build_object(
            'step', step,
            'challenge_type', challenge_type,
            'source_question_id', source_question_id,
            'prompt', prompt,
            'image_url', image_url,
            'content_payload', content_payload,
            'solution_payload', solution_payload
        ) ORDER BY step ASC
    ) INTO v_challenges_snapshot
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id;

    v_metadata_snapshot := jsonb_build_object(
        'student_name', COALESCE(v_profile_name, 'طالب متميز'),
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

    -- Insert into game_attempts satisfying enforce_selection_scope trigger
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
        'is_certificate_eligible', v_is_certificate_eligible,
        'challenges_snapshot', v_challenges_snapshot
    );
END;
$$;
