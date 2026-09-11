-- ===================================================================
-- Migration: Add domain_id to questions for Nafis Quick Quiz Categories
-- Zero-data-loss safe migration: domain_id is nullable, all existing 300+ questions remain untouched
-- ===================================================================

-- 1. Add domain_id column referencing central_domains table
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES public.central_domains(id) ON DELETE SET NULL;

-- 2. Create index for fast query filtering by domain_id
CREATE INDEX IF NOT EXISTS idx_questions_domain_id ON public.questions(domain_id);
CREATE INDEX IF NOT EXISTS idx_questions_track_domain_active ON public.questions(track_type, domain_id, active);
