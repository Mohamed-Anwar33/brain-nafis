-- ==========================================
-- COMPLETE DATABASE SETUP - Run All at Once
-- ==========================================
-- Created: 2026-04-12
-- Description: Central Exam System + Wheel Game + Image Support

-- ==========================================
-- SECTION 1: CENTRAL EXAM SYSTEM
-- ==========================================

-- 1.1 Create central exam configs table
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

-- Seed initial config
INSERT INTO central_exam_configs (title, description, is_active)
SELECT 'الاختبار المركزي الشامل', 'تحدي استثنائي لتقييم مستواك الحقيقي بتجربة تفاعلية وبصرية مذهلة', false
WHERE NOT EXISTS (SELECT 1 FROM central_exam_configs);

-- 1.2 Create central exam questions table
CREATE TABLE IF NOT EXISTS central_exam_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    text text NOT NULL,
    image_url text,
    active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 1.3 Create central exam choices table
CREATE TABLE IF NOT EXISTS central_exam_choices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id uuid NOT NULL REFERENCES central_exam_questions(id) ON DELETE CASCADE,
    text text NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- 1.4 Enable RLS on central exam tables
ALTER TABLE central_exam_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_exam_choices ENABLE ROW LEVEL SECURITY;

-- 1.5 RLS Policies for central exam
DROP POLICY IF EXISTS "Allow public read access on central_exam_configs" ON central_exam_configs;
CREATE POLICY "Allow public read access on central_exam_configs"
    ON central_exam_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin to manage central_exam_configs" ON central_exam_configs;
CREATE POLICY "Allow admin to manage central_exam_configs"
    ON central_exam_configs FOR ALL
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Allow public read access on central_exam_questions" ON central_exam_questions;
CREATE POLICY "Allow public read access on central_exam_questions"
    ON central_exam_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin to manage central_exam_questions" ON central_exam_questions;
CREATE POLICY "Allow admin to manage central_exam_questions"
    ON central_exam_questions FOR ALL
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Allow public read access on central_exam_choices" ON central_exam_choices;
CREATE POLICY "Allow public read access on central_exam_choices"
    ON central_exam_choices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin to manage central_exam_choices" ON central_exam_choices;
CREATE POLICY "Allow admin to manage central_exam_choices"
    ON central_exam_choices FOR ALL
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ==========================================
-- SECTION 2: WHEEL GAME SECTIONS SYSTEM
-- ==========================================

-- 2.1 Wheel Sections Table
CREATE TABLE IF NOT EXISTS wheel_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    color text NOT NULL,
    icon text DEFAULT '🎯',
    image_url text,
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2.2 Wheel Questions Table
CREATE TABLE IF NOT EXISTS wheel_section_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id uuid REFERENCES wheel_sections(id) ON DELETE CASCADE,
    text text NOT NULL,
    image_url text,
    choices jsonb NOT NULL DEFAULT '[]',
    points integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2.3 Enable RLS on wheel tables
ALTER TABLE wheel_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_section_questions ENABLE ROW LEVEL SECURITY;

-- 2.4 RLS Policies for wheel
DROP POLICY IF EXISTS "Public read active wheel sections" ON wheel_sections;
CREATE POLICY "Public read active wheel sections"
    ON wheel_sections FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active wheel questions" ON wheel_section_questions;
CREATE POLICY "Public read active wheel questions"
    ON wheel_section_questions FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin manage wheel sections" ON wheel_sections;
CREATE POLICY "Admin manage wheel sections"
    ON wheel_sections FOR ALL
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin manage wheel questions" ON wheel_section_questions;
CREATE POLICY "Admin manage wheel questions"
    ON wheel_section_questions FOR ALL
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ==========================================
-- SECTION 3: SAMPLE DATA (Science Focused)
-- ==========================================

-- 3.1 Insert Science-Focused Wheel Sections
INSERT INTO wheel_sections (name, color, icon, order_index, is_active) VALUES
('الأحياء', '#10b981', '🧬', 1, true),
('الكيمياء', '#f59e0b', '⚗️', 2, true),
('الفيزياء', '#3b82f6', '⚡', 3, true),
('العلوم العامة', '#8b5cf6', '🔬', 4, true),
('الأرض والفضاء', '#06b6d4', '🌍', 5, true),
('البيئة', '#84cc16', '🌱', 6, true)
ON CONFLICT DO NOTHING;

-- 3.2 Sample Questions for Biology (الأحياء)
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هي وحدة بناء الكائنات الحية؟',
    '[{"id":"1","text":"الخلية","is_correct":true},{"id":"2","text":"الأنسجة","is_correct":false},{"id":"3","text":"الأعضاء","is_correct":false},{"id":"4","text":"الجهاز","is_correct":false}]'::jsonb, 10, true
FROM wheel_sections ws WHERE ws.name = 'الأحياء'
ON CONFLICT DO NOTHING;

INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'كم عدد الكروموسومات في الخلية البشرية؟',
    '[{"id":"1","text":"46","is_correct":true},{"id":"2","text":"23","is_correct":false},{"id":"3","text":"48","is_correct":false},{"id":"4","text":"22","is_correct":false}]'::jsonb, 15, true
FROM wheel_sections ws WHERE ws.name = 'الأحياء'
ON CONFLICT DO NOTHING;

-- 3.3 Sample Questions for Chemistry (الكيمياء)
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هو رمز الذهب في الجدول الدوري؟',
    '[{"id":"1","text":"Au","is_correct":true},{"id":"2","text":"Ag","is_correct":false},{"id":"3","text":"Fe","is_correct":false},{"id":"4","text":"Cu","is_correct":false}]'::jsonb, 10, true
FROM wheel_sections ws WHERE ws.name = 'الكيمياء'
ON CONFLICT DO NOTHING;

INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هو العنصر الأكثر وفرة في الكون؟',
    '[{"id":"1","text":"الهيدروجين","is_correct":true},{"id":"2","text":"الأكسجين","is_correct":false},{"id":"3","text":"الكربون","is_correct":false},{"id":"4","text":"النيتروجين","is_correct":false}]'::jsonb, 15, true
FROM wheel_sections ws WHERE ws.name = 'الكيمياء'
ON CONFLICT DO NOTHING;

-- 3.4 Sample Questions for Physics (الفيزياء)
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هي سرعة الضوء؟',
    '[{"id":"1","text":"300,000 كم/ث","is_correct":true},{"id":"2","text":"150,000 كم/ث","is_correct":false},{"id":"3","text":"500,000 كم/ث","is_correct":false},{"id":"4","text":"1,000,000 كم/ث","is_correct":false}]'::jsonb, 10, true
FROM wheel_sections ws WHERE ws.name = 'الفيزياء'
ON CONFLICT DO NOTHING;

INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'من اكتشف قانون الجاذبية؟',
    '[{"id":"1","text":"نيوتن","is_correct":true},{"id":"2","text":"أينشتاين","is_correct":false},{"id":"3","text":"جاليليو","is_correct":false},{"id":"4","text":"تسلا","is_correct":false}]'::jsonb, 15, true
FROM wheel_sections ws WHERE ws.name = 'الفيزياء'
ON CONFLICT DO NOTHING;

-- 3.5 Sample Questions for General Science (العلوم العامة)
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هو أكبر كوكب في المجموعة الشمسية؟',
    '[{"id":"1","text":"المشتري","is_correct":true},{"id":"2","text":"الزهرة","is_correct":false},{"id":"3","text":"الأرض","is_correct":false},{"id":"4","text":"المريخ","is_correct":false}]'::jsonb, 10, true
FROM wheel_sections ws WHERE ws.name = 'العلوم العامة'
ON CONFLICT DO NOTHING;

INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'كم عدد كواكب المجموعة الشمسية؟',
    '[{"id":"1","text":"8","is_correct":true},{"id":"2","text":"9","is_correct":false},{"id":"3","text":"7","is_correct":false},{"id":"4","text":"10","is_correct":false}]'::jsonb, 15, true
FROM wheel_sections ws WHERE ws.name = 'العلوم العامة'
ON CONFLICT DO NOTHING;

-- 3.6 Sample Questions for Earth & Space (الأرض والفضاء)
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هي الطبقة التي تحمي الأرض من الأشعة فوق البنفسجية؟',
    '[{"id":"1","text":"طبقة الأوزون","is_correct":true},{"id":"2","text":"الطبقة الجوية","is_correct":false},{"id":"3","text":"الستراتوسفير","is_correct":false},{"id":"4","text":"التروبوسفير","is_correct":false}]'::jsonb, 10, true
FROM wheel_sections ws WHERE ws.name = 'الأرض والفضاء'
ON CONFLICT DO NOTHING;

-- 3.7 Sample Questions for Environment (البيئة)
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT ws.id, 'ما هي عملية تحويل ثاني أكسيد الكربون إلى أوكسجين؟',
    '[{"id":"1","text":"البناء الضوئي","is_correct":true},{"id":"2","text":"التمثيل الغذائي","is_correct":false},{"id":"3","text":"النتح","is_correct":false},{"id":"4","text":"التحلل","is_correct":false}]'::jsonb, 10, true
FROM wheel_sections ws WHERE ws.name = 'البيئة'
ON CONFLICT DO NOTHING;

-- 3.8 Sample Central Exam Questions
INSERT INTO central_exam_questions (text, active, order_index) VALUES
('ما هي وحدة قياس القوة في النظام الدولي؟', true, 1),
('كم عدد العضلات في جسم الإنسان تقريباً؟', true, 2),
('ما هو أصغر كوكب في المجموعة الشمسية؟', true, 3)
ON CONFLICT DO NOTHING;

-- Add choices for central exam questions
-- Question 1: Newton
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'نيوتن', true FROM central_exam_questions ceq WHERE ceq.text = 'ما هي وحدة قياس القوة في النظام الدولي؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'باسكال', false FROM central_exam_questions ceq WHERE ceq.text = 'ما هي وحدة قياس القوة في النظام الدولي؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'جول', false FROM central_exam_questions ceq WHERE ceq.text = 'ما هي وحدة قياس القوة في النظام الدولي؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'واط', false FROM central_exam_questions ceq WHERE ceq.text = 'ما هي وحدة قياس القوة في النظام الدولي؟';

-- Question 2: 600
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, '600', true FROM central_exam_questions ceq WHERE ceq.text = 'كم عدد العضلات في جسم الإنسان تقريباً؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, '300', false FROM central_exam_questions ceq WHERE ceq.text = 'كم عدد العضلات في جسم الإنسان تقريباً؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, '1000', false FROM central_exam_questions ceq WHERE ceq.text = 'كم عدد العضلات في جسم الإنسان تقريباً؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, '200', false FROM central_exam_questions ceq WHERE ceq.text = 'كم عدد العضلات في جسم الإنسان تقريباً؟';

-- Question 3: عطارد
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'عطارد', true FROM central_exam_questions ceq WHERE ceq.text = 'ما هو أصغر كوكب في المجموعة الشمسية؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'الأرض', false FROM central_exam_questions ceq WHERE ceq.text = 'ما هو أصغر كوكب في المجموعة الشمسية؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'المريخ', false FROM central_exam_questions ceq WHERE ceq.text = 'ما هو أصغر كوكب في المجموعة الشمسية؟';
INSERT INTO central_exam_choices (question_id, text, is_correct)
SELECT ceq.id, 'الزهرة', false FROM central_exam_questions ceq WHERE ceq.text = 'ما هو أصغر كوكب في المجموعة الشمسية؟';

-- ==========================================
-- SECTION 4: ADDITIONAL UPDATES
-- ==========================================

-- 4.1 Add metadata column to game_attempts if not exists
-- Only run if game_attempts table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_attempts') THEN
        -- Add metadata column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'game_attempts' AND column_name = 'metadata') THEN
            ALTER TABLE game_attempts ADD COLUMN metadata jsonb DEFAULT '{}';
        END IF;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_game_attempts_game_type ON game_attempts(game_type);
        CREATE INDEX IF NOT EXISTS idx_game_attempts_user_id ON game_attempts(user_id);
        CREATE INDEX IF NOT EXISTS idx_game_attempts_created_at ON game_attempts(created_at);
        
        -- Create metadata GIN index
        CREATE INDEX IF NOT EXISTS idx_game_attempts_metadata ON game_attempts USING GIN (metadata);
    END IF;
END $$;

-- 4.2 Expand allowed game_attempts types to match the live app
DO $$
DECLARE
    existing_values text[];
    constraint_name text;
    allowed_values text[];
    constraint_sql text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_attempts') THEN
        SELECT con.conname
        INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'game_attempts'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%game_type%';

        IF constraint_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE game_attempts DROP CONSTRAINT %I', constraint_name);
        END IF;

        SELECT COALESCE(array_agg(DISTINCT game_type), ARRAY[]::text[])
        INTO existing_values
        FROM game_attempts;

        SELECT ARRAY(
            SELECT DISTINCT value
            FROM unnest(
                existing_values
                || ARRAY[
                    'quick_quiz',
                    'exam',
                    'matching',
                    'ordering',
                    'speed',
                    'stages',
                    'wheel_science',
                    'central_exam'
                ]
            ) AS value
        )
        INTO allowed_values;

        constraint_sql := 'ALTER TABLE game_attempts ADD CONSTRAINT game_attempts_game_type_check CHECK (game_type IN ('
            || array_to_string(
                ARRAY(SELECT quote_literal(value) FROM unnest(allowed_values) AS value),
                ', '
            )
            || '))';

        EXECUTE constraint_sql;
    END IF;
END $$;

-- ==========================================
-- DONE! All tables, policies, and sample data created.
-- ==========================================
