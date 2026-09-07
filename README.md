# Priority Compass

**Start your day with clarity. End it with insight.**

A personal productivity OS for intentional people who want to set daily priorities, track what matters, and reflect with structure — without the overhead of enterprise tooling.

**[Live Demo →](https://prioritycompass.vercel.app)**

![CI](https://github.com/theamazingmrb/priority-compass/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

---

## The Problem

Most productivity apps optimize for volume — more tasks, more tracking, more noise. They turn your life into an endless to-do list that grows faster than you can check things off.

**Priority Compass optimizes for clarity.**

This is for people who:
- Start their day overwhelmed by options
- End their day unsure what they actually accomplished
- Want to build self-awareness through structured reflection
- Need their calendar and tasks to work *together*, not in silos

## The Core Loop

| ☀️ Morning · Check-in | 🎯 Day · Focus | 🌙 Evening · Reflect |
|----------------------|----------------|---------------------|
| Set top priority | Work with timer | What worked? |
| Note blockers | Log to journal | What didn't? |
| Rate energy | Stay on track | Tomorrow's focus |
| Set daily intent | Focus mode filter | Accomplished intent? |

Anchored by your **North Star** (life vision), **Core Values**, **WarMap** (year-level goals), **Projects**, **Calendar**, and **Weekly Rhythm** (energy-based planning).

**This loop creates habit.** Morning intention → Focused execution → Evening reflection.

Most apps only handle the middle. Priority Compass completes the loop.

## Key Features

| Feature | Description |
|---------|-------------|
| **North Star** | Life vision displayed prominently on dashboard |
| **Core Values** | Define and rank what matters most |
| **Daily Intent** | Set and track daily intentions |
| **Focus Modes** | Categorize tasks by cognitive load (Deep, Quick, Planning, Admin) |
| **Weekly Rhythm** | Energy-based planning with time blocks |
| **Time-Aware Check-ins** | Morning, midday, evening flows with energy tracking |
| **Priority-Based Tasks** | 4-tier system with smart scheduling |
| **Plan My Day** | One-click intelligent scheduling |
| **Google Calendar Sync** | Two-way integration with busy block awareness |
| **Journal** | Session-based entries with mood and task linking |
| **Reflections** | Daily/weekly/monthly with streak tracking |
| **WarMap** | Annual goal planning and progress tracking |
| **Projects** | Organize tasks by project with color coding |
| **Spotify Integration** | Music for your workflow |

### Smart Auto-Scheduling

The scheduling algorithm doesn't just fill time. It considers:
- **Deadline urgency** (40%) — When is it due? How critical?
- **Time of day** (25%) — Energy-based slot selection (9-11 AM peak, 4 PM second peak)
- **Priority match** (20%) — Hot tasks get premium slots
- **Fragmentation prevention** (15%) — Avoids awkward gaps

One-click "Plan My Day" takes your auto-mode tasks and schedules them intelligently.

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with Row Level Security |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| External APIs | Spotify, Google Calendar |

### Database Design

Tables with Row Level Security ensuring complete data isolation between users:

| Table | Purpose |
|-------|---------|
| `projects` | User-defined project categories |
| `tasks` | Tasks with priority, scheduling, project links, focus mode |
| `journals` | Journal entries with mood and Spotify metadata |
| `journal_tasks` | Many-to-many journal ↔ task linking |
| `checkins` | Priority snapshots with energy levels |
| `spotify_playlists` | Synced playlist references |
| `warmap_categories` | Annual theme categories |
| `warmap_items` | Specific goals within categories |
| `task_warmap_items` | Many-to-many task ↔ goal linking |
| `reflections` | Daily/weekly/monthly structured reflections |
| `reflection_streaks` | Per-user streak tracking |
| `focus_sessions` | Focus timer session logs |
| `north_star` | User's life vision |
| `core_values` | User's ranked core values |
| `daily_intents` | Daily intention tracking |
| `weekly_rhythms` | Energy-based time block preferences |
| `notification_settings` | Push notification preferences |

## Run Locally

```bash
git clone https://github.com/theamazingmrb/priority-compass.git
cd priority-compass
pnpm install
cp .env.example .env   # add your Supabase, Spotify, and Google credentials
pnpm dev
```

Requires Node.js 22+ and pnpm.

## License

MIT
