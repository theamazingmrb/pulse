-- ─────────────────────────────────────────
-- North Star (Life Vision)
-- A single powerful statement that anchors everything
-- ─────────────────────────────────────────

create table if not exists north_star (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  content     text not null,
  
  constraint unique_user_north_star unique(user_id)
);

-- Enable RLS
alter table north_star enable row level security;

-- RLS Policies
create policy "Users can view own north star" on north_star
  for select using (auth.uid() = user_id);

create policy "Users can insert own north star" on north_star
  for insert with check (auth.uid() = user_id);

create policy "Users can update own north star" on north_star
  for update using (auth.uid() = user_id);

create policy "Users can delete own north star" on north_star
  for delete using (auth.uid() = user_id);

-- Index
create index if not exists idx_north_star_user_id on north_star(user_id);

-- Trigger for updated_at
create trigger update_north_star_updated_at
  before update on north_star
  for each row execute function update_updated_at_column();