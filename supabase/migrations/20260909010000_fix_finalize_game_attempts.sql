-- ==============================================================================
-- Fix: Finalize Treasure Attempt Scope Enforcement & Idempotency Column
-- ==============================================================================

-- 1. Ensure answer_payload column exists in treasure_step_requests
ALTER TABLE public.treasure_step_requests 
ADD COLUMN IF NOT EXISTS answer_payload JSONB;

-- 2. Update finalize_treasure_attempt to pass track_type, grade_subject_id, and domain_id
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
        current_phase = 'completed',
        accumulated_score = v_final_score,
        updated_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', v_attempt_id,
        'session_id', p_session_id,
        'final_score', v_final_score,
        'is_passed', v_is_passed,
        'is_certificate_eligible', v_is_certificate_eligible,
        'speed_bonus', v_speed_bonus,
        'duration_seconds', v_elapsed_seconds,
        'challenges_snapshot', v_challenges_snapshot
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
