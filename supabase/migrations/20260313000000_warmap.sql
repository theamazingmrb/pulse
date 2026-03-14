-- ─────────────────────────────────────────
-- WarMap — Year planning feature
-- ─────────────────────────────────────────

-- Categories (themes/domains for the year)
create table if not exists warmap_categories (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  color       text default '#6366f1',
  icon        text, -- emoji
  sort_order  int default 0
);

alter table warmap_categories enable row level security;

create policy "Users can view own warmap categories" on warmap_categories
  for select using (auth.uid() = user_id);
create policy "Users can insert own warmap categories" on warmap_categories
  for insert with check (auth.uid() = user_id);
create policy "Users can update own warmap categories" on warmap_categories
  for update using (auth.uid() = user_id);
create policy "Users can delete own warmap categories" on warmap_categories
  for delete using (auth.uid() = user_id);

-- Items (specific goals/objectives within a category)
create table if not exists warmap_items (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  category_id uuid references warmap_categories(id) on delete cascade not null,
  title       text not null,
  description text,
  status      text default 'active' check (status in ('active', 'completed', 'abandoned')),
  target_date date,
  sort_order  int default 0
);

alter table warmap_items enable row level security;

create policy "Users can view own warmap items" on warmap_items
  for select using (auth.uid() = user_id);
create policy "Users can insert own warmap items" on warmap_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update own warmap items" on warmap_items
  for update using (auth.uid() = user_id);
create policy "Users can delete own warmap items" on warmap_items
  for delete using (auth.uid() = user_id);

-- task_warmap_items (many-to-many: tasks linked to warmap items)
create table if not exists task_warmap_items (
  task_id        uuid references tasks(id) on delete cascade not null,
  warmap_item_id uuid references warmap_items(id) on delete cascade not null,
  created_at     timestamptz default now(),
  primary key (task_id, warmap_item_id)
);

alter table task_warmap_items enable row level security;

create policy "Users can view own task warmap links" on task_warmap_items
  for select using (
    exists (select 1 from tasks t where t.id = task_warmap_items.task_id and t.user_id = auth.uid())
  );
create policy "Users can insert own task warmap links" on task_warmap_items
  for insert with check (
    exists (select 1 from tasks t where t.id = task_warmap_items.task_id and t.user_id = auth.uid())
  );
create policy "Users can delete own task warmap links" on task_warmap_items
  for delete using (
    exists (select 1 from tasks t where t.id = task_warmap_items.task_id and t.user_id = auth.uid())
  );

-- Indexes
create index if not exists idx_warmap_categories_user_id on warmap_categories(user_id);
create index if not exists idx_warmap_items_user_id on warmap_items(user_id);
create index if not exists idx_warmap_items_category_id on warmap_items(category_id);
create index if not exists idx_task_warmap_items_task_id on task_warmap_items(task_id);
create index if not exists idx_task_warmap_items_warmap_item_id on task_warmap_items(warmap_item_id);

-- Triggers
create trigger update_warmap_categories_updated_at
  before update on warmap_categories
  for each row execute function update_updated_at_column();

create trigger update_warmap_items_updated_at
  before update on warmap_items
  for each row execute function update_updated_at_column();
