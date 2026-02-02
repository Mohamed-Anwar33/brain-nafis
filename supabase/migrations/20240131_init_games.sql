-- Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    stage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.student_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.student_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.student_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Matching Game Questions
CREATE TABLE IF NOT EXISTS public.matching_game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    left_text TEXT NOT NULL,
    right_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ordering Game Questions
CREATE TABLE IF NOT EXISTS public.ordering_game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    title TEXT,
    items JSONB NOT NULL, -- Array of items to order
    drop_labels JSONB,    -- Optional labels for drop zones
    correct_order JSONB NOT NULL, -- Array of indices or values representing correct order
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Speed Challenge Questions
CREATE TABLE IF NOT EXISTS public.speed_challenge_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    question_text TEXT NOT NULL,
    choice1 TEXT NOT NULL,
    choice2 TEXT NOT NULL,
    choice3 TEXT NOT NULL,
    choice4 TEXT NOT NULL,
    correct_choice_index INTEGER NOT NULL CHECK (correct_choice_index BETWEEN 1 AND 4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Game Attempts (Unified table for all game types)
CREATE TABLE IF NOT EXISTS public.game_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    game_type TEXT NOT NULL CHECK (game_type IN ('quick_quiz', 'matching', 'ordering', 'speed')),
    stage TEXT,
    level INTEGER,
    score INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.matching_game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordering_game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for Questions (Public Read if active, Admin All)
-- Assuming 'is_admin' check or specific role. For now, we'll allow authenticated users to read active questions.
CREATE POLICY "Public read active matching questions"
    ON public.matching_game_questions FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public read active ordering questions"
    ON public.ordering_game_questions FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public read active speed questions"
    ON public.speed_challenge_questions FOR SELECT
    USING (is_active = true);

-- Policies for Attempts
CREATE POLICY "Users view own attempts"
    ON public.game_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own attempts"
    ON public.game_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- TODO: Add Admin policies (full access) if an admin role exists or simple "true" for now if handling via dashboard
-- Ideally we check a profiles.role or similar.
-- For now, to allow the admin dashboard to work without complex role setup (as "create_admin.js" suggests a simple logic),
-- we might rely on the fact that allow-all for anon is disabled and we need explicit admin policies if RLS is on.
-- BUT, typically admins are just users with a flag.
-- Let's check if there is an existing 'profiles' or 'users' table with roles.
