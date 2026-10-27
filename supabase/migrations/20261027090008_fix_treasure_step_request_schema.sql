-- Repair the live treasure request ledger for dynamic challenge counts.
-- The ledger is keyed by (session_id, client_request_id) and intentionally stores
-- request ownership through treasure_active_sessions instead of duplicating user_id.
ALTER TABLE public.treasure_step_requests
  DROP CONSTRAINT IF EXISTS chk_treasure_step_request_step;

ALTER TABLE public.treasure_step_requests
  ADD CONSTRAINT chk_treasure_step_request_step CHECK (step >= 1);

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

    -- Lock the session before checking idempotency to serialize duplicate submissions.
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
    -- Check idempotency only after locking the owned session. This also scopes the
    -- lookup to the composite unique key and makes concurrent retries safe.
    SELECT * INTO v_req
    FROM public.treasure_step_requests
    WHERE session_id = p_session_id
      AND client_request_id = p_client_request_id;

    IF v_req.id IS NOT NULL THEN
        RETURN COALESCE(v_req.response_payload, v_req.result_payload);
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
        step,
        answer_payload,
        result_payload,
        response_payload
    )
    VALUES (
        p_client_request_id,
        p_session_id,
        p_step,
        p_answer,
        v_result_payload,
        v_result_payload
    )
    ON CONFLICT (session_id, client_request_id) DO NOTHING;

    RETURN v_result_payload;
END;
$$;

NOTIFY pgrst, 'reload schema';
