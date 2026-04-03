-- ─────────────────────────────────────────
-- Focus Sessions — Pomodoro-style focus tracking
-- ─────────────────────────────────────────

create table if not exists focus_sessions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  task_id       uuid references tasks(id) on delete set null,
  duration      int not null, -- planned duration in minutes
  started_at    timestamptz not null,
  completed_at  timestamptz,
  status        text default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  -- Spotify integration
  spotify_playlist_id    text,
  spotify_playlist_name   text,
  spotify_track_id        text,
  spotify_track_name      text,
  spotify_artist          text,
  -- Journal link
  journal_id    uuid references journals(id) on delete set null,
  notes         text -- optional reflection after session
);

alter table focus_sessions enable row level security;

-- RLS Policies
create policy "Users can view own focus sessions" on focus_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own focus sessions" on focus_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own focus sessions" on focus_sessions
  for update using (auth.uid() = user_id);

create policy "Users can delete own focus sessions" on focus_sessions
  for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_focus_sessions_user_id on focus_sessions(user_id);
create index if not exists idx_focus_sessions_task_id on focus_sessions(task_id);
create index if not exists idx_focus_sessions_started_at on focus_sessions(started_at);
create index if not exists idx_focus_sessions_status on focus_sessions(status);

-- Trigger for updated_at
create trigger update_focus_sessions_updated_at
  before update on focus_sessions
  for each row execute function update_updated_at_column();

-- View for focus time analytics
create or replace view focus_time_by_task as
select
  task_id,
  user_id,
  count(*) as session_count,
  sum(
    case
      when status = 'completed' then duration
      else 0
    end
  ) as total_focus_minutes,
  avg(
    case
      when status = 'completed' then duration
      else null
    end
  ) as avg_session_length
from focus_sessions
where task_id is not null
group by task_id, user_id;

-- View for daily focus summary
create or replace view daily_focus_summary as
select
  user_id,
  date(started_at) as focus_date,
  count(*) as total_sessions,
  sum(
    case
      when status = 'completed' then duration
      else 0
    end
  ) as total_focus_minutes
from focus_sessions
group by user_id, date(started_at);