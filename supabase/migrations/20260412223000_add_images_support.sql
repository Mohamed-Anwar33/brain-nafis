-- ==========================================
-- Add Image Support for Wheel Game and Central Exam
-- ==========================================

-- 1. Add image_url to wheel_sections
ALTER TABLE wheel_sections 
ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Add image_url to wheel_section_questions
ALTER TABLE wheel_section_questions 
ADD COLUMN IF NOT EXISTS image_url text;

-- 3. Add image_url to central_exam_choices (for choice images)
ALTER TABLE central_exam_choices 
ADD COLUMN IF NOT EXISTS image_url text;

-- 4. Create storage bucket for game images
-- Note: Run this in Supabase SQL Editor or Dashboard
-- Create the bucket (this requires superuser or service role)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('game-images', 'game-images', true) 
-- ON CONFLICT DO NOTHING;

-- 5. Set up storage policies for game-images bucket
-- Allow public read access
-- CREATE POLICY "Public Access" ON storage.objects
-- FOR SELECT USING (bucket_id = 'game-images');

-- Allow authenticated users to upload
-- CREATE POLICY "Authenticated Uploads" ON storage.objects
-- FOR INSERT TO authenticated WITH CHECK (bucket_id = 'game-images');

-- Allow authenticated users to delete their own files
-- CREATE POLICY "Authenticated Deletes" ON storage.objects
-- FOR DELETE TO authenticated USING (bucket_id = 'game-images');

-- 5. Update sample wheel sections to be Science-focused (العلوم فقط)
UPDATE wheel_sections 
SET 
    name = 'الأحياء',
    color = '#10b981',
    icon = '🧬',
    image_url = null
WHERE name = 'علوم';

UPDATE wheel_sections 
SET 
    name = 'الكيمياء',
    color = '#f59e0b',
    icon = '⚗️',
    image_url = null
WHERE name = 'تاريخ';

UPDATE wheel_sections 
SET 
    name = 'الفيزياء',
    color = '#3b82f6',
    icon = '⚡',
    image_url = null
WHERE name = 'رياضيات';

UPDATE wheel_sections 
SET 
    name = 'العلوم العامة',
    color = '#8b5cf6',
    icon = '🔬',
    image_url = null
WHERE name = 'جغرافيا';

-- 6. Insert new science-focused sections
INSERT INTO wheel_sections (name, color, icon, order_index, is_active) VALUES
('الأرض والفضاء', '#06b6d4', '🌍', 5, true),
('البيئة', '#84cc16', '🌱', 6, true)
ON CONFLICT DO NOTHING;

-- 7. Update sample questions to be science-focused
UPDATE wheel_section_questions 
SET text = 'ما هي وحدة بناء الكائنات الحية؟',
    choices = '[{"id":"1","text":"الخلية","is_correct":true},{"id":"2","text":"الأنسجة","is_correct":false},{"id":"3","text":"الأعضاء","is_correct":false},{"id":"4","text":"الجهاز","is_correct":false}]'::jsonb
WHERE text = 'ما هو العنصر الكيميائي الذي رمزه O؟';

UPDATE wheel_section_questions 
SET text = 'كم عدد الكروموسومات في الخلية البشرية؟',
    choices = '[{"id":"1","text":"46","is_correct":true},{"id":"2","text":"23","is_correct":false},{"id":"3","text":"48","is_correct":false},{"id":"4","text":"22","is_correct":false}]'::jsonb
WHERE text = 'كم عدد كواكب المجموعة الشمسية؟';

UPDATE wheel_section_questions 
SET text = 'ما هو رمز الذهب في الجدول الدوري؟',
    choices = '[{"id":"1","text":"Au","is_correct":true},{"id":"2","text":"Ag","is_correct":false},{"id":"3","text":"Fe","is_correct":false},{"id":"4","text":"Cu","is_correct":false}]'::jsonb
WHERE text = 'كم ناتج 5 × 6؟';

UPDATE wheel_section_questions 
SET text = 'ما هي سرعة الضوء؟',
    choices = '[{"id":"1","text":"300,000 كم/ث","is_correct":true},{"id":"2","text":"150,000 كم/ث","is_correct":false},{"id":"3","text":"500,000 كم/ث","is_correct":false},{"id":"4","text":"1,000,000 كم/ث","is_correct":false}]'::jsonb
WHERE text = 'في أي عام تم اكتشاف أمريكا؟';

UPDATE wheel_section_questions 
SET text = 'ما هو أكبر كوكب في المجموعة الشمسية؟',
    choices = '[{"id":"1","text":"المشتري","is_correct":true},{"id":"2","text":"الزهرة","is_correct":false},{"id":"3","text":"الأرض","is_correct":false},{"id":"4","text":"المريخ","is_correct":false}]'::jsonb
WHERE text = 'ما هي عاصمة مصر؟';

