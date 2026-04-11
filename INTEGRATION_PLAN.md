# Priority Compass Integration Plan

## Executive Summary

Priority Compass is built on the core insight that **alignment beats productivity**. The features built today create a foundation for intentional living, but they currently exist as separate components. This plan outlines how to weave them into a cohesive daily practice.

---

## Features Overview

### Built Features (P1)

| Feature | Location | Data Model | Key User Touchpoints |
|---------|----------|------------|----------------------|
| **North Star** | Dashboard, Onboarding | `north_star` table | Dashboard inline display, Settings edit |
| **What Matters Most** | Settings, Dashboard | `core_values` table | Dashboard display, Settings CRUD |
| **Daily Intent** | Check-in flow | `checkins.daily_intent`, `checkins.say_no_to` | Check-in intent step, Focus Timer header, Dashboard display |
| **Focus Modes** | Tasks | `tasks.focus_mode` enum | Task creation/edit, Weekly Rhythm alignment, Scheduling engine |
| **Weekly Rhythm** | Settings, Dashboard, Scheduling | `weekly_rhythms` table | Settings configuration, Dashboard "Today's Energy" card, Auto-scheduling boost scores |

### Remaining Features (P2)

| Feature | What It Adds |
|---------|--------------|
| **Boundaries** | Persistent "things to say no to" beyond daily intent — patterns to protect |
| **Life Lanes** | Renamed War Map categories with balance visualization — how you're spending life energy |

---

## Current Data Connections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER                                               │
│                                                                              │
│  ┌───────────────┐    ┌──────────────────┐    ┌───────────────────┐        │
│  │  north_star   │    │   core_values    │    │  weekly_rhythms   │        │
│  │  (1 row)      │    │  (2-5 rows)      │    │  (21 rows)        │        │
│  │               │    │                  │    │                   │        │
│  │  content      │    │  value_text      │    │  day_of_week      │        │
│  │  (vision)     │    │  value_order     │    │  time_block       │        │
│  └───────────────┘    └──────────────────┘    │  energy_level     │        │
│                                                │  focus_mode       │        │
│                                                └───────────────────┘        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           checkins                                   │   │
│  │  ┌─ top_priority ────────────────────────────────┐                 │   │
│  │  │  Links to: tasks (optional)                    │                 │   │
│  │  │  Links to: war_map_items (optional)            │                 │   │
│  │  └────────────────────────────────────────────────┘                 │   │
│  │  daily_intent      ──► Shows in Focus Timer, Dashboard              │   │
│  │  say_no_to         ──► Daily boundaries (ephemeral)                 │   │
│  │  energy_level      ──► Could inform Weekly Rhythm learning          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────┐    ┌───────────────────────┐                    │
│  │        tasks         │    │   focus_sessions       │                    │
│  │  focus_mode (enum)   │    │   task_id (optional)   │                    │
│  │  scheduling_mode     │    │   duration             │                    │
│  │  start_time, end_time│    │   status               │                    │
│  │  priority_level      │    └───────────────────────┘                    │
│  │  project_id ─────────┼────► Links to War Map items                     │
│  └──────────────────────┘                                                  │
│                                                                              │
│  ┌──────────────────────┐    ┌───────────────────────┐                    │
│  │   reflections         │    │   journals             │                    │
│  │  type (daily/weekly)  │    │   content              │                    │
│  │  sections (JSON)      │    │   mood, spotify...     │                    │
│  │  ─────────────────────│    └───────────────────────┘                    │
│  │  "intent_check"       │                                                 │
│  │  "values_alignment"  │                                                 │
│  │  "warmap_progress"   │                                                 │
│  └──────────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Complete Loop: User Journey

### Morning (6 AM - 12 PM)

**Entry Point: `/checkin` or Dashboard**

```
┌─────────────────────────────────────────────────────────────────┐
│  MORNING CHECK-IN                                               │
│                                                                 │
│  1. Greeting + Time-based context                               │
│     └─ "Good morning, BJ. What matters most today?"             │
│                                                                 │
│  2. Dashboard shows (before check-in):                          │
│     ├─ North Star (life vision)                                 │
│     ├─ What Matters Most (core values)                          │
│     ├─ Weekly Rhythm (today's energy profile)                   │
│     └─ [If no check-in] → "Set your priority for today"        │
│                                                                 │
│  3. Check-in Flow:                                              │
│     Step 1: Top Priority                                        │
│       └─ Can select from active tasks or type custom            │
│     Step 2: Daily Intent ⭐ NEW                                 │
│       ├─ "Today I will..."                                      │
│       └─ "Saying no to..."                                      │
│     Step 3: War Map Link (optional)                             │
│       └─ "Which goal does this serve?"                           │
│     Step 4: Context/Blockers                                    │
│     Step 5: Energy Level (1-5)                                  │
│                                                                 │
│  4. Post check-in:                                              │
│     ├─ Dashboard updates with:                                   │
│     │   ├─ Today's Focus card (top priority)                    │
│     │   ├─ Daily Intent display (emerald box)                    │
│     │   └─ Weekly Rhythm "current block" indicator              │
│     └─ Scheduling suggestions based on energy + focus mode      │
│                                                                 │
│  CONNECTED INSIGHTS:                                            │
│  └─ North Star + Values appear in check-in as subtle reminders  │
└─────────────────────────────────────────────────────────────────┘
```

**What's Connected:**
- North Star displays on dashboard → contextual reminder before setting intent
- Core Values display on dashboard → "What matters most" alignment
- Weekly Rhythm shows current energy block → informs "what should I do now?"
- Daily Intent saves to checkin → displayed in Focus Timer header

**Gap Identified:**
- North Star and Core Values don't appear *inside* the check-in flow itself
- No prompt linking daily intent to values

### During the Day (Focus Sessions)

**Entry Point: `/focus`**

```
┌─────────────────────────────────────────────────────────────────┐
│  FOCUS TIMER                                                    │
│                                                                 │
│  Pre-Session:                                                   │
│  ├─ Duration selection (presets or custom)                      │
│  ├─ Task linking (optional)                                     │
│  │   └─ Shows Focus Mode of task if set                          │
│  ├─ Spotify integration (optional)                              │
│  └─ Daily Intent reminder ⭐ BUILT                               │
│      └─ Shows intent + say_no_to in emerald box                  │
│                                                                 │
│  During Session:                                                │
│  ├─ Circular progress timer                                     │
│  ├─ Task title display                                          │
│  └─ Music indicator                                             │
│                                                                 │
│  Post-Session:                                                  │
│  ├─ Completion modal                                            │
│  │   ├─ Notes (optional)                                        │
│  │   └─ Auto-creates journal entry                              │
│  └─ Focus session logged with duration + task                   │
│                                                                 │
│  WEEKLY RHYTHM INTEGRATION:                                     │
│  └─ Scheduling engine uses rhythms for scoring slots            │
│     └─ Focus mode + energy level boost scoring                   │
│                                                                 │
│  MISSING CONNECTION:                                            │
│  └─ No visualization of time spent per Focus Mode               │
│  └─ No "you're in high energy time" contextual nudge            │
└─────────────────────────────────────────────────────────────────┘
```

**What's Connected:**
- Daily Intent displays at top of Focus Timer setup
- Task focus mode influences scheduling score
- Weekly Rhythm provides boost to scheduling scores

**Gaps Identified:**
- No real-time "you're in your high energy block" indicator during focus setup
- Focus Timer doesn't suggest tasks based on current energy
- Focus sessions aren't aggregated by focus mode for analytics

### Evening (6 PM+)

**Entry Point: `/journal` or Dashboard reminder**

```
┌─────────────────────────────────────────────────────────────────┐
│  EVENING REFLECTION                                             │
│                                                                 │
│  Daily Reflection Prompts:                                       │
│  ├─ 🏆 Accomplishments                                          │
│  ├─ 🎯 Daily Intent Check ⭐ BUILT                              │
│  │   └─ "Did you accomplish what you committed to today?"       │
│  │   └─ "What about what you said NO to?"                       │
│  ├─ 🙏 Gratitude                                                │
│  ├─ 💡 What could be better                                     │
│  └─ 🎯 Tomorrow's intention                                      │
│                                                                 │
│  Weekly Reflection Prompts:                                      │
│  ├─ 🏆 Biggest wins                                             │
│  ├─ 🚧 What held me back                                        │
│  ├─ 🗺️ WarMap progress                                          │
│  ├─ ❤️ Values alignment ⭐ BUILT                                │
│  │   └─ "Did your actions align with what matters most?"        │
│  └─ 🔭 Next week focus                                          │
│                                                                 │
│  CONNECTIONS:                                                   │
│  └─ intent_check references daily_intent                        │
│  └─ values_alignment references core_values                     │
│  └─ warmap_progress references war_map_items                    │
│                                                                 │
│  MISSING CONNECTION:                                            │
│  └─ No "boundaries check" prompt                                │
│  └─ No "did you protect your energy?" reflection                │
└─────────────────────────────────────────────────────────────────┘
```

**What's Connected:**
- Reflection prompts for intent check and values alignment
- Journal entries auto-created from focus sessions

**Gaps Identified:**
- No boundaries reflection prompt
- No weekly rhythm effectiveness prompt ("Did you work during your high-energy blocks?")

### Weekly Review

**Entry Point: Manual `/journal?type=weekly`**

```
┌─────────────────────────────────────────────────────────────────┐
│  WEEKLY REVIEW                                                  │
│                                                                 │
│  Current Prompts:                                               │
│  ├─ Biggest wins                                               │
│  ├─ What held me back                                          │
│  ├─ WarMap progress                                             │
│  ├─ Values alignment ⭐ BUILT                                    │
│  └─ Next week focus                                            │
│                                                                 │
│  MISSING ANALYTICS:                                            │
│  ├─ Time spent per Focus Mode                                   │
│  │   └─ "You spent 12 hours in Deep Focus, 3 in Quick..."      │
│  ├─ Energy block utilization                                    │
│  │   └─ "You worked during 4/5 high-energy blocks"             │
│  ├─ Life Lane balance (War Map categories)                      │
│  │   └─ "Career: 60%, Health: 10%, Relationships: 30%"        │
│  └─ Intent completion rate                                      │
│      └─ "You completed 4/7 daily intents this week"            │
└─────────────────────────────────────────────────────────────────┘
```

**What's Connected:**
- Values alignment prompt exists
- War Map progress prompt exists

**Major Gaps:**
- No analytics aggregation for Focus Mode time
- No Life Lane balance visualization
- No completion tracking for intents

---

## Integration Gaps Summary

### Gap 1: Values in Check-in Flow
**Current:** Values only appear on dashboard, not in check-in
**Fix:** Add a subtle "Remember: Your values are X, Y, Z" in check-in step 1 or 2
**Effort:** Low (add a query + display)

### Gap 2: North Star in Check-in Flow
**Current:** North Star only on dashboard
**Fix:** Show as collapsed context banner "Your North Star: [truncated]..."
**Effort:** Low

### Gap 3: Energy-Aware Task Suggestions
**Current:** Scheduling uses Weekly Rhythm scores, but Focus Timer doesn't suggest tasks
**Fix:** Add "Suggested for current energy" section in Focus Timer task picker
**Effort:** Medium

### Gap 4: Focus Mode Analytics
**Current:** Focus sessions are logged but not aggregated by mode
**Fix:** Create Focus Stats component showing time by focus mode
**Effort:** Medium (new query + visualization)

### Gap 5: Boundaries Tracking
**Current:** `say_no_to` is ephemeral per check-in
**Fix:** Create `boundaries` table for persistent patterns
**Effort:** High (new feature, P2)

### Gap 6: Life Lane Balance Visualization
**Current:** War Map categories exist but no balance view
**Fix:** Rename to "Life Lanes" + add balance chart
**Effort:** High (new feature, P2)

### Gap 7: Intent Completion Tracking
**Current:** Intents are saved but never checked against completion
**Fix:** Evening reflection should pull today's intent and ask "Did you complete this?"
**Effort:** Low (prompt already exists, just needs data connection)

### Gap 8: Weekly Rhythm Effectiveness
**Current:** Rhythms inform scheduling but no feedback loop
**Fix:** Weekly reflection: "You worked X hours during high-energy blocks"
**Effort:** Medium

---

## Implementation Order

### Phase 1: Tighten Existing Connections (1-2 days)

| Task | Files to Modify | Impact |
|------|-----------------|--------|
| 1.1 Add Values/North Star to check-in | `components/checkin-flow.tsx` | High - contextual alignment |
| 1.2 Pull today's intent into evening reflection | `lib/reflections.ts` | High - completes loop |
| 1.3 Add Focus Mode filter to dashboard tasks | `app/dashboard/page.tsx` | Medium - visibility |
| 1.4 Show current energy block in Focus Timer | `app/focus/page.tsx` | Medium - energy awareness |

### Phase 2: Analytics Foundation (2-3 days)

| Task | Files to Modify | Impact |
|------|-----------------|--------|
| 2.1 Create Focus Mode aggregation query | New: `lib/focus-analytics.ts` | Foundation for weekly review |
| 2.2 Add Focus Stats to dashboard | `components/focus-stats.tsx` (enhance) | High - shows where time goes |
| 2.3 Add intent completion tracking | `lib/reflections.ts`, `lib/daily-intent.ts` | High - accountability |

### Phase 3: Boundaries Feature (3-4 days)

| Task | Description |
|------|-------------|
| 3.1 Create `boundaries` table | Persistent "things to say no to" |
| 3.2 Add Boundaries settings UI | CRUD for boundary patterns |
| 3.3 Show Boundaries in check-in | "Remember your boundaries: X, Y" |
| 3.4 Add Boundaries reflection | "Did you protect your boundaries?" |

### Phase 4: Life Lanes Feature (4-5 days)

| Task | Description |
|------|-------------|
| 4.1 Rename War Map categories → Life Lanes | Copy + UI updates |
| 4.2 Create Life Lane balance query | Aggregate task time per category |
| 4.3 Add balance visualization | Pie/bar chart in weekly review |
| 4.4 Integrate with scheduling | "Career tasks" vs "Health tasks" time balance |

---

## Data Model Additions

### Boundaries Table (P2)

```sql
CREATE TABLE boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  boundary_text TEXT NOT NULL,
  category TEXT, -- 'time', 'energy', 'commitments', 'distractions'
  is_active BOOLEAN DEFAULT true,
  violation_count INTEGER DEFAULT 0,
  last_violated_at TIMESTAMPTZ
);
```

### Focus Session Enhancement (P2)

```sql
-- Add focus_mode to focus_sessions if not already present
ALTER TABLE focus_sessions 
ADD COLUMN IF NOT EXISTS focus_mode TEXT 
CHECK (focus_mode IN ('deep', 'quick', 'planning', 'admin'));

-- Add intent_id to link session to daily intent
ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS intent_id UUID REFERENCES checkins(id);
```

---

## Reflection Prompt Updates

### Daily Reflection (Enhanced)

```typescript
{
  key: "intent_check",
  label: "🎯 Daily Intent Check",
  placeholder: "Did you accomplish what you committed to today? What about what you said NO to?",
  // NEW: Pull today's checkin.daily_intent and checkin.say_no_to
  // Display above the textarea as context
},
{
  key: "boundaries_check", // NEW
  label: "🛡️ Boundary Protection",
  placeholder: "Did you protect your boundaries today? Where did you get pulled off course?",
},
{
  key: "energy_reality",
  label: "⚡ Energy Reality Check",
  placeholder: "How did your actual energy match what you expected today?",
},
```

### Weekly Reflection (Enhanced)

```typescript
{
  key: "values_alignment",
  label: "❤️ Values Alignment",
  placeholder: "Did your actions this week align with what matters most? Where did you live your values, and where did you drift?",
  // NEW: Pull core_values and display as context
},
{
  key: "focus_mode_breakdown", // NEW
  label: "🧠 Time by Focus Mode",
  placeholder: "How did you spend your focus time this week? Were you in the right mode at the right time?",
  // NEW: Pull focus_sessions aggregated by focus_mode
},
{
  key: "life_lane_balance", // NEW
  label: "🛤️ Life Lane Balance",
  placeholder: "How did you distribute your energy across life lanes? Any lanes neglected?",
  // NEW: Pull time by Life Lane (War Map category)
},
{
  key: "rhythm_effectiveness", // NEW
  label: "⏰ Weekly Rhythm Effectiveness",
  placeholder: "Did you work during your high-energy blocks? Any adjustments needed?",
  // NEW: Compare focus_sessions to weekly_rhythms
},
```

---

## Dashboard Layout Recommendations

### Current Order:
1. North Star
2. Core Values
3. Weekly Rhythm
4. Daily Intent
5. Quick Start Guide
6. Spotify/Google Calendar banners
7. Today's Focus (checkin)
8. Active Tasks
9. Today's Check-ins
10. Today's Schedule
11. Recent Journals

### Proposed Order (Grouped by Purpose):

```
┌─────────────────────────────────────────────────────────────────┐
│  ALIGNMENT SECTION                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  North Star (life vision)                               │   │
│  │  What Matters Most (core values)                        │   │
│  │  Daily Intent (today's focus)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ENERGY & RHYTHM SECTION                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Weekly Rhythm (today's energy)                         │   │
│  │  Today's Focus (checkin priority)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ACTION SECTION                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Today's Schedule (with Focus Mode indicators)          │   │
│  │  Active Tasks (grouped by Focus Mode)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  INSIGHTS SECTION                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Focus Stats (time by mode this week)                   │   │
│  │  Recent Journals + Reflections                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SETUP SECTION (collapsible)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Quick Start Guide                                       │   │
│  │  Spotify/Google Calendar integrations                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Missing Pieces

### 1. Intent Completion Feedback Loop
**Problem:** Daily intents are set but never closed
**Solution:** 
- Evening reflection pulls today's intent
- User marks: Completed / Partially / Not Done
- Weekly analytics show completion rate

### 2. Energy Reality vs Expected
**Problem:** Weekly Rhythm is aspirational, no feedback on actual energy
**Solution:**
- Check-in energy_level could train rhythm suggestions
- Weekly reflection asks "How did your energy match expectations?"

### 3. Focus Mode Attribution
**Problem:** Tasks have focus_mode but focus sessions don't inherit it
**Solution:**
- When linking task to focus session, copy focus_mode to session
- Allows aggregation by mode even if task changes

### 4. Life Lane Time Tracking
**Problem:** War Map categories exist but time isn't tracked per category
**Solution:**
- Sum focus session durations by linked war_map_item category
- Show as "Where your time went" pie chart

### 5. Boundaries Persistence
**Problem:** `say_no_to` is daily ephemeral, patterns lost
**Solution:**
- Boundaries table for recurring "no" items
- Check-in shows "Your boundaries: X, Y, Z"
- Reflection tracks violations

---

## Recommended Implementation Order for P2 Features

### Boundaries First (Lower complexity)
1. Boundaries are a natural extension of `say_no_to`
2. Creates a new data model but doesn't require analytics
3. Can be implemented with minimal UI changes
4. Provides immediate value in check-in and reflection

### Life Lanes Second (Higher complexity)
1. Requires renaming War Map concepts throughout
2. Needs analytics aggregation for balance view
3. More complex UI (charts, category management)
4. Depends on focus session → war map item linking

---

## Quick Wins (Can Do Today)

1. **Add North Star/Values to Check-in** - Query in check-in flow, display in step 1
2. **Show current energy in Focus Timer** - Add WeeklyRhythmSummary-style display
3. **Link intent to evening reflection** - Pull today's checkin in reflections.ts
4. **Add Focus Mode badges to dashboard tasks** - Small visual enhancement
5. **Group tasks by Focus Mode in dashboard** - Filter/group UI update

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Daily Intent Set Rate | ~60% | 85% |
| Focus Sessions per Week | ~3 | 10+ |
| Values Referenced in Reflection | ~20% | 50% |
| Tasks with Focus Mode | ~30% | 70% |
| Weekly Rhythm Completion | N/A | Track |

---

## Summary

Priority Compass has all the right pieces but they're not yet talking to each other. The key integration points are:

1. **Alignment Context** - North Star, Values, Intent should appear together in check-in
2. **Energy Awareness** - Weekly Rhythm should influence Focus Timer suggestions
3. **Intent Completion** - Morning intent should connect to evening reflection
4. **Focus Analytics** - Time spent by Focus Mode and Life Lane should be visible
5. **Boundaries Loop** - Persistent patterns to protect, tracked in reflections

Implementing these connections transforms Priority Compass from a collection of features into a cohesive practice that helps users live intentionally.