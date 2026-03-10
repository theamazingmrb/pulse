# Priority Compass

A fluid personal focus tool — check in at any time of day, journal your sessions, attach songs, and link entries to your tasks.

**Stack:** Next.js 15 · Supabase · Tailwind · shadcn (new-york) · Framer Motion · Spotify Web API

---

## Setup (5 steps)

### 1. Install dependencies
```bash
cd priority-compass
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project (or use your existing one)
2. Open the **SQL Editor** and paste + run the contents of `supabase/schema.sql`
3. Grab your **Project URL** and **Anon Key** from Settings → API

### 3. Set up Spotify
1. Go to [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Create a new app (any name, any redirect URI — e.g. `http://localhost:3000`)
3. Grab the **Client ID** and **Client Secret**
> Note: This only uses Client Credentials (no user login needed) — just for track search.

### 4. Create your `.env.local`
```bash
cp .env.example .env.local
# Fill in your values
```

### 5. Run it
```bash
npm run dev
# Open http://localhost:3000
```

---

## Features

| Section | What it does |
|---------|-------------|
| **Home** | Today's check-in summary, active tasks, recent journals |
| **Check-in** | Time-aware guided flow (morning/midday/evening) to set or recalibrate your priority |
| **Journal** | Write entries grouped by day. Attach a Spotify track and link to tasks |
| **Tasks** | Simple task list with project tags, status, and one-click done |

### Linking journals to tasks
When writing an entry, expand "Link to tasks" to select any active tasks. You'll then be able to view all journals associated with a task from the task's row.

### Check-in anytime
The check-in flow adapts to the time of day — morning sets your focus, midday asks what shifted, evening winds down. Hit "Recalibrate" whenever something changes.

---

## Deploy (optional)
```bash
# Works out of the box with Vercel
vercel deploy
```
Add your env vars in the Vercel dashboard under Settings → Environment Variables.
