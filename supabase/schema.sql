-- ─────────────────────────────────────────
-- Priority Compass — Supabase Schema
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────

-- Enable Row Level Security
alter table tasks enable row level security;
alter table journals enable row level security;
alter table journal_tasks enable row level security;
alter table checkins enable row level security;

-- Tasks
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  status      text default 'active'
              check (status in ('active', 'waiting', 'someday', 'done')),
  project     text,
  notes       text,
  due_date    date
);

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
