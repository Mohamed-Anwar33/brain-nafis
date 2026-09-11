-- ==============================================================================
-- FIX: Missing response_payload in treasure_step_requests
-- Migration: 20260911213000_fix_treasure_step_requests_response_payload.sql
-- ==============================================================================

-- 1. Add missing response_payload column
ALTER TABLE public.treasure_step_requests 
ADD COLUMN IF NOT EXISTS response_payload JSONB;

-- 2. Add answer_payload column if not exists
ALTER TABLE public.treasure_step_requests 
ADD COLUMN IF NOT EXISTS answer_payload JSONB;

-- 3. Make result_payload nullable and set default empty JSON
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'treasure_step_requests' 
          AND column_name = 'result_payload'
    ) THEN
        ALTER TABLE public.treasure_step_requests ALTER COLUMN result_payload DROP NOT NULL;
        ALTER TABLE public.treasure_step_requests ALTER COLUMN result_payload SET DEFAULT '{}'::jsonb;

        -- Synchronize any existing rows
        UPDATE public.treasure_step_requests 
        SET response_payload = result_payload 
        WHERE response_payload IS NULL AND result_payload IS NOT NULL;
    END IF;
END $$;

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
