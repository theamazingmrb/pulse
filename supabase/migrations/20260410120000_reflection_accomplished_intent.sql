-- ─────────────────────────────────────────
-- Add accomplished_intent to reflections
-- ─────────────────────────────────────────

-- Track whether user accomplished their daily intent
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS accomplished_intent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN reflections.accomplished_intent IS 'Whether the user accomplished their daily intent for this reflection period';