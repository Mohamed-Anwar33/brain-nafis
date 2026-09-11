-- ==============================================================================
-- Migration: Treasure Adventure - Phase 1.2: Server-Authoritative Engine & RPCs
-- Description: Core business RPCs, atomic publication lock, state machine transitions,
--              server-side Euclidean validation, idempotency ledger execution,
--              speed bonus scoring, and immutable attempt snapshot persistence.
-- ==============================================================================

-- ==============================================================================
-- 1. Helper Function: Validate Academic Selection Scope
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_treasure_scope(
    p_track_type TEXT,
    p_grade_subject_id UUID,
    p_domain_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_domain_gs_id UUID;
BEGIN
    IF p_grade_subject_id IS NULL THEN
        RETURN false;
    END IF;

    IF p_track_type = 'nafis' THEN
        RETURN (p_domain_id IS NULL);
    ELSIF p_track_type IN ('central', 'central_exam') THEN
        IF p_domain_id IS NULL THEN
            RETURN false;
        END IF;

        SELECT grade_subject_id INTO v_domain_gs_id
        FROM public.central_domains
        WHERE id = p_domain_id;

        RETURN (v_domain_gs_id IS NOT NULL AND v_domain_gs_id = p_grade_subject_id);
    END IF;

    RETURN false;
END;
$$;


-- ==============================================================================
-- 2. RPC: Publish Adventure Version with Atomic Lock and Content Snapshotting
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.publish_treasure_adventure_version(
    p_adventure_id UUID,
    p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_adv RECORD;
    v_ver RECORD;
    v_challenge_count INT;
BEGIN
    -- 1. Authorization: Only admins can publish
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only platform administrators can publish adventures.';
    END IF;

    -- 2. Atomic Lock: Lock adventure and version rows FOR UPDATE
    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = p_adventure_id
    FOR UPDATE;

    IF v_adv.id IS NULL THEN
        RAISE EXCEPTION 'ADVENTURE_NOT_FOUND: Adventure % does not exist.', p_adventure_id;
    END IF;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = p_version_id AND adventure_id = p_adventure_id
    FOR UPDATE;

    IF v_ver.id IS NULL THEN
        RAISE EXCEPTION 'VERSION_NOT_FOUND: Version % does not belong to adventure %.', p_version_id, p_adventure_id;
    END IF;

    -- 3. Validate that exactly 3 challenge snapshots are attached to this version
    SELECT COUNT(*) INTO v_challenge_count
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = p_version_id;

    IF v_challenge_count <> 3 THEN
        RAISE EXCEPTION 'INCOMPLETE_CHALLENGES: Exactly 3 challenges are required to publish. Found % challenges.', v_challenge_count;
    END IF;

    -- 4. Mark the version as finalized and immutable (is_draft = false)
    UPDATE public.treasure_adventure_versions
    SET is_draft = false,
        updated_at = now()
    WHERE id = p_version_id;

    -- 5. Link the finalized version as the active published_version_id of the adventure
    UPDATE public.treasure_adventures
    SET published_version_id = p_version_id,
        status = 'published',
        updated_at = now()
    WHERE id = p_adventure_id;

    RETURN jsonb_build_object(
        'success', true,
        'adventure_id', p_adventure_id,
        'published_version_id', p_version_id,
        'version_number', v_ver.version_number,
        'published_at', now()
    );
END;
$$;


-- ==============================================================================
-- 3. RPC: Start Treasure Session with Self-Cleaning Expiration
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.start_treasure_session(
    p_adventure_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_adv RECORD;
    v_ver RECORD;
    v_existing_session RECORD;
    v_time_limit INT;
    v_challenges_client JSONB;
    v_new_session_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: Student must be logged in to start an adventure.';
    END IF;

    -- 1. Check adventure status
    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = p_adventure_id AND status = 'published';

    IF v_adv.id IS NULL THEN
        RAISE EXCEPTION 'ADVENTURE_UNAVAILABLE: Adventure % is not active or published.', p_adventure_id;
    END IF;

    -- 2. Fetch the published version
    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_adv.published_version_id AND is_draft = false;

    IF v_ver.id IS NULL THEN
        RAISE EXCEPTION 'VERSION_UNAVAILABLE: Published adventure version is missing or invalid.';
    END IF;

    v_time_limit := COALESCE((v_ver.environment_config->>'time_limit_seconds')::INT, 600);

    -- 3. Self-Cleaning: Check any currently active session for this user on this adventure
    SELECT * INTO v_existing_session
    FROM public.treasure_active_sessions
    WHERE user_id = v_user_id
      AND adventure_id = p_adventure_id
      AND status = 'active'
    FOR UPDATE;

    IF v_existing_session.id IS NOT NULL THEN
        -- If expired by server time limit, mark it expired
        IF now() > (v_existing_session.started_at + (v_time_limit * interval '1 second')) THEN
            UPDATE public.treasure_active_sessions
            SET status = 'expired',
                ended_at = now(),
                updated_at = now()
            WHERE id = v_existing_session.id;
        ELSE
            -- Resume active session within time limit
            -- Build client-safe payload (content_payload without solutions)
            SELECT jsonb_agg(
                jsonb_build_object(
                    'step', step,
                    'challenge_type', challenge_type,
                    'prompt', prompt,
                    'image_url', image_url,
                    'content', content_payload
                ) ORDER BY step ASC
            )
            INTO v_challenges_client
            FROM public.treasure_adventure_version_challenges
            WHERE adventure_version_id = v_existing_session.adventure_version_id;

            RETURN jsonb_build_object(
                'resumed', true,
                'session_id', v_existing_session.id,
                'adventure_id', p_adventure_id,
                'adventure_title', v_adv.title,
                'story_clue', v_ver.story_clue,
                'environment_config', v_ver.environment_config,
                'current_phase', v_existing_session.current_phase,
                'current_challenge_step', v_existing_session.current_challenge_step,
                'accumulated_score', v_existing_session.accumulated_score,
                'started_at', v_existing_session.started_at,
                'challenges', v_challenges_client
            );
        END IF;
    END IF;

    -- 4. Create new active session
    INSERT INTO public.treasure_active_sessions (
        user_id,
        adventure_id,
        adventure_version_id,
        status,
        current_phase,
        current_challenge_step,
        accumulated_score,
        started_at
    )
    VALUES (
        v_user_id,
        p_adventure_id,
        v_ver.id,
        'active',
        'briefing',
        1,
        0,
        now()
    )
    RETURNING id INTO v_new_session_id;

    -- 5. Compile student-safe challenge payload (EXCLUDING solution_payload!)
    SELECT jsonb_agg(
        jsonb_build_object(
            'step', step,
            'challenge_type', challenge_type,
            'prompt', prompt,
            'image_url', image_url,
            'content', content_payload
        ) ORDER BY step ASC
    )
    INTO v_challenges_client
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_ver.id;

    RETURN jsonb_build_object(
        'resumed', false,
        'session_id', v_new_session_id,
        'adventure_id', p_adventure_id,
        'adventure_title', v_adv.title,
        'story_clue', v_ver.story_clue,
        'environment_config', v_ver.environment_config,
        'current_phase', 'briefing',
        'current_challenge_step', 1,
        'accumulated_score', 0,
        'started_at', now(),
        'challenges', v_challenges_client
    );
END;
$$;


-- ==============================================================================
-- 4. RPC: Transition Non-Challenge Gameplay Phase (Exploration, Key, Portal)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.advance_treasure_phase(
    p_session_id UUID,
    p_target_phase TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_allowed_transition BOOLEAN := false;
BEGIN
    SELECT * INTO v_session
    FROM public.treasure_active_sessions
    WHERE id = p_session_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Active session % not found.', p_session_id;
    END IF;

    IF v_session.status <> 'active' THEN
        RAISE EXCEPTION 'SESSION_NOT_ACTIVE: Session status is %.', v_session.status;
    END IF;

    -- Idempotent: If already in target phase, return success without error
    IF v_session.current_phase = p_target_phase THEN
        RETURN jsonb_build_object(
            'success', true,
            'session_id', p_session_id,
            'current_phase', p_target_phase
        );
    END IF;

    -- Phase State Machine Transition Validation
    IF v_session.current_phase = 'briefing' AND p_target_phase = 'exploration' THEN
        v_allowed_transition := true;
    ELSIF v_session.current_phase = 'exploration' AND p_target_phase = 'key_found' THEN
        v_allowed_transition := true;
    ELSIF v_session.current_phase = 'key_found' AND p_target_phase IN ('portal', 'challenges') THEN
        v_allowed_transition := true;
    ELSIF v_session.current_phase = 'portal' AND p_target_phase = 'challenges' THEN
        v_allowed_transition := true;
    ELSIF v_session.current_phase = 'challenges' AND p_target_phase = 'treasure' AND v_session.current_challenge_step = 4 THEN
        v_allowed_transition := true;
    END IF;

    IF NOT v_allowed_transition THEN
        RAISE EXCEPTION 'INVALID_PHASE_TRANSITION: Cannot transition from % to %.', v_session.current_phase, p_target_phase;
    END IF;

    UPDATE public.treasure_active_sessions
    SET current_phase = p_target_phase,
        updated_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'current_phase', p_target_phase
    );
END;
$$;


-- ==============================================================================
-- 5. RPC: Submit Challenge Step with Idempotency Ledger & Server Validation
-- ==============================================================================
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
    v_step_key TEXT := 'step_' || p_step;
    v_current_step_attempts INT;
    v_is_correct BOOLEAN := false;
    v_points_earned INT := 0;
    v_next_step INT;
    v_next_phase TEXT;
    v_result_payload JSONB;
    
    -- Solution checking variables
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

    -- 1. Idempotency Check: Return pre-calculated result if request already processed
    SELECT result_payload INTO v_result_payload
    FROM public.treasure_step_requests
    WHERE session_id = p_session_id AND client_request_id = p_client_request_id;

    IF v_result_payload IS NOT NULL THEN
        RETURN v_result_payload;
    END IF;

    -- 2. Lock Session Row FOR UPDATE
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

    -- 3. Check Session Expiration by Server Clock
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

    -- 4. Validate Sequential Challenge Step
    IF v_session.current_challenge_step <> p_step THEN
        RAISE EXCEPTION 'OUT_OF_SEQUENCE_STEP: Current challenge step is %, received %.', v_session.current_challenge_step, p_step;
    END IF;

    -- 5. Fetch Canonical Frozen Challenge Content & Solution
    SELECT * INTO v_challenge
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_session.adventure_version_id AND step = p_step;

    IF v_challenge.id IS NULL THEN
        RAISE EXCEPTION 'CHALLENGE_NOT_FOUND: Step % challenge is not configured.', p_step;
    END IF;

    -- 6. Read & Increment Step Attempts
    v_current_step_attempts := COALESCE((v_session.step_attempts->>v_step_key)::INT, 0) + 1;

    -- 7. Validate Answer Server-Side based on Challenge Type
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
            -- Euclidean distance formula in normalized percentage space
            v_dist := sqrt(power(v_click_x - v_target_x, 2) + power(v_click_y - v_target_y, 2));
            v_is_correct := (v_dist <= v_tolerance);
        ELSE
            v_is_correct := false;
        END IF;
    END IF;

    -- 8. Apply 3-Attempt Scoring Logic
    IF v_is_correct THEN
        IF v_current_step_attempts = 1 THEN
            v_points_earned := 30; -- 25 Base + 5 First Attempt Bonus
        ELSIF v_current_step_attempts = 2 THEN
            v_points_earned := 25; -- 25 Base
        ELSE
            v_points_earned := 15; -- 15 After Viewing Explanation
        END IF;

        v_next_step := p_step + 1;
        IF v_next_step > 3 THEN
            v_next_phase := 'treasure';
        ELSE
            v_next_phase := 'challenges';
        END IF;

        -- Update Session Progress
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
        -- Incorrect Answer
        IF v_current_step_attempts >= 3 THEN
            -- Exhausted 3 attempts: move to next challenge with 0 points
            v_next_step := p_step + 1;
            IF v_next_step > 3 THEN
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
            -- Increment attempts and offer explanation on 2nd wrong attempt
            UPDATE public.treasure_active_sessions
            SET step_attempts = jsonb_set(step_attempts, ARRAY[v_step_key], to_jsonb(v_current_step_attempts)),
                updated_at = now()
            WHERE id = p_session_id;

            v_result_payload := jsonb_build_object(
                'is_correct', false,
                'points_earned', 0,
                'attempts_taken', v_current_step_attempts,
                'current_challenge_step', p_step,
                'current_phase', v_session.current_phase,
                'exhausted_attempts', false,
                'explanation', CASE WHEN v_current_step_attempts = 2 THEN jsonb_build_object(
                    'wrong_reason', v_challenge.wrong_reason,
                    'explanation_url', v_challenge.explanation_url
                ) ELSE null END
            );
        END IF;
    END IF;

    -- 9. Record Request in Idempotency Ledger
    INSERT INTO public.treasure_step_requests (
        session_id,
        client_request_id,
        step,
        result_payload
    )
    VALUES (
        p_session_id,
        p_client_request_id,
        p_step,
        v_result_payload
    );

    RETURN v_result_payload;
END;
$$;


-- ==============================================================================
-- 6. RPC: Finalize Treasure Attempt with Immutable Snapshot and game_attempts Sealing
-- ==============================================================================
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
    v_challenges_snapshot JSONB;
    v_elapsed_seconds INT;
    v_speed_bonus INT := 0;
    v_final_score INT;
    v_is_passed BOOLEAN;
    v_is_certificate_eligible BOOLEAN;
    v_attempt_id UUID;
    v_metadata_snapshot JSONB;
    v_selection_snapshot JSONB;
    v_profile_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: User is not authenticated.';
    END IF;

    -- 1. Lock Session FOR UPDATE
    SELECT * INTO v_session
    FROM public.treasure_active_sessions
    WHERE id = p_session_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Session % not found.', p_session_id;
    END IF;

    IF v_session.status = 'completed' THEN
        -- Already finalized: return existing attempt summary
        SELECT id INTO v_attempt_id
        FROM public.game_attempts
        WHERE user_id = v_user_id
          AND game_type = 'treasure'
          AND (metadata->>'session_id') = p_session_id::text
        ORDER BY created_at DESC
        LIMIT 1;

        RETURN jsonb_build_object(
            'already_completed', true,
            'attempt_id', v_attempt_id,
            'score', v_session.accumulated_score
        );
    END IF;

    IF v_session.status <> 'active' THEN
        RAISE EXCEPTION 'INVALID_SESSION_STATUS: Cannot finalize session in % status.', v_session.status;
    END IF;

    IF v_session.current_challenge_step < 4 THEN
        RAISE EXCEPTION 'CHALLENGES_INCOMPLETE: Cannot finalize before completing all 3 challenges.';
    END IF;

    -- 2. Fetch Adventure & Version
    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = v_session.adventure_id;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_session.adventure_version_id;

    -- 3. Calculate Elapsed Server Seconds & Speed Bonus (Authoritative Server Time)
    v_elapsed_seconds := GREATEST(1, EXTRACT(EPOCH FROM (now() - v_session.started_at))::INT);

    IF v_elapsed_seconds <= 180 THEN
        v_speed_bonus := 10;
    ELSIF v_elapsed_seconds < 480 THEN
        v_speed_bonus := GREATEST(0, 10 - ((v_elapsed_seconds - 180) / 30));
    ELSE
        v_speed_bonus := 0;
    END IF;

    v_final_score := LEAST(100, v_session.accumulated_score + v_speed_bonus);
    v_is_passed := (v_final_score >= 70);
    v_is_certificate_eligible := (v_final_score >= 80);

    -- 4. Build Immutable Challenge Content Snapshot
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

    -- 5. Build Metadata Snapshot
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

    v_selection_snapshot := jsonb_build_object(
        'track_type', v_adv.track_type,
        'grade_subject_id', v_adv.grade_subject_id,
        'domain_id', v_adv.domain_id
    );

    -- 6. Insert Append-Only Record into game_attempts
    INSERT INTO public.game_attempts (
        user_id,
        game_type,
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
        v_final_score,
        3, -- 3 challenges completed
        0,
        3,
        v_elapsed_seconds,
        v_metadata_snapshot,
        now()
    )
    RETURNING id INTO v_attempt_id;

    -- 7. Update Active Session to 'completed'
    UPDATE public.treasure_active_sessions
    SET status = 'completed',
        current_phase = 'completed',
        ended_at = now(),
        completed_at = now(),
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


-- ==============================================================================
-- 7. RPC: Admin Preview Adventure (Strictly Admin Authorized with Hotspot Layer)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.preview_treasure_admin(
    p_adventure_id UUID,
    p_version_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_adv RECORD;
    v_ver RECORD;
    v_target_version_id UUID;
    v_challenges_preview JSONB;
BEGIN
    -- 1. Strict Admin Authorization
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only platform administrators can preview adventures.';
    END IF;

    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = p_adventure_id;

    IF v_adv.id IS NULL THEN
        RAISE EXCEPTION 'ADVENTURE_NOT_FOUND: Adventure % not found.', p_adventure_id;
    END IF;

    -- Determine which version to preview (specified or latest draft or published)
    IF p_version_id IS NOT NULL THEN
        v_target_version_id := p_version_id;
    ELSIF v_adv.published_version_id IS NOT NULL THEN
        v_target_version_id := v_adv.published_version_id;
    ELSE
        SELECT id INTO v_target_version_id
        FROM public.treasure_adventure_versions
        WHERE adventure_id = p_adventure_id
        ORDER BY version_number DESC
        LIMIT 1;
    END IF;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_target_version_id;

    IF v_ver.id IS NULL THEN
        RAISE EXCEPTION 'VERSION_NOT_FOUND: Version for adventure % not found.', p_adventure_id;
    END IF;

    -- Compile challenges with transparent preview solutions for admin verification
    SELECT jsonb_agg(
        jsonb_build_object(
            'step', step,
            'challenge_type', challenge_type,
            'prompt', prompt,
            'image_url', image_url,
            'wrong_reason', wrong_reason,
            'explanation_url', explanation_url,
            'content', content_payload,
            'solution_preview', solution_payload -- Allowed strictly for admins in preview
        ) ORDER BY step ASC
    )
    INTO v_challenges_preview
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = v_target_version_id;

    RETURN jsonb_build_object(
        'is_preview', true,
        'adventure_id', v_adv.id,
        'adventure_title', v_adv.title,
        'status', v_adv.status,
        'version_id', v_ver.id,
        'version_number', v_ver.version_number,
        'is_draft', v_ver.is_draft,
        'story_clue', v_ver.story_clue,
        'environment_config', v_ver.environment_config,
        'challenges', v_challenges_preview
    );
END;
$$;


-- ==============================================================================
-- 8. Explicit Execution Permissions on New RPC Functions
-- ==============================================================================
REVOKE EXECUTE ON FUNCTION public.publish_treasure_adventure_version(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_treasure_adventure_version(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.start_treasure_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_treasure_session(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.advance_treasure_phase(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_treasure_phase(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_treasure_step(UUID, UUID, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_treasure_step(UUID, UUID, INT, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_treasure_attempt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_treasure_attempt(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.preview_treasure_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_treasure_admin(UUID, UUID) TO authenticated;
