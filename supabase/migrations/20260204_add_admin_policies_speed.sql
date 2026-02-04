-- Add admin policies for ALL game question tables
-- This allows authenticated users (admins) to manage questions

-- ========================================
-- SPEED CHALLENGE QUESTIONS
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can insert speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Authenticated users can insert speed questions"
ON public.speed_challenge_questions FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Authenticated users can update speed questions"
ON public.speed_challenge_questions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Authenticated users can delete speed questions"
ON public.speed_challenge_questions FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all speed questions" ON public.speed_challenge_questions;
CREATE POLICY "Authenticated users can view all speed questions"
ON public.speed_challenge_questions FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- MATCHING GAME QUESTIONS
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can insert matching questions" ON public.matching_game_questions;
CREATE POLICY "Authenticated users can insert matching questions"
ON public.matching_game_questions FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update matching questions" ON public.matching_game_questions;
CREATE POLICY "Authenticated users can update matching questions"
ON public.matching_game_questions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete matching questions" ON public.matching_game_questions;
CREATE POLICY "Authenticated users can delete matching questions"
ON public.matching_game_questions FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all matching questions" ON public.matching_game_questions;
CREATE POLICY "Authenticated users can view all matching questions"
ON public.matching_game_questions FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- ORDERING GAME QUESTIONS
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can insert ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Authenticated users can insert ordering questions"
ON public.ordering_game_questions FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Authenticated users can update ordering questions"
ON public.ordering_game_questions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Authenticated users can delete ordering questions"
ON public.ordering_game_questions FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all ordering questions" ON public.ordering_game_questions;
CREATE POLICY "Authenticated users can view all ordering questions"
ON public.ordering_game_questions FOR SELECT
TO authenticated
USING (true);
