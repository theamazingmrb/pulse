-- ─────────────────────────────────────────
-- Priority Compass — Supabase Schema
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- Projects (user-defined, replaces hardcoded list)
-- ─────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  color       text default '#3B82F6',
  status      text default 'active' check (status in ('active', 'completed', 'archived', 'on_hold')),
  unique(user_id, name)
);

-- ─────────────────────────────────────────
-- Tasks (enhanced with scheduling)
-- ─────────────────────────────────────────
create table if not exists tasks (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  title               text not null,
  description         text,
  status              text default 'active'
                      check (status in ('active', 'waiting', 'someday', 'done')),
  project_id          uuid references projects(id) on delete set null,
  notes               text,
  due_date            timestamptz,
  -- Scheduling fields
  priority_level      int default 1 check (priority_level between 1 and 4),
  priority_label      text default 'Hot' check (priority_label in ('Hot', 'Warm', 'Cool', 'Cold')),
  scheduling_mode     text default 'manual' check (scheduling_mode in ('manual', 'auto')),
  estimated_duration  int default 30, -- minutes
  start_time          timestamptz,
  end_time            timestamptz,
  locked              boolean default false,
  is_completed        boolean default false
);

-- Enable Row Level Security
alter table projects enable row level security;
alter table tasks enable row level security;

-- Journals
create table if not exists journals (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  date                date not null default current_date,
  session_label       text default 'general',  -- morning | afternoon | evening | general
  title               text,
  content             text not null,
  mood                text,                     -- emoji or short word
  -- Spotify
  spotify_track_id    text,
  spotify_track_name  text,
  spotify_artist      text,
  spotify_album_art   text,
  spotify_preview_url text,
  spotify_url         text
);

-- Journal ↔ Task (many-to-many)
create table if not exists journal_tasks (
  id         uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journals(id) on delete cascade,
  task_id    uuid not null references tasks(id) on delete cascade,
  unique (journal_id, task_id)
);

-- Check-ins (priority recalibrations throughout the day)
create table if not exists checkins (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  time_of_day    text,                 -- morning | midday | evening
  top_priority   text not null,
  other_priorities text[],             -- array of up to 2 others
  context        text,                 -- what shifted, blockers, notes
  energy_level   int check (energy_level between 1 and 5)
);

-- Useful views
create or replace view journals_with_tasks as
  select
    j.*,
    coalesce(
      json_agg(
        json_build_object(
          'id', t.id,
          'title', t.title,
          'status', t.status,
          'project', t.project
        )
      ) filter (where t.id is not null),
      '[]'
    ) as tasks
  from journals j
  left join journal_tasks jt on jt.journal_id = j.id
  left join tasks t on t.id = jt.task_id
  group by j.id;

-- Row Level Security Policies
-- Users can only access their own data

-- Projects policies
create policy "Users can view own projects" on projects
  for select using (auth.uid() = user_id);

create policy "Users can insert own projects" on projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update own projects" on projects
  for update using (auth.uid() = user_id);

create policy "Users can delete own projects" on projects
  for delete using (auth.uid() = user_id);

-- Tasks policies
create policy "Users can view own tasks" on tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert own tasks" on tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks" on tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete own tasks" on tasks
  for delete using (auth.uid() = user_id);

-- Journals policies
create policy "Users can view own journals" on journals
  for select using (auth.uid() = user_id);

create policy "Users can insert own journals" on journals
  for insert with check (auth.uid() = user_id);

create policy "Users can update own journals" on journals
  for update using (auth.uid() = user_id);

create policy "Users can delete own journals" on journals
  for delete using (auth.uid() = user_id);

-- Journal tasks policies
create policy "Users can view own journal tasks" on journal_tasks
  for select using (
    exists (
      select 1 from journals j 
      where j.id = journal_tasks.journal_id 
      and j.user_id = auth.uid()
    )
  );

create policy "Users can insert own journal tasks" on journal_tasks
  for insert with check (
    exists (
      select 1 from journals j 
      where j.id = journal_tasks.journal_id 
      and j.user_id = auth.uid()
    )
  );

create policy "Users can delete own journal tasks" on journal_tasks
  for delete using (
    exists (
      select 1 from journals j 
      where j.id = journal_tasks.journal_id 
      and j.user_id = auth.uid()
    )
  );

-- Check-ins policies
create policy "Users can view own checkins" on checkins
  for select using (auth.uid() = user_id);

create policy "Users can insert own checkins" on checkins
  for insert with check (auth.uid() = user_id);

create policy "Users can update own checkins" on checkins
  for update using (auth.uid() = user_id);

create policy "Users can delete own checkins" on checkins
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_priority_level on tasks(priority_level);
create index if not exists idx_tasks_start_time on tasks(start_time);
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_journals_user_id on journals(user_id);
create index if not exists idx_checkins_user_id on checkins(user_id);

-- ─────────────────────────────────────────
-- Triggers for updated_at
-- ─────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at_column();

create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();
