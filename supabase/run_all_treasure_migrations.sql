-- ==============================================================================
-- ALL-IN-ONE TREASURE ADVENTURE DATABASE MIGRATION & SEED (Revision 3.5)
-- Instructions: Run this entire script in your Supabase SQL Editor (Dashboard).
-- It creates all tables, triggers, constraints, RLS policies, RPCs,
-- inserts a playable demo adventure for "ثالث متوسط - علوم", and reloads PostgREST cache.
-- ==============================================================================

-- ==============================================================================
-- 1. UPDATE game_attempts: Expand game_type CHECK constraint to support 'treasure'
-- ==============================================================================
DO $$
DECLARE
    existing_values text[];
    constraint_name text;
    allowed_values text[];
    constraint_sql text;
BEGIN
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'game_attempts'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%game_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.game_attempts DROP CONSTRAINT %I', constraint_name);
    END IF;

    SELECT COALESCE(array_agg(DISTINCT game_type), ARRAY[]::text[])
    INTO existing_values
    FROM public.game_attempts;

    SELECT ARRAY(
        SELECT DISTINCT value
        FROM unnest(
            existing_values
            || ARRAY[
                'quick_quiz',
                'exam',
                'matching',
                'ordering',
                'speed',
                'stages',
                'wheel_science',
                'central_exam',
                'treasure'
            ]
        ) AS value
    )
    INTO allowed_values;

    constraint_sql := 'ALTER TABLE public.game_attempts ADD CONSTRAINT game_attempts_game_type_check CHECK (game_type IN ('
        || array_to_string(
            ARRAY(SELECT quote_literal(value) FROM unnest(allowed_values) AS value),
            ', '
        )
        || '))';

    EXECUTE constraint_sql;
END $$;


-- ==============================================================================
-- 2. CREATE TABLE treasure_hotspot_questions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_hotspot_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_x_percent NUMERIC(5,2) NOT NULL,
    target_y_percent NUMERIC(5,2) NOT NULL,
    tolerance_radius_percent NUMERIC(5,2) NOT NULL DEFAULT 8.00,
    wrong_reason TEXT,
    explanation_url TEXT,
    track_type TEXT NOT NULL DEFAULT 'nafis',
    grade_subject_id UUID NOT NULL REFERENCES public.study_grade_subjects(id) ON DELETE RESTRICT,
    domain_id UUID REFERENCES public.central_domains(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_hotspot_target_x CHECK (target_x_percent >= 0 AND target_x_percent <= 100),
    CONSTRAINT chk_treasure_hotspot_target_y CHECK (target_y_percent >= 0 AND target_y_percent <= 100),
    CONSTRAINT chk_treasure_hotspot_tolerance CHECK (tolerance_radius_percent > 0 AND tolerance_radius_percent <= 100),

    CONSTRAINT chk_treasure_hotspot_academic_scope CHECK (
        (track_type = 'nafis' AND grade_subject_id IS NOT NULL AND domain_id IS NULL)
        OR
        (track_type IN ('central', 'central_exam') AND grade_subject_id IS NOT NULL AND domain_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_treasure_hotspot_scope 
ON public.treasure_hotspot_questions(track_type, grade_subject_id, domain_id);


-- ==============================================================================
-- 3. CREATE TABLE treasure_adventures
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_adventures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    track_type TEXT NOT NULL DEFAULT 'nafis',
    grade_subject_id UUID NOT NULL REFERENCES public.study_grade_subjects(id) ON DELETE RESTRICT,
    domain_id UUID REFERENCES public.central_domains(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft',
    published_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_adventures_status CHECK (status IN ('draft', 'published', 'inactive', 'archived')),

    CONSTRAINT chk_treasure_academic_scope CHECK (
        (track_type = 'nafis' AND grade_subject_id IS NOT NULL AND domain_id IS NULL)
        OR
        (track_type IN ('central', 'central_exam') AND grade_subject_id IS NOT NULL AND domain_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_treasure_adventures_scope_status 
ON public.treasure_adventures(track_type, grade_subject_id, domain_id, status);


-- ==============================================================================
-- 4. CREATE TABLE treasure_adventure_versions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_adventure_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adventure_id UUID NOT NULL REFERENCES public.treasure_adventures(id) ON DELETE RESTRICT,
    version_number INT NOT NULL DEFAULT 1,
    story_clue TEXT NOT NULL,
    is_draft BOOLEAN NOT NULL DEFAULT true,
    environment_config JSONB NOT NULL DEFAULT '{"theme": "ancient_ruins", "key_node": "statue", "time_limit_seconds": 600}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_adventure_version_pair UNIQUE (id, adventure_id),
    CONSTRAINT uq_adventure_version_number UNIQUE (adventure_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_draft_version_per_adventure
ON public.treasure_adventure_versions(adventure_id)
WHERE is_draft = true;

CREATE INDEX IF NOT EXISTS idx_treasure_versions_adventure_id
ON public.treasure_adventure_versions(adventure_id);


-- ==============================================================================
-- 5. Circular Composite FK
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_published_version_belongs_to_same_adventure'
    ) THEN
        ALTER TABLE public.treasure_adventures
        ADD CONSTRAINT fk_published_version_belongs_to_same_adventure
        FOREIGN KEY (published_version_id, id)
        REFERENCES public.treasure_adventure_versions(id, adventure_id)
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;


-- ==============================================================================
-- 6. Published Version Integrity Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.enforce_published_version_not_draft()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_target_is_draft BOOLEAN;
BEGIN
    IF NEW.published_version_id IS NOT NULL THEN
        SELECT is_draft INTO v_target_is_draft
        FROM public.treasure_adventure_versions
        WHERE id = NEW.published_version_id;

        IF v_target_is_draft IS NULL THEN
            RAISE EXCEPTION 'PUBLISHED_VERSION_NOT_FOUND: Version % does not exist', NEW.published_version_id;
        END IF;

        IF v_target_is_draft = true THEN
            RAISE EXCEPTION 'CANNOT_PUBLISH_DRAFT_VERSION: published_version_id must reference a finalized version where is_draft is false';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_published_version_not_draft ON public.treasure_adventures;
CREATE TRIGGER trg_enforce_published_version_not_draft
BEFORE INSERT OR UPDATE OF published_version_id ON public.treasure_adventures
FOR EACH ROW
EXECUTE FUNCTION public.enforce_published_version_not_draft();


-- ==============================================================================
-- 7. Published Version Immutability Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_published_adventure_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_draft = false THEN
            RAISE EXCEPTION 'CANNOT_DELETE_PUBLISHED_VERSION: Published versions are immutable historical records and cannot be deleted.';
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_draft = true AND NEW.is_draft = false THEN
            RETURN NEW;
        END IF;

        IF OLD.is_draft = false THEN
            RAISE EXCEPTION 'CANNOT_MUTATE_PUBLISHED_VERSION: Version % is published and strictly immutable.', OLD.id;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_adventure_versions ON public.treasure_adventure_versions;
CREATE TRIGGER trg_protect_adventure_versions
BEFORE UPDATE OR DELETE ON public.treasure_adventure_versions
FOR EACH ROW
EXECUTE FUNCTION public.protect_published_adventure_versions();


-- ==============================================================================
-- 8. CREATE TABLE treasure_adventure_version_challenges
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_adventure_version_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adventure_version_id UUID NOT NULL REFERENCES public.treasure_adventure_versions(id) ON DELETE RESTRICT,
    step INT NOT NULL,
    challenge_type TEXT NOT NULL,
    source_question_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    image_url TEXT,
    wrong_reason TEXT,
    explanation_url TEXT,
    content_payload JSONB NOT NULL,
    solution_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_challenge_step CHECK (step BETWEEN 1 AND 3),
    CONSTRAINT chk_treasure_challenge_type CHECK (challenge_type IN ('mcq', 'ordering', 'hotspot')),
    CONSTRAINT uq_adventure_version_challenge_step UNIQUE (adventure_version_id, step)
);

CREATE INDEX IF NOT EXISTS idx_treasure_version_challenges_version
ON public.treasure_adventure_version_challenges(adventure_version_id);


-- ==============================================================================
-- 9. Published Challenge Snapshot Immutability Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_published_version_challenges()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent_version_id UUID;
    v_is_draft BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_parent_version_id := OLD.adventure_version_id;
    ELSE
        v_parent_version_id := NEW.adventure_version_id;
    END IF;

    IF v_parent_version_id IS NULL THEN
        RAISE EXCEPTION 'PARENT_VERSION_NOT_PROVIDED: adventure_version_id cannot be null';
    END IF;

    SELECT is_draft INTO v_is_draft
    FROM public.treasure_adventure_versions
    WHERE id = v_parent_version_id;

    IF v_is_draft IS NULL THEN
        RAISE EXCEPTION 'PARENT_VERSION_NOT_FOUND: Adventure version % does not exist', v_parent_version_id;
    END IF;

    IF v_is_draft = false THEN
        RAISE EXCEPTION 'CANNOT_MUTATE_PUBLISHED_CHALLENGE: Challenges linked to published version % are strictly immutable.', v_parent_version_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_version_challenges ON public.treasure_adventure_version_challenges;
CREATE TRIGGER trg_protect_version_challenges
BEFORE INSERT OR UPDATE OR DELETE ON public.treasure_adventure_version_challenges
FOR EACH ROW
EXECUTE FUNCTION public.protect_published_version_challenges();


-- ==============================================================================
-- 10. CREATE TABLE treasure_active_sessions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    adventure_id UUID NOT NULL REFERENCES public.treasure_adventures(id) ON DELETE RESTRICT,
    adventure_version_id UUID NOT NULL REFERENCES public.treasure_adventure_versions(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active',
    current_phase TEXT NOT NULL DEFAULT 'briefing',
    current_challenge_step INT NOT NULL DEFAULT 1,
    accumulated_score INT NOT NULL DEFAULT 0,
    step_attempts JSONB NOT NULL DEFAULT '{"step_1": 0, "step_2": 0, "step_3": 0}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_session_status CHECK (status IN ('active', 'completed', 'abandoned', 'expired')),
    CONSTRAINT chk_treasure_session_phase CHECK (current_phase IN ('briefing', 'exploration', 'key_found', 'portal', 'challenges', 'treasure', 'completed')),
    CONSTRAINT chk_treasure_session_step CHECK (current_challenge_step BETWEEN 1 AND 4)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_session_per_user
ON public.treasure_active_sessions(user_id, adventure_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_treasure_sessions_user_status 
ON public.treasure_active_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_treasure_sessions_adventure 
ON public.treasure_active_sessions(adventure_id, adventure_version_id);


-- ==============================================================================
-- 11. CREATE TABLE treasure_step_requests
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_step_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.treasure_active_sessions(id) ON DELETE RESTRICT,
    client_request_id UUID NOT NULL,
    step INT NOT NULL,
    answer_payload JSONB,
    result_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_step_request_step CHECK (step BETWEEN 1 AND 3),
    CONSTRAINT uq_session_client_request UNIQUE (session_id, client_request_id)
);

ALTER TABLE public.treasure_step_requests ADD COLUMN IF NOT EXISTS answer_payload JSONB;
ALTER TABLE public.treasure_step_requests ADD COLUMN IF NOT EXISTS response_payload JSONB;
ALTER TABLE public.treasure_step_requests ALTER COLUMN result_payload DROP NOT NULL;
ALTER TABLE public.treasure_step_requests ALTER COLUMN result_payload SET DEFAULT '{}'::jsonb;


-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.treasure_hotspot_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_adventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_adventure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_adventure_version_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_step_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage hotspot questions" ON public.treasure_hotspot_questions;
CREATE POLICY "Admins manage hotspot questions"
ON public.treasure_hotspot_questions FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage treasure adventures" ON public.treasure_adventures;
CREATE POLICY "Admins manage treasure adventures"
ON public.treasure_adventures FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Students view published adventures" ON public.treasure_adventures;
CREATE POLICY "Students view published adventures"
ON public.treasure_adventures FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage adventure versions" ON public.treasure_adventure_versions;
CREATE POLICY "Admins manage adventure versions"
ON public.treasure_adventure_versions FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Students view published versions" ON public.treasure_adventure_versions;
CREATE POLICY "Students view published versions"
ON public.treasure_adventure_versions FOR SELECT
USING (is_draft = false);

DROP POLICY IF EXISTS "Admins manage version challenges" ON public.treasure_adventure_version_challenges;
CREATE POLICY "Admins manage version challenges"
ON public.treasure_adventure_version_challenges FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins view all sessions" ON public.treasure_active_sessions;
CREATE POLICY "Admins view all sessions"
ON public.treasure_active_sessions FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Students view own sessions" ON public.treasure_active_sessions;
CREATE POLICY "Students view own sessions"
ON public.treasure_active_sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view step requests" ON public.treasure_step_requests;
CREATE POLICY "Admins view step requests"
ON public.treasure_step_requests FOR SELECT
USING (public.is_admin());


-- ==============================================================================
-- 13. CORE BUSINESS RPCs
-- ==============================================================================

-- 13.1 publish_treasure_adventure_version
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
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only platform administrators can publish adventures.';
    END IF;

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

    SELECT COUNT(*) INTO v_challenge_count
    FROM public.treasure_adventure_version_challenges
    WHERE adventure_version_id = p_version_id;

    IF v_challenge_count <> 3 THEN
        RAISE EXCEPTION 'INCOMPLETE_CHALLENGES: Exactly 3 challenges are required to publish. Found % challenges.', v_challenge_count;
    END IF;

    UPDATE public.treasure_adventure_versions
    SET is_draft = false,
        updated_at = now()
    WHERE id = p_version_id;

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


-- 13.2 start_treasure_session
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

    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = p_adventure_id AND status = 'published';

    IF v_adv.id IS NULL THEN
        RAISE EXCEPTION 'ADVENTURE_UNAVAILABLE: Adventure % is not active or published.', p_adventure_id;
    END IF;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_adv.published_version_id AND is_draft = false;

    IF v_ver.id IS NULL THEN
        RAISE EXCEPTION 'VERSION_UNAVAILABLE: Published adventure version is missing or invalid.';
    END IF;

    v_time_limit := COALESCE((v_ver.environment_config->>'time_limit_seconds')::INT, 600);

    SELECT * INTO v_existing_session
    FROM public.treasure_active_sessions
    WHERE user_id = v_user_id
      AND adventure_id = p_adventure_id
      AND status = 'active'
    FOR UPDATE;

    IF v_existing_session.id IS NOT NULL THEN
        IF now() > (v_existing_session.started_at + (v_time_limit * interval '1 second')) THEN
            UPDATE public.treasure_active_sessions
            SET status = 'expired',
                ended_at = now(),
                updated_at = now()
            WHERE id = v_existing_session.id;
        ELSE
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


-- 13.3 advance_treasure_phase
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


-- 13.4 submit_treasure_step
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
        IF v_next_step > 3 THEN
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


-- 13.5 finalize_treasure_attempt
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
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: User is not authenticated.';
    END IF;

    SELECT * INTO v_session
    FROM public.treasure_active_sessions
    WHERE id = p_session_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Session % not found.', p_session_id;
    END IF;

    IF v_session.status = 'completed' THEN
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

    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = v_session.adventure_id;

    SELECT * INTO v_ver
    FROM public.treasure_adventure_versions
    WHERE id = v_session.adventure_version_id;

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
        3,
        0,
        3,
        v_elapsed_seconds,
        v_metadata_snapshot,
        now()
    )
    RETURNING id INTO v_attempt_id;

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


-- 13.6 preview_treasure_admin
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
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only platform administrators can preview adventures.';
    END IF;

    SELECT * INTO v_adv
    FROM public.treasure_adventures
    WHERE id = p_adventure_id;

    IF v_adv.id IS NULL THEN
        RAISE EXCEPTION 'ADVENTURE_NOT_FOUND: Adventure % not found.', p_adventure_id;
    END IF;

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

    SELECT jsonb_agg(
        jsonb_build_object(
            'step', step,
            'challenge_type', challenge_type,
            'prompt', prompt,
            'image_url', image_url,
            'wrong_reason', wrong_reason,
            'explanation_url', explanation_url,
            'content', content_payload,
            'solution_preview', solution_payload
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


-- ==============================================================================
-- 14. SEED DEMO ADVENTURE (Specifically for Grade Subject: ثالث متوسط - علوم)
-- ==============================================================================
DO $$
DECLARE
    v_target_gs_id UUID := 'd5d10da4-4861-456d-a7a4-0b124e9a16d1';
    v_adv_id UUID;
    v_ver_id UUID;
BEGIN
    -- Check if target grade subject exists
    IF EXISTS (SELECT 1 FROM public.study_grade_subjects WHERE id = v_target_gs_id) THEN
        
        -- Check if adventure already exists to avoid duplicates
        IF NOT EXISTS (SELECT 1 FROM public.treasure_adventures WHERE grade_subject_id = v_target_gs_id AND title = 'مغامرة الكنز العلمي: أسرار المادة والطاقة') THEN
            
            -- 1. Create Adventure Container (Status: draft)
            INSERT INTO public.treasure_adventures (
                title,
                description,
                track_type,
                grade_subject_id,
                domain_id,
                status
            ) VALUES (
                'مغامرة الكنز العلمي: أسرار المادة والطاقة',
                'رحلة استكشافية ثلاثية الأبعاد لفك شفرات المادة والطاقة وأقفال البوابة الحجرية الثلاثة.',
                'nafis',
                v_target_gs_id,
                NULL,
                'draft'
            ) RETURNING id INTO v_adv_id;

            -- 2. Create Draft Version (is_draft: true)
            INSERT INTO public.treasure_adventure_versions (
                adventure_id,
                version_number,
                story_clue,
                is_draft,
                environment_config
            ) VALUES (
                v_adv_id,
                1,
                'المفتاح السري محفور بجوار المسلة الحجرية القديمة، ابحث عن الرموز المتوهجة وافتح بوابة الأسرار!',
                true,
                '{"theme": "ancient_ruins", "key_node": "statue", "time_limit_seconds": 600}'::jsonb
            ) RETURNING id INTO v_ver_id;

            -- 3. Insert 3 Challenge Snapshots into the Draft Version
            INSERT INTO public.treasure_adventure_version_challenges (
                adventure_version_id,
                step,
                challenge_type,
                source_question_id,
                prompt,
                wrong_reason,
                explanation_url,
                content_payload,
                solution_payload
            ) VALUES
            -- Challenge 1: MCQ
            (
                v_ver_id,
                1,
                'mcq',
                gen_random_uuid(),
                'في أي حالة من حالات المادة تكون الجسيمات متقاربة جداً وتهتز في مكانها دون أن تنتقل من موضعها؟',
                'تذكر أن حركة الجسيمات الاهتزازية الموضعية ميزة أساسية للمواد ذات الشكل والحجم الثابتين.',
                NULL,
                '{"choices": [{"id": "c1", "text": "الحالة الصلبة"}, {"id": "c2", "text": "الحالة السائلة"}, {"id": "c3", "text": "الحالة الغازية"}, {"id": "c4", "text": "حالة البلازما"}]}'::jsonb,
                '{"correct_choice_id": "c1"}'::jsonb
            ),
            -- Challenge 2: Ordering
            (
                v_ver_id,
                2,
                'ordering',
                gen_random_uuid(),
                'رتب خطوات تحولات الطاقة في محطة السد الكهرومائية بالتسلسل الصحيح من البداية إلى النهاية:',
                'تبدأ العملية من طاقة الوضع المختزنة للماء المحتجز خلف السد وتنتهي بتوليد التيار الكهربائي.',
                NULL,
                '{"items": [{"id": "s1", "text": "طاقة وضع مختزنة للماء خلف السد"}, {"id": "s2", "text": "طاقة حركية بتدفق الماء عبر الأنابيب"}, {"id": "s3", "text": "طاقة ميكانيكية بتدوير شفرات التوربين"}, {"id": "s4", "text": "طاقة كهربائية منتجة عبر المولد"}], "drop_labels": ["المرحلة الأولى", "المرحلة الثانية", "المرحلة الثالثة", "المرحلة الرابعة"]}'::jsonb,
                '{"correct_order": ["s1", "s2", "s3", "s4"]}'::jsonb
            ),
            -- Challenge 3: Hotspot
            (
                v_ver_id,
                3,
                'hotspot',
                gen_random_uuid(),
                'انقر على النواة المركزية للذرة التي تحتوي على البروتونات والنيوترونات:',
                'تقع النواة في المركز تماماً وتحيط بها مستويات الطاقة التي تدور فيها الإلكترونات.',
                'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80',
                '{"image_url": "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80"}'::jsonb,
                '{"target_x_percent": 50.0, "target_y_percent": 50.0, "tolerance_radius_percent": 15.0}'::jsonb
            );

            -- 4. Mark the version as finalized and immutable (is_draft: false)
            UPDATE public.treasure_adventure_versions
            SET is_draft = false,
                updated_at = now()
            WHERE id = v_ver_id;

            -- 5. Link published_version_id and mark adventure published
            UPDATE public.treasure_adventures
            SET published_version_id = v_ver_id,
                status = 'published',
                updated_at = now()
            WHERE id = v_adv_id;

        END IF;
    END IF;
END $$;


-- ==============================================================================
-- 15. RELOAD PostgREST SCHEMA CACHE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
