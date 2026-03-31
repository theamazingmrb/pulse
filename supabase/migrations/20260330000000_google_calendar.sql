-- Add google_event_id to tasks so we can update (not duplicate) calendar events
alter table tasks add column if not exists google_event_id text;
