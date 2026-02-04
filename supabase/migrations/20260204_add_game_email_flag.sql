-- Add teacher_email_sent flag to game_attempts table
ALTER TABLE public.game_attempts 
ADD COLUMN IF NOT EXISTS teacher_email_sent BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_attempts_email_sent 
ON public.game_attempts(teacher_email_sent);
