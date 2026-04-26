-- ==========================================
-- Fix: Add 'items' JSONB column to matching_game_questions
-- AND fix wheel_sections 'color' NOT NULL constraint
-- ==========================================

-- ============================
-- PART 1: Matching Game Fix
-- ============================

-- 1. Add 'items' column to matching_game_questions
ALTER TABLE public.matching_game_questions
ADD COLUMN IF NOT EXISTS items jsonb;

-- 2. Migrate existing left_text/right_text rows into items format
UPDATE public.matching_game_questions
SET items = jsonb_build_array(
  jsonb_build_object(
    'left_text', COALESCE(left_text, ''),
    'right_text', COALESCE(right_text, ''),
    'left_image_url', left_image_url,
    'right_image_url', right_image_url
  )
)
WHERE items IS NULL
  AND (left_text IS NOT NULL OR right_text IS NOT NULL);

-- 3. Make stage column nullable (central exam doesn't use it)
ALTER TABLE public.matching_game_questions
ALTER COLUMN stage DROP NOT NULL;

-- 4. Make left_text nullable (we now use items JSONB instead)
ALTER TABLE public.matching_game_questions
ALTER COLUMN left_text DROP NOT NULL;

-- 5. Make right_text nullable (we now use items JSONB instead)
ALTER TABLE public.matching_game_questions
ALTER COLUMN right_text DROP NOT NULL;

-- 6. Make level column have a default
ALTER TABLE public.matching_game_questions
ALTER COLUMN level SET DEFAULT 1;

-- ============================
-- PART 2: Wheel Sections Fix
-- ============================

-- 7. Give 'color' column a default value so inserts without color succeed
ALTER TABLE public.wheel_sections
ALTER COLUMN color SET DEFAULT '#6366f1';

-- 8. Make 'color' nullable since the admin form doesn't provide it
ALTER TABLE public.wheel_sections
ALTER COLUMN color DROP NOT NULL;
