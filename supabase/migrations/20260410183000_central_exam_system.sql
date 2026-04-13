-- ==========================================
-- Central Exam System Migration
-- ==========================================

-- 1. Create central exam configs table
CREATE TABLE IF NOT EXISTS central_exam_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL DEFAULT 'الاختبار المركزي الشامل',
    description text DEFAULT 'تحدي استثنائي لتقييم مستواك الحقيقي بتجربة تفاعلية وبصرية مذهلة',
    grade text NOT NULL DEFAULT 'ثالث متوسط',
    subject text NOT NULL DEFAULT 'العلوم',
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed initial config if not exists
INSERT INTO central_exam_configs (title, description, is_active)
SELECT 'الاختبار المركزي الشامل', 'تحدي استثنائي لتقييم مستواك الحقيقي بتجربة تفاعلية وبصرية مذهلة', false
WHERE NOT EXISTS (SELECT 1 FROM central_exam_configs);

-- 2. Create central exam questions table
CREATE TABLE IF NOT EXISTS central_exam_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    text text NOT NULL,
    image_url text,
    active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create central exam choices table
CREATE TABLE IF NOT EXISTS central_exam_choices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id uuid NOT NULL REFERENCES central_exam_questions(id) ON DELETE CASCADE,
    text text NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- Security (RLS)
-- ==========================================

ALTER TABLE central_exam_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_exam_choices ENABLE ROW LEVEL SECURITY;

-- Configs Policies
CREATE POLICY "Allow public read access on central_exam_configs"
    ON central_exam_configs FOR SELECT
    USING (true);

CREATE POLICY "Allow admin to manage central_exam_configs"
    ON central_exam_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Questions Policies
CREATE POLICY "Allow public read access on central_exam_questions"
    ON central_exam_questions FOR SELECT
    USING (true);

CREATE POLICY "Allow admin to manage central_exam_questions"
    ON central_exam_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Choices Policies
CREATE POLICY "Allow public read access on central_exam_choices"
    ON central_exam_choices FOR SELECT
    USING (true);

CREATE POLICY "Allow admin to manage central_exam_choices"
    ON central_exam_choices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
