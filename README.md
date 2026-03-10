# Priority Compass

A personal productivity app to help you stay focused on what matters most. Set daily priorities, track tasks, journal your sessions, and recalibrate throughout the day.

**Stack:** Next.js 15 · Supabase · Tailwind CSS · Radix UI · Framer Motion · Spotify Web API

---

## Features

| Section | What it does |
|---|---|
| **Home** | Today's top priority, active tasks, recent check-ins and journal entries |
| **Check-in** | Time-aware guided flow (morning / midday / evening) to set or recalibrate your priority, context, and energy level |
| **Journal** | Write session-based entries with mood tracking. Attach a Spotify track and link entries to tasks |
| **Tasks** | Task list with status tabs (Active, Waiting, Someday, Done) and optional project labels |
| **Auth** | Email/password sign-in and sign-up. Each user's data is fully private via Row Level Security |
| **Theme** | Dark and light mode toggle — sidebar on desktop, top bar on mobile |
| **Mobile** | Responsive layout with a collapsible sidebar drawer on small screens |

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **Anon Key** from Settings → API

### 3. Set up Spotify *(optional)*

1. Create an app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Enable the **Web Playback SDK** in your app settings
3. Add `http://127.0.0.1:3000/api/spotify/callback` to your app's **Redirect URIs**
4. Copy your **Client ID** and **Client Secret**

### 4. Configure environment variables

```bash
cp .env.example .env
# Fill in your values
```

### 5. Run the dev server

```bash
pnpm dev
# Open http://127.0.0.1:3000
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SPOTIFY_CLIENT_ID` | Spotify app Client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app Client Secret |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL (server-side) |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Spotify Client ID (client-side) |
| `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` | OAuth callback URL (client-side) |

---

## Database Schema

Four tables in Supabase with Row Level Security — users can only access their own data.

| Table | Description |
|---|---|
| `tasks` | Tasks with title, status, project, notes, and due date |
| `journals` | Journal entries with mood, session label, and Spotify metadata |
| `journal_tasks` | Many-to-many join between journals and tasks |
| `checkins` | Priority check-ins with top priority, context, and energy level |

---

## Routes

| Route | Description |
|---|---|
| `/` | Dashboard |
| `/checkin` | Check-in flow |
| `/journal` | Journal list |
| `/journal/new` | New journal entry |
| `/journal/[id]` | Journal entry detail |
| `/tasks` | Task manager |
| `/signin` | Sign in |
| `/signup` | Sign up |

---

## Deploy

Works out of the box with Vercel. Add all environment variables under **Settings → Environment Variables** in the Vercel dashboard, then:

```bash
vercel deploy
```
