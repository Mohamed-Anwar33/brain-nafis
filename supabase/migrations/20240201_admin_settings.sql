-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything (Check by email)
-- Adjust 'admin@testwise.com' to match your actual admin email if different
CREATE POLICY "Admins can manage settings" ON app_settings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@testwise.com' )
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@testwise.com');

-- Policy: Service role can read (for Edge Functions)
CREATE POLICY "Service role can read settings" ON app_settings
  FOR SELECT
  TO service_role
  USING (true);

-- Insert default if not exists
INSERT INTO app_settings (key, value)
VALUES ('admin_email', '')
ON CONFLICT (key) DO NOTHING;
