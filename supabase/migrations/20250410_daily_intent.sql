-- ─────────────────────────────────────────
-- Daily Intent - Morning focus declaration
-- ─────────────────────────────────────────

-- Add daily_intent and say_no_to columns to checkins table
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS daily_intent TEXT;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS say_no_to TEXT;

-- Add comment
COMMENT ON COLUMN checkins.daily_intent IS 'The one thing the user is committing to today';
COMMENT ON COLUMN checkins.say_no_to IS 'What the user is saying NO to today to protect their focus';