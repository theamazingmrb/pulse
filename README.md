# Pulse

Daily check-ins, priority tasks, and journaling — with optional Spotify integration to soundtrack your workflow.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## Overview

Pulse is built around one idea: **clarity drives productivity**. Focused tools for setting intentions, tracking work, and reflecting on progress — without the noise.

### Key Features

- **Time-Aware Check-ins** — Guided flows that adapt to morning, midday, or evening context. Set your top priority, note potential blockers, and track energy levels throughout the day.

- **Smart Task Management** — Tasks support four priority tiers (Hot → Cold), manual or auto-scheduling modes, duration estimates, and organization by user-created projects.

- **Reflective Journaling** — Session-based entries with mood tracking. Link journal entries to specific tasks to build a narrative around your work.

- **Spotify Integration** — Attach songs to journal entries and automatically sync them to a Spotify playlist. Includes in-app playback via the Web Playback SDK.

- **Responsive Design** — Collapsible sidebar navigation on desktop, bottom tab bar on mobile. Dark and light themes.

## Technical Highlights

### Architecture

```
├── app/                    # Next.js 15 App Router
│   ├── api/spotify/        # OAuth + playlist sync endpoints
│   ├── dashboard/          # Authenticated home
│   ├── checkin/            # Check-in flow
│   ├── journal/            # Journal CRUD
│   ├── playlist/           # Spotify playlist view
│   └── tasks/              # Task management
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   └── tasks/              # Task-specific components
├── lib/                    # Services and utilities
│   ├── auth-context.tsx    # Auth state management
│   ├── spotify-context.tsx # Spotify player state
│   ├── scheduling.ts       # Auto-scheduling algorithm
│   └── tasks.ts            # Task service layer
└── supabase/
    └── migrations/         # Database schema + RLS policies
```

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Server Components) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with Row Level Security |
| Styling | Tailwind CSS + shadcn/ui + Radix primitives |
| Animation | Framer Motion |
| External API | Spotify Web API + Web Playback SDK |

### Database Design

Six tables with Row Level Security ensuring complete data isolation between users:

| Table | Purpose |
|-------|---------|
| `projects` | User-defined project categories with color coding |
| `tasks` | Tasks with priority levels, scheduling metadata, and project associations |
| `journals` | Journal entries with mood, session context, and Spotify track metadata |
| `journal_tasks` | Many-to-many relationship linking journals to tasks |
| `checkins` | Priority snapshots with energy levels and context notes |
| `spotify_playlists` | Synced playlist references for the Spotify integration |

### Notable Implementation Details

- **Auto-scheduling algorithm** scores time slots based on task priority, deadline proximity, and estimated duration to suggest optimal scheduling
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
git clone https://github.com/yourusername/pulse.git
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

For hosted Supabase, run the migration file in the SQL Editor:
`supabase/migrations/20240101000000_initial_schema.sql`

## Deployment

Optimized for Vercel deployment:

```bash
vercel deploy
```

Add environment variables in the Vercel dashboard under Settings → Environment Variables.

## License

MIT
