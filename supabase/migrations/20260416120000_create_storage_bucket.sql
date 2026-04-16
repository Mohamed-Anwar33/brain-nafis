-- Migration: Create game-images storage bucket for question images
-- This bucket stores images for both Nafis and Central Exam questions
-- NOTE: Storage buckets must be created with service_role key or through Dashboard
-- This migration creates the bucket if it doesn't exist

-- Create the bucket (requires supabase_storage_admin or service_role)
-- Note: This may fail if run with anon/key role - use Dashboard or CLI instead
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
    'game-images',
    'game-images',
    true,
    false,
    5242880, -- 5MB limit
    array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- NOTE: RLS policies must be configured manually through Dashboard:
-- 1. Go to Storage -> Policies
-- 2. For bucket 'game-images', add these policies:
--
-- INSERT policy: bucket_id = 'game-images'
-- SELECT policy (authenticated): bucket_id = 'game-images'  
-- SELECT policy (anon): bucket_id = 'game-images'
-- UPDATE policy: bucket_id = 'game-images'
-- DELETE policy: bucket_id = 'game-images'
