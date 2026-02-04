-- Add title image support for Ordering Game
ALTER TABLE ordering_game_questions
ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
