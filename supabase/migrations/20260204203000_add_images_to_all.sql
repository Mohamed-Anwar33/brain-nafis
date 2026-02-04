-- Add image support for Ordering Game
ALTER TABLE ordering_game_questions
ADD COLUMN IF NOT EXISTS item_images text[] DEFAULT NULL;

-- Add image support for Speed Challenge
ALTER TABLE speed_challenge_questions
ADD COLUMN IF NOT EXISTS question_image_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS choice1_image_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS choice2_image_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS choice3_image_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS choice4_image_url text DEFAULT NULL;

-- Add image support for Standard Exam
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

ALTER TABLE choices
ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Create bucket for question images if it doesn't exist (this is idempotent usually handled via UI but good to document)
-- Note: You might need to set up storage policies manually or via dashboard if not already done for 'question-images' bucket.
