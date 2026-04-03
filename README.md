# Priority Compass

**Start your day with clarity. End it with insight.**

A personal productivity OS for intentional people who want to set daily priorities, track what matters, and reflect with structure — without the overhead of enterprise tooling.

**[Live Demo →](https://vibe-with-pulse.vercel.app)**

![CI](https://github.com/theamazingmrb/pulse/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

---

## The Problem

Most productivity apps optimize for volume — more tasks, more tracking, more noise. They turn your life into an endless to-do list that grows faster than you can check things off.

**Priority Compass is different.** We optimize for clarity.

This is for people who:
- Start their day overwhelmed by options
- End their day unsure what they actually accomplished
- Want to build self-awareness through structured reflection
- Need their calendar and tasks to work *together*, not in silos

## The Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   MORNING                    DAY                    EVENING     │
│   ────────                   ────                   ───────     │
│   Check-in                   Focus                  Reflect      │
│   · Set top priority         · Work with timer      · What worked? │
│   · Note blockers            · Log to journal       · What didn't?  │
│   · Rate energy              · Stay on track        · Tomorrow's focus │
│                                                                 │
│   ─────────────────────────────────────────────────────────────│
│                    WarMap: Year-Level Goals                     │
│                    Projects: Track Progress                     │
│                    Calendar: See Your Time                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**This loop creates habit.** Morning intention → Focused execution → Evening reflection.

Most apps only handle the middle. Priority Compass completes the loop.

## What Makes This Different

### 1. **Intentional Check-ins**
Not just "what do I need to do?" — but "what matters most right now?"
- Time-aware prompts (morning, midday, evening)
- Energy tracking to find your patterns
- Quick recalibration when priorities shift

### 2. **Priority Tiers, Not Just Lists**
- **Hot** — Urgent, do it now
- **Warm** — Important, do it soon  
- **Cool** — Can wait a bit
- **Cold** — Backlog / someday

Tasks get routed to appropriate time slots based on priority. Hot tasks get prime morning hours. Cold tasks fill gaps.

### 3. **Smart Auto-Scheduling**
The scheduling algorithm doesn't just fill time. It considers:
- **Deadline urgency** (40%) — When is it due? How critical?
- **Time of day** (25%) — Energy-based slot selection (9-11 AM peak, 4 PM second peak)
- **Priority match** (20%) — Hot tasks get premium slots
- **Fragmentation prevention** (15%) — Avoids awkward gaps

One-click "Plan My Day" takes your auto-mode tasks and schedules them intelligently.

### 4. **Structured Reflection**
Daily, weekly, and monthly prompts guide self-awareness:
- Daily: Accomplishments, gratitude, improvements, tomorrow's intention
- Weekly: Wins, blockers, WarMap progress, next week focus
- Monthly: Vision check, areas to improve, goals

Streaks gamify consistency without being gimmicky.

### 5. **WarMap: Year-Level Planning**
Define annual themes and goals. Link tasks to them. Review progress during weekly reflections.

This is the missing layer between "today's tasks" and "life goals."

### 6. **Google Calendar Integration**
Two-way sync:
- See your calendar events as busy blocks
- Scheduled tasks automatically sync to Google Calendar
- Changes flow both ways

### 7. **Spotify Integration**
Attach songs to journal entries. Build a soundtrack for your productivity. Optional but surprisingly sticky.

## Key Features

| Feature | Description |
|---------|-------------|
| **Time-Aware Check-ins** | Morning, midday, evening flows with energy tracking |
| **Priority-Based Tasks** | 4-tier system with smart scheduling |
| **Plan My Day** | One-click intelligent scheduling |
| **Google Calendar Sync** | Two-way integration with busy block awareness |
| **Journal** | Session-based entries with mood and task linking |
| **Reflections** | Daily/weekly/monthly with streak tracking |
| **WarMap** | Annual goal planning and progress tracking |
| **Projects** | Organize tasks by project with color coding |
| **Spotify Integration** | Music for your workflow |

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

Eleven tables with Row Level Security ensuring complete data isolation between users:

| Table | Purpose |
|-------|---------|
| `projects` | User-defined project categories |
| `tasks` | Tasks with priority, scheduling, project links |
| `journals` | Journal entries with mood and Spotify metadata |
| `journal_tasks` | Many-to-many journal ↔ task linking |
| `checkins` | Priority snapshots with energy levels |
| `spotify_playlists` | Synced playlist references |
| `warmap_categories` | Annual theme categories |
| `warmap_items` | Specific goals within categories |
| `task_warmap_items` | Many-to-many task ↔ goal linking |
| `reflections` | Daily/weekly/monthly structured reflections |
| `reflection_streaks` | Per-user streak tracking |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account (free tier works)
- Spotify Developer account (optional, for music features)
- Google Cloud project (optional, for Calendar sync)

### Installation

```bash
# Clone and install
git clone https://github.com/theamazingmrb/pulse.git
cd pulse
pnpm install

# Set up environment
cp .env.example .env
# Add your Supabase, Spotify, and Google credentials

# Run locally
pnpm dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SPOTIFY_CLIENT_ID` | No | Spotify app Client ID |
| `SPOTIFY_CLIENT_SECRET` | No | Spotify app Client Secret |
| `SPOTIFY_REDIRECT_URI` | No | OAuth callback URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Google OAuth Client ID |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | No | Google OAuth callback URL |

### Database Setup

For local development with Supabase CLI:

```bash
supabase start
supabase db reset  # Applies migrations automatically
```

For hosted Supabase, run migrations in order in the SQL Editor.

## Deployment

Optimized for Vercel deployment:

```bash
vercel deploy
```

Add environment variables in the Vercel dashboard under Settings → Environment Variables.

## License

MIT