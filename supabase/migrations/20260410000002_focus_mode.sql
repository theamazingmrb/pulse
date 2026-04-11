-- Add focus_mode column to tasks
-- Focus Modes: deep, quick, planning, admin

ALTER TABLE tasks ADD COLUMN focus_mode TEXT
  CHECK (focus_mode IN ('deep', 'quick', 'planning', 'admin'));

-- Default to NULL (optional field)
-- Create index for filtering by focus mode
CREATE INDEX idx_tasks_focus_mode ON tasks(focus_mode) WHERE focus_mode IS NOT NULL;

-- Add comment describing the focus modes
COMMENT ON COLUMN tasks.focus_mode IS 'Task categorization by focus type: deep (full creative attention), quick (under 15 min), planning (organizing/strategizing), admin (logistical/repetitive)';