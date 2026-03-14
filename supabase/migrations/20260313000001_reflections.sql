-- ─────────────────────────────────────────
-- Reflections — Daily / Weekly / Monthly
-- ─────────────────────────────────────────

-- One reflection per user per type per period
create table if not exists reflections (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  type         text not null check (type in ('daily', 'weekly', 'monthly')),
  period_start date not null,
  -- daily   = that calendar day
  -- weekly  = Monday of that ISO week
  -- monthly = 1st of that month
  title        text,
  sections     jsonb not null default '{}',
  -- daily keys:   accomplishments, gratitude, improvements, tomorrow
  -- weekly keys:  wins, blockers, warmap_progress, next_week
  -- monthly keys: vision, improve, not_giving_all, top_goals, overall
  mood         text,
  energy_level integer check (energy_level between 1 and 5)
);

create unique index if not exists reflections_user_period_type
  on reflections (user_id, type, period_start);

alter table reflections enable row level security;

create policy "Users can view own reflections" on reflections
  for select using (auth.uid() = user_id);
create policy "Users can insert own reflections" on reflections
  for insert with check (auth.uid() = user_id);
create policy "Users can update own reflections" on reflections
  for update using (auth.uid() = user_id);
create policy "Users can delete own reflections" on reflections
  for delete using (auth.uid() = user_id);

-- Streak tracking: one row per user per type
create table if not exists reflection_streaks (
  user_id               uuid references auth.users(id) on delete cascade not null,
  type                  text not null check (type in ('daily', 'weekly', 'monthly')),
  current_streak        integer default 0,
  longest_streak        integer default 0,
  last_completed_period date,
  primary key (user_id, type)
);

alter table reflection_streaks enable row level security;

create policy "Users can view own streaks" on reflection_streaks
  for select using (auth.uid() = user_id);
create policy "Users can insert own streaks" on reflection_streaks
  for insert with check (auth.uid() = user_id);
create policy "Users can update own streaks" on reflection_streaks
  for update using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_reflections_user_id on reflections(user_id);
create index if not exists idx_reflections_type on reflections(type);
create index if not exists idx_reflections_period_start on reflections(period_start desc);

-- updated_at trigger (update_updated_at_column function already exists from initial schema)
create trigger update_reflections_updated_at
  before update on reflections
  for each row execute function update_updated_at_column();
