# Pulse

Daily check-ins, structured reflections, priority tasks, and journaling — with optional Spotify integration to soundtrack your workflow.

**[Live Demo →](https://vibe-with-pulse.vercel.app)**

![CI](https://github.com/theamazingmrb/pulse/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## Overview

Most productivity apps optimize for volume — more tasks, more tracking, more noise. Pulse is built around a different idea: **clarity drives productivity**. It's a personal operating system for focused people who want to set daily intentions, track what matters, and reflect with structure — without the overhead of enterprise tooling.

### Key Features

- **Time-Aware Check-ins** — Guided flows that adapt to morning, midday, or evening context. Set your top priority, note potential blockers, and track energy levels throughout the day.

- **Smart Task Management** — Tasks support four priority tiers (Hot → Cold), manual or auto-scheduling modes, duration estimates, and organization by user-created projects.

- **Plan My Day** — One-click intelligent scheduling that pushes overdue tasks forward and fills your day with auto-mode tasks using a 4-factor scoring algorithm (deadline urgency, time-of-day energy, priority match, fragmentation prevention).

- **Reflective Journaling** — Session-based entries with mood tracking. Link journal entries to specific tasks to build a narrative around your work.

- **Daily / Weekly / Monthly Reflections** — Structured guided prompts for each cadence. Tracks streaks, shows smart time-based reminders on the dashboard (dismissable), and supports keyword search across all entries.

- **WarMap Year Planning** — Define annual categories and goals. Link tasks directly to WarMap items and review progress during weekly and monthly reflections.

- **Spotify Integration** — Attach songs to journal entries and automatically sync them to a Spotify playlist. Includes in-app playback via the Web Playback SDK.

- **Responsive Design** — Collapsible sidebar navigation on desktop, bottom tab bar on mobile. Dark and light themes.

## Technical Highlights

### Architecture

```
├── app/                    # Next.js 16 App Router
│   ├── api/spotify/        # OAuth + playlist sync endpoints
│   ├── dashboard/          # Authenticated home
│   ├── checkin/            # Check-in flow
│   ├── journal/            # Journal CRUD
│   ├── reflections/        # Daily/weekly/monthly reflections
│   ├── warmap/             # Year planning (categories + goals)
│   ├── projects/           # Project cards
│   ├── playlist/           # Spotify playlist view
│   └── tasks/              # Task management
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   └── tasks/              # Task-specific components
├── lib/                    # Services and utilities
│   ├── auth-context.tsx    # Auth state management
│   ├── spotify-context.tsx # Spotify player state
│   ├── scheduling.ts       # Auto-scheduling algorithm
│   ├── tasks.ts            # Task service layer
│   ├── warmap.ts           # WarMap service layer
│   └── reflections.ts      # Reflections + streak logic
└── supabase/
    └── migrations/         # Database schema + RLS policies
```

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Client Components) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with Row Level Security |
| Styling | Tailwind CSS + shadcn/ui + Radix primitives |
| Animation | Framer Motion |
| External API | Spotify Web API + Web Playback SDK |

### Database Design

Eleven tables with Row Level Security ensuring complete data isolation between users:

| Table | Purpose |
|-------|---------|
| `projects` | User-defined project categories with color coding |
| `tasks` | Tasks with priority levels, scheduling metadata, and project associations |
| `journals` | Journal entries with mood, session context, and Spotify track metadata |
| `journal_tasks` | Many-to-many relationship linking journals to tasks |
| `checkins` | Priority snapshots with energy levels and context notes |
| `spotify_playlists` | Synced playlist references for the Spotify integration |
| `warmap_categories` | Annual theme categories for year planning |
| `warmap_items` | Specific goals within a WarMap category |
| `task_warmap_items` | Many-to-many linking tasks to WarMap goals |
| `reflections` | Daily/weekly/monthly structured reflections with JSONB sections |
| `reflection_streaks` | Per-user streak tracking for each reflection cadence |

### Notable Implementation Details

- **Auto-scheduling algorithm** scores time slots across a 7-day window using four weighted factors:
  - *Deadline Urgency (40%)* — slots are scored based on how well they position a task relative to its due date, with priority-specific urgency windows
  - *Time of Day (25%)* — energy-aware scoring peaks at 9–11 AM and 4 PM, based on research-backed productivity patterns
  - *Priority Match (20%)* — hot tasks are routed to premium morning slots; cold tasks are pushed to off-peak times to preserve them
  - *Fragmentation Prevention (15%)* — prefers slots that either tightly fit the task or leave room for another full task, avoiding awkward gaps
- **Spotify OAuth flow** with token refresh handling and playlist management (create, add tracks, sync)
- **Context-based state management** for auth, sidebar, and Spotify player state
- **Optimistic UI updates** for task status changes

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account (free tier works)
- Spotify Developer account (optional, for music features)

### Installation

```bash
# Clone and install
git clone https://github.com/theamazingmrb/pulse.git
cd pulse
pnpm install

# Set up environment
cp .env.example .env
# Add your Supabase and Spotify credentials

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

### Database Setup

For local development with Supabase CLI:

```bash
supabase start
supabase db reset  # Applies migrations automatically
```

For hosted Supabase, run migrations in order in the SQL Editor:
1. `supabase/migrations/20240101000000_initial_schema.sql`
2. `supabase/migrations/20240313000000_add_images.sql`
3. `supabase/migrations/20240313000001_create_storage_buckets.sql`
4. `supabase/migrations/20260313000000_warmap.sql`
5. `supabase/migrations/20260313000001_reflections.sql`

## Deployment

Optimized for Vercel deployment:

```bash
vercel deploy
```

Add environment variables in the Vercel dashboard under Settings → Environment Variables.

## License

MIT
