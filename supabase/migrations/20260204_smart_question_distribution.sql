-- Smart Question Distribution System
-- Ensures students don't see repeated questions until they've seen all available questions

-- Create history table
CREATE TABLE IF NOT EXISTS student_question_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- No FK to avoid migration/permission issues
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL CHECK (game_type IN ('exam', 'speed', 'matching', 'ordering')),
    seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id, game_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_question_history_user_game 
ON student_question_history(user_id, game_type);

CREATE INDEX IF NOT EXISTS idx_student_question_history_seen_at 
ON student_question_history(seen_at DESC);

-- Enable RLS
ALTER TABLE student_question_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own question history" ON student_question_history;
CREATE POLICY "Users can read own question history"
ON student_question_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own question history" ON student_question_history;
CREATE POLICY "Users can insert own question history"
ON student_question_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own question history" ON student_question_history;
CREATE POLICY "Users can delete own question history"
ON student_question_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE student_question_history IS 'Tracks which questions each student has seen to prevent repetition until entire bank is consumed';
COMMENT ON COLUMN student_question_history.game_type IS 'Type of game/exam: exam, speed, matching, or ordering';
