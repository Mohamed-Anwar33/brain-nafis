-- Add image support to matching_game_questions table
ALTER TABLE public.matching_game_questions 
ADD COLUMN IF NOT EXISTS right_image_url TEXT;

-- Create storage bucket for question images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for question images
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow public read access to question images" ON storage.objects;
CREATE POLICY "Allow public read access to question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Allow authenticated users to upload question images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete question images" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');
