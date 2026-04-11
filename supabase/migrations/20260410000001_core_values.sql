-- ─────────────────────────────────────────
-- Core Values (What Matters Most)
-- 2-5 values that guide user's decisions
-- ─────────────────────────────────────────

create table if not exists core_values (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  value_text  text not null,
  value_order int default 0,
  
  constraint unique_user_value unique(user_id, value_text)
);

-- Enable RLS
alter table core_values enable row level security;

-- RLS Policies
create policy "Users can view own core values" on core_values
  for select using (auth.uid() = user_id);

create policy "Users can insert own core values" on core_values
  for insert with check (auth.uid() = user_id);

create policy "Users can update own core values" on core_values
  for update using (auth.uid() = user_id);

create policy "Users can delete own core values" on core_values
  for delete using (auth.uid() = user_id);

-- Index for efficient queries
create index if not exists idx_core_values_user_id on core_values(user_id);
create index if not exists idx_core_values_user_order on core_values(user_id, value_order);

-- Trigger for updated_at
create trigger update_core_values_updated_at
  before update on core_values
  for each row execute function update_updated_at_column();