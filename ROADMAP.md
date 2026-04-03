# Priority Compass Roadmap

## Vision

Priority Compass is a **personal productivity OS** for intentional people. The core thesis: clarity drives productivity, not volume. We optimize for focus and self-awareness, not task count.

**The moat**: The complete loop. Morning intention → Focused execution (with Focus Timer) → Evening reflection → Weekly/monthly patterns → Year-level goals (WarMap). No other app connects these layers.

---

## Strategic Analysis

### What's Built (Strong Foundation)

✅ **Core Loop:**
- Dashboard with daily priority display
- Check-ins (time-aware, energy tracking)
- Tasks with 4-tier priority system
- Journal with mood and task linking
- Reflections (daily/weekly/monthly) with streaks
- WarMap for annual planning
- Projects for task organization

✅ **Smart Scheduling:**
- Auto-scheduling algorithm with 4-factor scoring
- Deadline urgency, time-of-day energy, priority match, fragmentation prevention
- "Plan My Day" one-click scheduling
- Google Calendar two-way sync

✅ **Integrations:**
- Spotify playlist attachment to journals
- Web Playback SDK for in-app listening
- Google Calendar busy-block awareness

✅ **Technical Foundation:**
- Next.js 16, TypeScript, Supabase
- 11 tables with RLS
- Production-ready on Vercel

---

### What's Missing (The Gaps)

#### 1. **The Hook is Incomplete** (HIGH)

The check-in → task → reflection loop exists, but there's no **micro-commitment device** that creates daily habit. Users can check in, but there's no forcing function to return.

**Solution: Focus Timer (Pomodoro)**

This is the *single most important feature* because:
- It's a **daily habit anchor** — users return multiple times per day
- It creates **tangible output** — "I focused for 2 hours today" is shareable, trackable
- It connects directly to the task system — "Work on Task X for 25 min"
- It provides **data for insights** — actual focus time vs. planned time

This is the feature that makes Priority Compass a **daily app**, not a weekly check-in app.

#### 2. **Friction in Capture** (MEDIUM)

Adding tasks requires navigating to /tasks. Quick thoughts during the day get lost.

**Solution: Quick Add (Cmd+K)**

Global keyboard shortcut to add a task from anywhere. No context switch. Type, enter, done.

This reduces the "I'll add it later" friction that kills task systems.

#### 3. **No Retention Loop After First Week** (MEDIUM)

Onboarding exists, but there's no re-engagement mechanism. Users who skip check-ins or reflections drift away.

**Solution: Push Notifications**

- Morning reminder: "Set your intention for today"
- Task start time: "Time to start [Task Name]"
- Evening reminder: "Wrap up your day with a reflection"
- Overdue task nudges

This is the "poke" that brings users back.

#### 4. **Recurring Tasks Are Manual** (MEDIUM)

Daily standups, weekly reviews, monthly reports — users recreate these constantly.

**Solution: Recurring Tasks**

Set once, auto-create forever. Links to Focus Timer for recurring focus sessions.

#### 5. **No Data Story** (LOW)

Users accumulate data (tasks, journals, reflections) but see no synthesis. No "what is this telling me?"

**Solution: Productivity Analytics (Future)**

Dashboard showing:
- Tasks completed per week
- Focus time logged
- Check-in streaks
- Energy patterns
- Priority distribution over time

This is "Phase 2" — after the core habit is established.

---

### Product-Market Fit Questions

**Q: Who is this for?**
A: Knowledge workers, creators, entrepreneurs who feel overwhelmed by options and want intentional focus.

**Q: What's the hook?**
A: Focus Timer. Daily use, multiple sessions. Creates habit.

**Q: What makes it worth paying for?**
A: 
- Focus Timer + Analytics = quantified productivity
- Google Calendar sync = unified view
- WarMap = goal alignment
- Reflection streaks = self-awareness over time

**Q: What's the MVP feature that unlocks value?**
A: Focus Timer. Without it, this is a "check-in app" you use once a day. With it, it's a "focus companion" you use all day.

---

## 30/60/90 Day Plan

### Phase 1: The Hook (30 Days)

**Goal:** Make Priority Compass a daily habit app.

#### Focus Timer / Pomodoro (P0)

This is the highest-ROI feature. Core implementation:

**Database:**
```sql
-- New table: focus_sessions
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES tasks(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INT NOT NULL,
  session_type TEXT DEFAULT 'pomodoro', -- pomodoro, custom
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI Components:**
- Timer component (25/5/15/50 min presets + custom)
- Task picker (which task are you focusing on?)
- Session log (history of completed sessions)
- Journal integration ("How did it go?" prompt after session)

**Features:**
- Start from task detail page or dashboard
- Optional: Link to Spotify playlist
- Optional: Show focus time in daily reflection
- Stats: Focus time today/this week

**Success Metrics:**
- Users complete ≥1 focus session per day
- Focus time > 0 for 70% of active users
- Session completion rate > 80%

#### Quick Add / Cmd+K (P1)

Global keyboard shortcut for task creation:

**Implementation:**
- Radix UI Command component or custom modal
- Listen for Cmd+K / Ctrl+K globally
- Quick form: title, priority (keyboard shortcuts), optional project
- Enter to save, Esc to cancel
- Toast confirmation

**Success Metrics:**
- Quick Add usage > 30% of new tasks
- Average time from shortcut to task saved < 5 seconds

---

### Phase 2: Retention (60 Days)

**Goal:** Bring users back who drift away.

#### Push Notifications (P0)

**Notification Types:**
1. **Morning check-in reminder** (configurable time, default 8 AM)
2. **Focus session reminder** (optional, at scheduled task start)
3. **Evening reflection reminder** (configurable time, default 8 PM)
4. **Overdue task nudge** (daily digest of overdue tasks)
5. **Streak reminder** ("You're on a 5-day streak! Keep going")

**Implementation:**
- Web Push API (browser notifications)
- User preferences stored in Supabase
- Opt-in during onboarding
- Notification settings page

**Success Metrics:**
- Notification opt-in rate > 60%
- Click-through rate > 20%
- DAU/MAU improvement of 15%+

#### Recurring Tasks (P1)

**Implementation:**
```sql
-- Add to tasks table
ALTER TABLE tasks ADD COLUMN recurrence_type TEXT;
ALTER TABLE tasks ADD COLUMN recurrence_interval INT;
ALTER TABLE tasks ADD COLUMN recurrence_end_date DATE;

-- Types: 'daily', 'weekly', 'monthly', 'yearly'
-- Interval: every N days/weeks/months
```

**UI:**
- Recurrence picker in task form
- "Repeats" badge on recurring tasks
- Auto-create next instance when current completes
- Skip/disable for specific instances

**Success Metrics:**
- 20% of active tasks are recurring within 60 days
- Recurring task completion rate > 90%

---

### Phase 3: Growth (90 Days)

**Goal:** Provide value synthesis and differentiation.

#### Focus Analytics Dashboard (P2)

**Metrics to Show:**
- Focus time today/this week/this month
- Tasks completed per day (trend line)
- Energy patterns by time of day (from check-ins)
- Priority distribution (what % of time on Hot vs. Cold)
- Streak counter (check-ins, reflections)
- WarMap progress (tasks completed toward goals)

**Implementation:**
- New `/analytics` page
- Charts with Recharts or similar
- Weekly email digest (optional)

**Success Metrics:**
- Analytics page visits > 2 per user per week
- Users with analytics view have higher retention

#### Onboarding V2 (P2)

Current onboarding covers basics. V2 should:

1. **Show, don't tell:** Interactive tutorial
2. **Create first task:** Guide them to add a real task
3. **Explain the loop:** Check-in → Focus → Reflect
4. **Set up notifications:** Get permission during onboarding
5. **Create first focus session:** Immediate value

**Success Metrics:**
- Onboarding completion rate > 85%
- First task created during onboarding > 90%
- Notification permission grant > 60%

---

## Completed Features

- [x] Rebrand to Priority Compass (PC)
- [x] Core check-in flow with energy tracking
- [x] Task management with 4-tier priority system
- [x] Smart auto-scheduling algorithm
- [x] Google Calendar integration (read)
- [x] Day/Week/Month calendar views
- [x] Click-to-add tasks from calendar
- [x] Two-way Google Calendar sync
- [x] Journal with mood and task linking
- [x] Daily/Weekly/Monthly reflections with streaks
- [x] WarMap year planning
- [x] Projects organization
- [x] Spotify integration
- [x] Polished landing page
- [x] Onboarding flow

---

## Future Considerations

### Mobile App (P3)
- PWA with offline support
- Queue tasks offline, sync when online
- Native notifications on mobile
- Touch-optimized focus timer

### AI-Suggested Scheduling (P3)
- Learn from energy patterns
- Suggest optimal times for different task types
- Conflict resolution
- Requires usage data first

### Team/Shared Features (P4)
- Shared projects
- Team check-ins
- Team reflection summaries
- This is a pivot — only if individual product succeeds

### Data Export (P4)
- JSON/CSV export
- Journal entries, tasks, reflections
- Self-serve data portability

---

## Prioritization Framework

When prioritizing features, use this lens:

1. **Does it create daily habit?** (Focus Timer, Push Notifications)
2. **Does it reduce friction?** (Quick Add, Recurring Tasks)
3. **Does it deepen engagement?** (Analytics, WarMap progress)
4. **Does it differentiate from competitors?** (Complete loop, not just tasks)

**Build Phase 1 → Measure retention → Build Phase 2 → Measure growth → Build Phase 3**

---

## Technical Debt & Maintenance

### Current Technical Debt
- No automated tests for scheduling algorithm
- Some components have grown large (dashboard, task list)
- Missing loading states in some areas
- Error handling could be more graceful

### Maintenance Priorities
1. Add unit tests for `lib/scheduling.ts`
2. Component audit for large files (>300 lines)
3. Loading skeleton components for all data-fetching views
4. Error boundary testing

---

## Success Metrics (North Stars)

| Metric | Current | 30-Day Target | 90-Day Target |
|--------|---------|---------------|---------------|
| DAU/MAU ratio | TBD | +15% | +30% |
| Focus sessions per user/week | N/A | ≥5 | ≥10 |
| Check-in completion rate | TBD | 80% | 85% |
| Reflection streak retention | TBD | 60% at 7 days | 70% at 14 days |
| Quick Add usage | N/A | 30% of tasks | 50% of tasks |

---

## Open Questions

1. **What's the right Focus Timer default?** 25/5 Pomodoro? Customizable? User research needed.
2. **Should Focus Timer block the browser?** Or just run in background? Could be annoying.
3. **How to handle offline?** PWA? Service worker? Queue locally?
4. **What's the monetization model?** Freemium? Focus features paid? Team features paid?
5. **When to build mobile app?** After PWA? Or skip PWA and go native?

---

## Conclusion

Priority Compass has a **strong foundation** but is missing the **daily habit anchor** that makes it essential.

**Focus Timer is the key.** Without it, this is a "check-in app" you might use once a day. With it, it's a "focus companion" you use all day.

Build Focus Timer first. Then Quick Add. Then Push Notifications. Then measure.

Everything else is optimization.