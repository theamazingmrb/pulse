-- ─────────────────────────────────────────
-- Google Calendar Accounts (multi-account)
-- One row per connected Google account, so a user can aggregate
-- events from several calendars (like Notion's aggregated view).
-- ─────────────────────────────────────────

create table if not exists google_calendar_accounts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  google_email    text not null,
  refresh_token   text not null,
  connected_at    timestamptz default now(),
  is_primary      boolean default false
);

-- Index for quick lookup by user
create index if not exists idx_gcal_accounts_user on google_calendar_accounts(user_id);

-- Enable RLS
alter table google_calendar_accounts enable row level security;

-- RLS Policies
create policy "Users can view own google calendar accounts" on google_calendar_accounts
  for select using (auth.uid() = user_id);

create policy "Users can insert own google calendar accounts" on google_calendar_accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own google calendar accounts" on google_calendar_accounts
  for update using (auth.uid() = user_id);

create policy "Users can delete own google calendar accounts" on google_calendar_accounts
  for delete using (auth.uid() = user_id);
