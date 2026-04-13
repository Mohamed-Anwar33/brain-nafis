-- ==========================================
-- Wheel Game Sections System
-- ==========================================

-- 1. Wheel Sections Table (Categories/Segments)
CREATE TABLE IF NOT EXISTS wheel_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,           -- Section name (e.g., "علوم", "رياضيات")
    color text NOT NULL,          -- Color code for the wheel segment
    icon text DEFAULT '🎯',       -- Emoji icon for the section
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Wheel Questions Table (Questions linked to sections)
CREATE TABLE IF NOT EXISTS wheel_section_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id uuid REFERENCES wheel_sections(id) ON DELETE CASCADE,
    text text NOT NULL,
    choices jsonb NOT NULL DEFAULT '[]',  -- [{"id": "1", "text": "...", "is_correct": true}, ...]
    points integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Security (RLS)
ALTER TABLE wheel_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_section_questions ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read active wheel sections"
    ON wheel_sections FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public read active wheel questions"
    ON wheel_section_questions FOR SELECT
    USING (is_active = true);

-- Admin policies
CREATE POLICY "Admin manage wheel sections"
    ON wheel_sections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin manage wheel questions"
    ON wheel_section_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Sample wheel sections
INSERT INTO wheel_sections (name, color, icon, order_index, is_active) VALUES
('علوم', '#3b82f6', '🔬', 1, true),
('رياضيات', '#8b5cf6', '🔢', 2, true),
('تاريخ', '#f59e0b', '📜', 3, true),
('جغرافيا', '#10b981', '🌍', 4, true)
ON CONFLICT DO NOTHING;

-- 5. Sample questions for each section
-- Science questions
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT 
    ws.id,
    'ما هو العنصر الكيميائي الذي رمزه O؟',
    '[{"id":"1","text":"الأكسجين","is_correct":true},{"id":"2","text":"الذهب","is_correct":false},{"id":"3","text":"الحديد","is_correct":false},{"id":"4","text":"الفضة","is_correct":false}]'::jsonb,
    10,
    true
FROM wheel_sections ws WHERE ws.name = 'علوم'
ON CONFLICT DO NOTHING;

INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT 
    ws.id,
    'كم عدد كواكب المجموعة الشمسية؟',
    '[{"id":"1","text":"8","is_correct":true},{"id":"2","text":"9","is_correct":false},{"id":"3","text":"7","is_correct":false},{"id":"4","text":"10","is_correct":false}]'::jsonb,
    15,
    true
FROM wheel_sections ws WHERE ws.name = 'علوم'
ON CONFLICT DO NOTHING;

-- Math questions
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT 
    ws.id,
    'كم ناتج 5 × 6؟',
    '[{"id":"1","text":"30","is_correct":true},{"id":"2","text":"25","is_correct":false},{"id":"3","text":"35","is_correct":false},{"id":"4","text":"20","is_correct":false}]'::jsonb,
    10,
    true
FROM wheel_sections ws WHERE ws.name = 'رياضيات'
ON CONFLICT DO NOTHING;

-- History questions
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT 
    ws.id,
    'في أي عام تم اكتشاف أمريكا؟',
    '[{"id":"1","text":"1492","is_correct":true},{"id":"2","text":"1500","is_correct":false},{"id":"3","text":"1450","is_correct":false},{"id":"4","text":"1510","is_correct":false}]'::jsonb,
    20,
    true
FROM wheel_sections ws WHERE ws.name = 'تاريخ'
ON CONFLICT DO NOTHING;

-- Geography questions
INSERT INTO wheel_section_questions (section_id, text, choices, points, is_active)
SELECT 
    ws.id,
    'ما هي عاصمة مصر؟',
    '[{"id":"1","text":"القاهرة","is_correct":true},{"id":"2","text":"الإسكندرية","is_correct":false},{"id":"3","text":"الأقصر","is_correct":false},{"id":"4","text":"أسوان","is_correct":false}]'::jsonb,
    10,
    true
FROM wheel_sections ws WHERE ws.name = 'جغرافيا'
ON CONFLICT DO NOTHING;
