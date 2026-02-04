-- Emergency migration: Ensure image columns exist in speed_challenge_questions
-- This uses IF NOT EXISTS so it's safe to run multiple times

ALTER TABLE speed_challenge_questions
ADD COLUMN IF NOT EXISTS question_image_url text DEFAULT NULL;

ALTER TABLE speed_challenge_questions
ADD COLUMN IF NOT EXISTS choice1_image_url text DEFAULT NULL;

ALTER TABLE speed_challenge_questions
ADD COLUMN IF NOT EXISTS choice2_image_url text DEFAULT NULL;

ALTER TABLE speed_challenge_questions
ADD COLUMN IF NOT EXISTS choice3_image_url text DEFAULT NULL;

ALTER TABLE speed_challenge_questions
ADD COLUMN IF NOT EXISTS choice4_image_url text DEFAULT NULL;
