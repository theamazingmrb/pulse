-- ─────────────────────────────────────────
-- Boundaries — Things to say no to
-- ─────────────────────────────────────────

-- Boundaries table for storing user's "no" list
create table if not exists boundaries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  boundary_text text not null,
  boundary_order int not null default 0,
  description text
);

-- Enable RLS
alter table boundaries enable row level security;

-- RLS Policies
create policy "Users can view own boundaries" on boundaries
  for select using (auth.uid() = user_id);

create policy "Users can insert own boundaries" on boundaries
  for insert with check (auth.uid() = user_id);

create policy "Users can update own boundaries" on boundaries
  for update using (auth.uid() = user_id);

create policy "Users can delete own boundaries" on boundaries
  for delete using (auth.uid() = user_id);

-- Index for user lookups
create index if not exists idx_boundaries_user_id on boundaries(user_id);
create index if not exists idx_boundaries_user_order on boundaries(user_id, boundary_order);

-- Trigger for updated_at
create trigger update_boundaries_updated_at
  before update on boundaries
  for each row execute function update_updated_at_column();