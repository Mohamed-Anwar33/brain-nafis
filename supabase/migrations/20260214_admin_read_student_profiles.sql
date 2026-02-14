-- Allow admins to view all student profiles
-- This is needed so AdminResults can show student names for game attempts

-- Drop if exists to make this migration idempotent
DROP POLICY IF EXISTS "Admins can view all student profiles" ON public.student_profiles;

CREATE POLICY "Admins can view all student profiles"
    ON public.student_profiles FOR SELECT
    USING (public.is_admin());
