-- Add notification_email column to settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Verify the column was added (optional, just for confirmation)
SELECT * FROM public.settings LIMIT 1;
