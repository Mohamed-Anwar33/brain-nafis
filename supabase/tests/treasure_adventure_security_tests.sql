-- ==============================================================================
-- Adversarial Security & Verification Test Suite
-- Treasure Adventure: Phase 1.3
-- Description: Comprehensive test scenarios verifying security bounds,
--              concurrency locks, immutability triggers, and server validations.
-- ==============================================================================

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_student_a_id UUID := gen_random_uuid();
    v_student_b_id UUID := gen_random_uuid();
    v_gs_id UUID;
    v_domain_id UUID;
    v_adv_id UUID;
    v_ver_1_id UUID;
    v_ver_2_id UUID;
    v_hotspot_id UUID;
    v_session_id UUID;
    v_req_1_id UUID := gen_random_uuid();
    v_res JSONB;
    v_passed_tests INT := 0;
    v_failed_tests INT := 0;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'STARTING ADVERSARIAL SECURITY VERIFICATION (PHASE 1.3)';
    RAISE NOTICE '=======================================================';

    -- 0. Get an existing grade_subject and domain for testing
    SELECT id INTO v_gs_id FROM public.study_grade_subjects WHERE is_active = true LIMIT 1;
    SELECT id INTO v_domain_id FROM public.central_domains WHERE grade_subject_id = v_gs_id AND is_active = true LIMIT 1;

    IF v_gs_id IS NULL THEN
        RAISE NOTICE 'SKIP: study_grade_subjects is empty in local environment.';
        RETURN;
    END IF;

    -- ==========================================================================
    -- TEST 1: Academic Scope Check Constraint
    -- ==========================================================================
    BEGIN
        -- Invalid: 'nafis' with a domain_id should be rejected
        INSERT INTO public.treasure_adventures (title, track_type, grade_subject_id, domain_id, status)
        VALUES ('Test Invalid Nafis', 'nafis', v_gs_id, v_domain_id, 'draft');

        RAISE EXCEPTION 'TEST 1 FAILED: Invalid nafis scope was accepted.';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ TEST 1 PASSED: Academic scope constraint successfully rejected nafis with domain.';
        v_passed_tests := v_passed_tests + 1;
    END;

    -- Create valid adventure
    INSERT INTO public.treasure_adventures (title, track_type, grade_subject_id, domain_id, status)
    VALUES ('Valid Nafis Adventure', 'nafis', v_gs_id, NULL, 'draft')
    RETURNING id INTO v_adv_id;

    -- ==========================================================================
    -- TEST 2: Single Draft Version Rule (idx_single_draft_version_per_adventure)
    -- ==========================================================================
    INSERT INTO public.treasure_adventure_versions (adventure_id, version_number, story_clue, is_draft)
    VALUES (v_adv_id, 1, 'Clue 1', true)
    RETURNING id INTO v_ver_1_id;

    BEGIN
        -- Attempt to create a SECOND draft version for the same adventure
        INSERT INTO public.treasure_adventure_versions (adventure_id, version_number, story_clue, is_draft)
        VALUES (v_adv_id, 2, 'Clue 2', true);

        RAISE EXCEPTION 'TEST 2 FAILED: Second draft version was permitted.';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE '✓ TEST 2 PASSED: Partial unique index rejected duplicate draft version.';
        v_passed_tests := v_passed_tests + 1;
    END;

    -- ==========================================================================
    -- TEST 3: Hotspot Coordinates Range Constraints
    -- ==========================================================================
    BEGIN
        INSERT INTO public.treasure_hotspot_questions (
            title, prompt, image_url, target_x_percent, target_y_percent, tolerance_radius_percent, track_type, grade_subject_id
        ) VALUES (
            'Invalid Coords', 'Click target', 'https://example.com/img.webp', 150.00, 50.00, 8.00, 'nafis', v_gs_id
        );

        RAISE EXCEPTION 'TEST 3 FAILED: target_x_percent > 100 was permitted.';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ TEST 3 PASSED: Hotspot coordinate check constraint rejected out-of-range value (150%%).';
        v_passed_tests := v_passed_tests + 1;
    END;

    -- ==========================================================================
    -- TEST 4: Published Version Integrity (published_version_id cannot be a draft)
    -- ==========================================================================
    BEGIN
        UPDATE public.treasure_adventures
        SET published_version_id = v_ver_1_id
        WHERE id = v_adv_id;

        RAISE EXCEPTION 'TEST 4 FAILED: published_version_id allowed pointing to a draft version.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM ILIKE '%CANNOT_PUBLISH_DRAFT_VERSION%' THEN
            RAISE NOTICE '✓ TEST 4 PASSED: Trigger rejected assigning a draft version as published_version_id.';
            v_passed_tests := v_passed_tests + 1;
        ELSE
            RAISE EXCEPTION 'TEST 4 UNEXPECTED ERROR: %', SQLERRM;
        END IF;
    END;

    -- Populate 3 challenge snapshots for version 1
    INSERT INTO public.treasure_adventure_version_challenges (
        adventure_version_id, step, challenge_type, source_question_id, prompt, content_payload, solution_payload
    ) VALUES 
    (v_ver_1_id, 1, 'mcq', gen_random_uuid(), 'What is 2+2?', '{"choices": [{"id": "c1", "text": "4"}, {"id": "c2", "text": "5"}]}'::jsonb, '{"correct_choice_id": "c1"}'::jsonb),
    (v_ver_1_id, 2, 'ordering', gen_random_uuid(), 'Order numbers', '{"items": [{"id": "1", "text": "First"}, {"id": "2", "text": "Second"}]}'::jsonb, '{"correct_order": ["1", "2"]}'::jsonb),
    (v_ver_1_id, 3, 'hotspot', gen_random_uuid(), 'Click the center', '{"image_url": "https://example.com/cell.webp"}'::jsonb, '{"target_x_percent": 50.00, "target_y_percent": 50.00, "tolerance_radius_percent": 10.00}'::jsonb);

    -- Transition version to published (is_draft = false)
    UPDATE public.treasure_adventure_versions
    SET is_draft = false
    WHERE id = v_ver_1_id;

    UPDATE public.treasure_adventures
    SET published_version_id = v_ver_1_id,
        status = 'published'
    WHERE id = v_adv_id;

    -- ==========================================================================
    -- TEST 5: Published Version Immutability (trg_protect_adventure_versions)
    -- ==========================================================================
    BEGIN
        UPDATE public.treasure_adventure_versions
        SET story_clue = 'Hacked Clue'
        WHERE id = v_ver_1_id;

        RAISE EXCEPTION 'TEST 5 FAILED: Published version allowed UPDATE.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM ILIKE '%CANNOT_MUTATE_PUBLISHED_VERSION%' THEN
            RAISE NOTICE '✓ TEST 5 PASSED: Immutability trigger rejected UPDATE on published version.';
            v_passed_tests := v_passed_tests + 1;
        ELSE
            RAISE EXCEPTION 'TEST 5 UNEXPECTED ERROR: %', SQLERRM;
        END IF;
    END;

    -- ==========================================================================
    -- TEST 6: Published Challenge Snapshot Immutability
    -- ==========================================================================
    BEGIN
        -- Attempt to update challenge content of a published version
        UPDATE public.treasure_adventure_version_challenges
        SET prompt = 'Tampered Prompt'
        WHERE adventure_version_id = v_ver_1_id AND step = 1;

        RAISE EXCEPTION 'TEST 6 FAILED: Challenge snapshot allowed UPDATE after publication.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM ILIKE '%CANNOT_MUTATE_PUBLISHED_CHALLENGE%' THEN
            RAISE NOTICE '✓ TEST 6 PASSED: Immutability trigger rejected UPDATE on published challenge snapshot.';
            v_passed_tests := v_passed_tests + 1;
        ELSE
            RAISE EXCEPTION 'TEST 6 UNEXPECTED ERROR: %', SQLERRM;
        END IF;
    END;

    BEGIN
        -- Attempt to insert a new challenge into a published version
        INSERT INTO public.treasure_adventure_version_challenges (
            adventure_version_id, step, challenge_type, source_question_id, prompt, content_payload, solution_payload
        ) VALUES (
            v_ver_1_id, 4, 'mcq', gen_random_uuid(), 'Illegal step 4', '{}'::jsonb, '{}'::jsonb
        );

        RAISE EXCEPTION 'TEST 6.2 FAILED: Challenge snapshot allowed INSERT into published version.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM ILIKE '%CANNOT_MUTATE_PUBLISHED_CHALLENGE%' THEN
            RAISE NOTICE '✓ TEST 6.2 PASSED: Immutability trigger rejected INSERT into published version challenges.';
            v_passed_tests := v_passed_tests + 1;
        ELSE
            RAISE EXCEPTION 'TEST 6.2 UNEXPECTED ERROR: %', SQLERRM;
        END IF;
    END;

    -- ==========================================================================
    -- TEST 7: Single Active Session Constraint (idx_single_active_session_per_user)
    -- ==========================================================================
    INSERT INTO public.treasure_active_sessions (
        user_id, adventure_id, adventure_version_id, status, current_phase, current_challenge_step
    ) VALUES (
        v_student_a_id, v_adv_id, v_ver_1_id, 'active', 'briefing', 1
    ) RETURNING id INTO v_session_id;

    BEGIN
        -- Attempt to create a SECOND active session for the same user on the same adventure
        INSERT INTO public.treasure_active_sessions (
            user_id, adventure_id, adventure_version_id, status, current_phase, current_challenge_step
        ) VALUES (
            v_student_a_id, v_adv_id, v_ver_1_id, 'active', 'briefing', 1
        );

        RAISE EXCEPTION 'TEST 7 FAILED: Duplicate active session was permitted.';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE '✓ TEST 7 PASSED: Partial unique index rejected duplicate active session for the same student.';
        v_passed_tests := v_passed_tests + 1;
    END;

    -- ==========================================================================
    -- TEST 8: Idempotency Ledger Unique Constraint
    -- ==========================================================================
    INSERT INTO public.treasure_step_requests (session_id, client_request_id, step, result_payload)
    VALUES (v_session_id, v_req_1_id, 1, '{"is_correct": true, "points": 30}'::jsonb);

    BEGIN
        -- Attempt to insert the same client_request_id for the same session
        INSERT INTO public.treasure_step_requests (session_id, client_request_id, step, result_payload)
        VALUES (v_session_id, v_req_1_id, 1, '{"is_correct": false, "points": 0}'::jsonb);

        RAISE EXCEPTION 'TEST 8 FAILED: Duplicate idempotency request was permitted.';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE '✓ TEST 8 PASSED: Idempotency ledger rejected duplicate client_request_id.';
        v_passed_tests := v_passed_tests + 1;
    END;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ADVERSARIAL SECURITY TESTS COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'TOTAL TESTS PASSED: %', v_passed_tests;
    RAISE NOTICE '=======================================================';

    -- Rollback all test data cleanly
    RAISE EXCEPTION 'TEST_SUITE_CLEANUP_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_SUITE_CLEANUP_ROLLBACK' THEN
        RAISE NOTICE 'Test environment rolled back cleanly without polluting database.';
    ELSE
        RAISE;
    END IF;
END $$;
