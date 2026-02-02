-- Fix app_settings permissions

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to be safe
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Everyone can read app_settings" ON public.app_settings;

-- 4. Add Policy: Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage app_settings"
ON public.app_settings
FOR ALL
USING (public.is_admin());

-- 5. Add Policy: Everyone can read settings (needed for system to function)
CREATE POLICY "Everyone can read app_settings"
ON public.app_settings
FOR SELECT
USING (true);
