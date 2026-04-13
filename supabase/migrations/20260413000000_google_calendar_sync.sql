-- Store Google Calendar connection in profiles (cross-device sync)
ALTER TABLE profiles 
ADD COLUMN google_refresh_token TEXT,
ADD COLUMN google_connected_at TIMESTAMPTZ,
ADD COLUMN google_email TEXT;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected ON profiles(google_connected_at) WHERE google_connected_at IS NOT NULL;