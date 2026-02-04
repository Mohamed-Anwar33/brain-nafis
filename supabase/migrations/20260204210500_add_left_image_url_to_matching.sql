-- Add left image support for Matching Game
ALTER TABLE matching_game_questions
ADD COLUMN IF NOT EXISTS left_image_url text DEFAULT NULL;
