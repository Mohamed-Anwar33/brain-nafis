-- Add protected admin policies for game questions
-- Only users with 'admin' role in user_roles table can modify data
-- All authenticated users can read data (to play the game)

-- Helper to check for admin role
-- (We use a subquery because RLS performance is better than a join in some cases, 
-- and it keeps the policy clean)

-- ========================================
-- SPEED CHALLENGE QUESTIONS
-- ========================================

DROP POLICY IF EXISTS "Admins can insert speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Admins can insert speed questions"
ON public.speed_challenge_questions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Admins can update speed questions"
ON public.speed_challenge_questions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Admins can delete speed questions"
ON public.speed_challenge_questions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow all authenticated users (Student & Admin) to VIEW questions to play
DROP POLICY IF EXISTS "Authenticated users can view all speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Authenticated users can view all speed questions"
ON public.speed_challenge_questions FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- MATCHING GAME QUESTIONS
-- ========================================

DROP POLICY IF EXISTS "Admins can insert matching questions" ON public.matching_game_questions;
CREATE POLICY "Admins can insert matching questions"
ON public.matching_game_questions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update matching questions" ON public.matching_game_questions;
CREATE POLICY "Admins can update matching questions"
ON public.matching_game_questions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete matching questions" ON public.matching_game_questions;
CREATE POLICY "Admins can delete matching questions"
ON public.matching_game_questions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Authenticated users can view all matching questions" ON public.matching_game_questions;
CREATE POLICY "Authenticated users can view all matching questions"
ON public.matching_game_questions FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- ORDERING GAME QUESTIONS
-- ========================================

DROP POLICY IF EXISTS "Admins can insert ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Admins can insert ordering questions"
ON public.ordering_game_questions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Admins can update ordering questions"
ON public.ordering_game_questions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Admins can delete ordering questions"
ON public.ordering_game_questions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Authenticated users can view all ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Authenticated users can view all ordering questions"
ON public.ordering_game_questions FOR SELECT
TO authenticated
USING (true);
