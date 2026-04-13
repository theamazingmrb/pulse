-- ─────────────────────────────────────────
-- Weekly Rhythms — Energy & Focus Preferences
-- ─────────────────────────────────────────

-- Weekly rhythm preferences for each day/time block
create table if not exists weekly_rhythms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  time_block text not null check (time_block in ('morning', 'afternoon', 'evening')),
  energy_level text not null default 'medium' check (energy_level in ('high', 'medium', 'low')),
  focus_mode text not null default 'quick' check (focus_mode in ('deep', 'quick', 'planning', 'admin')),
  notes text,
  unique(user_id, day_of_week, time_block)
);

-- Enable RLS
alter table weekly_rhythms enable row level security;

-- RLS Policies
create policy "Users can view own weekly rhythms" on weekly_rhythms
  for select using (auth.uid() = user_id);

create policy "Users can insert own weekly rhythms" on weekly_rhythms
  for insert with check (auth.uid() = user_id);

create policy "Users can update own weekly rhythms" on weekly_rhythms
  for update using (auth.uid() = user_id);

create policy "Users can delete own weekly rhythms" on weekly_rhythms
  for delete using (auth.uid() = user_id);

-- Index for user lookups
create index if not exists idx_weekly_rhythms_user_id on weekly_rhythms(user_id);
create index if not exists idx_weekly_rhythms_user_day on weekly_rhythms(user_id, day_of_week);

-- Trigger for updated_at
create trigger update_weekly_rhythms_updated_at
  before update on weekly_rhythms
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- Helper function to get rhythm presets
-- ─────────────────────────────────────────
create or replace function get_rhythm_preset(preset_name text)
returns table (
  day_of_week int,
  time_block text,
  energy_level text,
  focus_mode text
) as $$
begin
  if preset_name = 'makers_schedule' then
    return query values
      (0, 'morning', 'high', 'deep'),
      (0, 'afternoon', 'medium', 'admin'),
      (0, 'evening', 'low', 'quick'),
      (1, 'morning', 'high', 'deep'),
      (1, 'afternoon', 'medium', 'admin'),
      (1, 'evening', 'low', 'quick'),
      (2, 'morning', 'high', 'deep'),
      (2, 'afternoon', 'medium', 'admin'),
      (2, 'evening', 'low', 'quick'),
      (3, 'morning', 'high', 'deep'),
      (3, 'afternoon', 'medium', 'admin'),
      (3, 'evening', 'low', 'quick'),
      (4, 'morning', 'high', 'deep'),
      (4, 'afternoon', 'medium', 'admin'),
      (4, 'evening', 'low', 'quick'),
      (5, 'morning', 'medium', 'planning'),
      (5, 'afternoon', 'high', 'deep'),
      (5, 'evening', 'low', 'quick'),
      (6, 'morning', 'low', 'quick'),
      (6, 'afternoon', 'medium', 'quick'),
      (6, 'evening', 'low', 'quick');
  elsif preset_name = 'night_owl' then
    return query values
      (0, 'morning', 'low', 'quick'),
      (0, 'afternoon', 'medium', 'admin'),
      (0, 'evening', 'high', 'deep'),
      (1, 'morning', 'low', 'quick'),
      (1, 'afternoon', 'medium', 'admin'),
      (1, 'evening', 'high', 'deep'),
      (2, 'morning', 'low', 'quick'),
      (2, 'afternoon', 'medium', 'admin'),
      (2, 'evening', 'high', 'deep'),
      (3, 'morning', 'low', 'quick'),
      (3, 'afternoon', 'medium', 'admin'),
      (3, 'evening', 'high', 'deep'),
      (4, 'morning', 'low', 'quick'),
      (4, 'afternoon', 'medium', 'admin'),
      (4, 'evening', 'high', 'deep'),
      (5, 'morning', 'medium', 'planning'),
      (5, 'afternoon', 'high', 'deep'),
      (5, 'evening', 'high', 'deep'),
      (6, 'morning', 'low', 'quick'),
      (6, 'afternoon', 'medium', 'quick'),
      (6, 'evening', 'high', 'deep');
  elsif preset_name = 'balanced' then
    return query values
      (0, 'morning', 'medium', 'planning'),
      (0, 'afternoon', 'medium', 'quick'),
      (0, 'evening', 'low', 'admin'),
      (1, 'morning', 'high', 'deep'),
      (1, 'afternoon', 'medium', 'quick'),
      (1, 'evening', 'low', 'admin'),
      (2, 'morning', 'high', 'deep'),
      (2, 'afternoon', 'medium', 'quick'),
      (2, 'evening', 'low', 'admin'),
      (3, 'morning', 'high', 'deep'),
      (3, 'afternoon', 'medium', 'quick'),
      (3, 'evening', 'low', 'admin'),
      (4, 'morning', 'high', 'deep'),
      (4, 'afternoon', 'medium', 'quick'),
      (4, 'evening', 'low', 'admin'),
      (5, 'morning', 'medium', 'planning'),
      (5, 'afternoon', 'medium', 'quick'),
      (5, 'evening', 'high', 'deep'),
      (6, 'morning', 'low', 'quick'),
      (6, 'afternoon', 'medium', 'quick'),
      (6, 'evening', 'medium', 'quick');
  end if;
  
  return;
end;
$$ language plpgsql;