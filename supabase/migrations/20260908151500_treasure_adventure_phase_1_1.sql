-- ==============================================================================
-- Migration: Treasure Adventure - Phase 1.1: Migrations & Schema Foundation
-- Description: Core schema, constraints, indexes, triggers and security foundation
--              for Treasure Adventure (Revision 3.5 Implementation Baseline)
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

    -- Hotspot coordinate normalization rules (percentages)
    CONSTRAINT chk_treasure_hotspot_target_x CHECK (target_x_percent >= 0 AND target_x_percent <= 100),
    CONSTRAINT chk_treasure_hotspot_target_y CHECK (target_y_percent >= 0 AND target_y_percent <= 100),
    CONSTRAINT chk_treasure_hotspot_tolerance CHECK (tolerance_radius_percent > 0 AND tolerance_radius_percent <= 100),

    -- Academic scope rule
    CONSTRAINT chk_treasure_hotspot_academic_scope CHECK (
        (track_type = 'nafis' AND grade_subject_id IS NOT NULL AND domain_id IS NULL)
        OR
        (track_type IN ('central', 'central_exam') AND grade_subject_id IS NOT NULL AND domain_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_treasure_hotspot_scope 
ON public.treasure_hotspot_questions(track_type, grade_subject_id, domain_id);


-- ==============================================================================
-- 3. CREATE TABLE treasure_adventures (Initial definition without published_version_id FK)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_adventures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    track_type TEXT NOT NULL DEFAULT 'nafis',
    grade_subject_id UUID NOT NULL REFERENCES public.study_grade_subjects(id) ON DELETE RESTRICT,
    domain_id UUID REFERENCES public.central_domains(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft',
    published_version_id UUID, -- Circular FK added after treasure_adventure_versions creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_adventures_status CHECK (status IN ('draft', 'published', 'inactive', 'archived')),

    -- Academic scope rule
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

    -- Composite uniqueness for pairing and FK reference
    CONSTRAINT uq_adventure_version_pair UNIQUE (id, adventure_id),
    CONSTRAINT uq_adventure_version_number UNIQUE (adventure_id, version_number)
);

-- Partial Unique Index: Exactly ONE draft per adventure allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_draft_version_per_adventure
ON public.treasure_adventure_versions(adventure_id)
WHERE is_draft = true;

CREATE INDEX IF NOT EXISTS idx_treasure_versions_adventure_id
ON public.treasure_adventure_versions(adventure_id);


-- ==============================================================================
-- 5. Circular Composite FK: treasure_adventures(published_version_id, id) -> versions(id, adventure_id)
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
-- 6. Published Version Integrity: Enforce published_version_id is NOT a draft
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
-- 7. Published Version Immutability Trigger: treasure_adventure_versions
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
        -- Allow the transition from draft -> published (is_draft: true -> false)
        IF OLD.is_draft = true AND NEW.is_draft = false THEN
            RETURN NEW;
        END IF;

        -- For already published versions (is_draft was false), forbid any mutation
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
-- 8. CREATE TABLE treasure_adventure_version_challenges (Frozen Snapshot Content)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_adventure_version_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adventure_version_id UUID NOT NULL REFERENCES public.treasure_adventure_versions(id) ON DELETE RESTRICT,
    step INT NOT NULL,
    challenge_type TEXT NOT NULL,
    source_question_id UUID NOT NULL, -- Reference to questions, ordering_game_questions, or treasure_hotspot_questions
    prompt TEXT NOT NULL,
    image_url TEXT,
    wrong_reason TEXT,
    explanation_url TEXT,
    content_payload JSONB NOT NULL,   -- Safe payload served to client (choices without is_correct, shuffled items)
    solution_payload JSONB NOT NULL,  -- Server-only verification payload (correct answer, correct order, target coords)
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

-- Partial Unique Index: Exactly ONE active session per user on an adventure at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_session_per_user
ON public.treasure_active_sessions(user_id, adventure_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_treasure_sessions_user_status 
ON public.treasure_active_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_treasure_sessions_adventure 
ON public.treasure_active_sessions(adventure_id, adventure_version_id);


-- ==============================================================================
-- 11. CREATE TABLE treasure_step_requests (Idempotency Ledger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.treasure_step_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.treasure_active_sessions(id) ON DELETE RESTRICT,
    client_request_id UUID NOT NULL,
    step INT NOT NULL,
    result_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_treasure_step_request_step CHECK (step BETWEEN 1 AND 3),
    CONSTRAINT uq_session_client_request UNIQUE (session_id, client_request_id)
);


-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) - Foundation Layer
-- ==============================================================================

-- Enable RLS on all newly created tables
ALTER TABLE public.treasure_hotspot_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_adventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_adventure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_adventure_version_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_step_requests ENABLE ROW LEVEL SECURITY;

-- 12.1 treasure_hotspot_questions
-- Admins have full access
DROP POLICY IF EXISTS "Admins manage hotspot questions" ON public.treasure_hotspot_questions;
CREATE POLICY "Admins manage hotspot questions"
ON public.treasure_hotspot_questions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 12.2 treasure_adventures
-- Admins have full management
DROP POLICY IF EXISTS "Admins manage treasure adventures" ON public.treasure_adventures;
CREATE POLICY "Admins manage treasure adventures"
ON public.treasure_adventures
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Students can view only published adventures
DROP POLICY IF EXISTS "Students view published adventures" ON public.treasure_adventures;
CREATE POLICY "Students view published adventures"
ON public.treasure_adventures
FOR SELECT
USING (status = 'published');

-- 12.3 treasure_adventure_versions
-- Admins have full management
DROP POLICY IF EXISTS "Admins manage adventure versions" ON public.treasure_adventure_versions;
CREATE POLICY "Admins manage adventure versions"
ON public.treasure_adventure_versions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Students can read versions that are not drafts
DROP POLICY IF EXISTS "Students view published versions" ON public.treasure_adventure_versions;
CREATE POLICY "Students view published versions"
ON public.treasure_adventure_versions
FOR SELECT
USING (is_draft = false);

-- 12.4 treasure_adventure_version_challenges
-- Admins have full access
DROP POLICY IF EXISTS "Admins manage version challenges" ON public.treasure_adventure_version_challenges;
CREATE POLICY "Admins manage version challenges"
ON public.treasure_adventure_version_challenges
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Note on students: Students NEVER directly SELECT treasure_adventure_version_challenges
-- to prevent any exposure of solution_payload. Challenge content is served strictly
-- via SECURITY DEFINER RPCs that return only student-safe payloads.

-- 12.5 treasure_active_sessions
-- Admins can read sessions for analytics
DROP POLICY IF EXISTS "Admins view all sessions" ON public.treasure_active_sessions;
CREATE POLICY "Admins view all sessions"
ON public.treasure_active_sessions
FOR SELECT
USING (public.is_admin());

-- Students can ONLY READ their own sessions.
-- NO direct INSERT, UPDATE, or DELETE is granted to students!
-- All session state mutations are strictly performed via SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Students view own sessions" ON public.treasure_active_sessions;
CREATE POLICY "Students view own sessions"
ON public.treasure_active_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- 12.6 treasure_step_requests
-- Admins can inspect idempotency logs
DROP POLICY IF EXISTS "Admins view step requests" ON public.treasure_step_requests;
CREATE POLICY "Admins view step requests"
ON public.treasure_step_requests
FOR SELECT
USING (public.is_admin());

-- Students cannot directly query or mutate the idempotency ledger.
-- Managed strictly via SECURITY DEFINER RPCs.
