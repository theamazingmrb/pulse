import { supabase } from "@/lib/supabase";
import { Reflection, ReflectionStreak, ReflectionType } from "@/types";

// ── Prompts ──────────────────────────────────────────────────────────────────

export interface ReflectionPrompt {
  key: string;
  label: string;
  placeholder: string;
}

export const REFLECTION_PROMPTS: Record<ReflectionType, ReflectionPrompt[]> = {
  daily: [
    {
      key: "accomplishments",
      label: "🏆 Accomplishments",
      placeholder: "What did I get done today? Big or small, write it down.",
    },
    {
      key: "intent_check",
      label: "🎯 Daily Intent Check",
      placeholder: "Did you accomplish what you committed to today? What about what you said NO to?",
    },
    {
      key: "gratitude",
      label: "🙏 Gratitude",
      placeholder: "What am I grateful for right now?",
    },
    {
      key: "improvements",
      label: "💡 What could be better",
      placeholder: "Where did I fall short or lose focus today?",
    },
    {
      key: "tomorrow",
      label: "🎯 Tomorrow's intention",
      placeholder: "What's my #1 focus for tomorrow? What do I commit to?",
    },
  ],
  weekly: [
    {
      key: "wins",
      label: "🏆 Biggest wins",
      placeholder: "What were my biggest wins this week? What moved the needle?",
    },
    {
      key: "blockers",
      label: "🚧 What held me back",
      placeholder: "What friction, blockers, or distractions did I face?",
    },
    {
      key: "warmap_progress",
      label: "🗺️ WarMap progress",
      placeholder: "How did I move toward my year goals? Which items progressed?",
    },
    {
      key: "values_alignment",
      label: "❤️ Values alignment",
      placeholder: "Did your actions this week align with what matters most? Where did you live your values, and where did you drift?",
    },
    {
      key: "next_week",
      label: "🔭 Next week focus",
      placeholder: "What will I prioritize next week? What must get done?",
    },
  ],
  monthly: [
    {
      key: "vision",
      label: "🌟 Where I want to be",
      placeholder:
        "Paint the picture of where you want to be. Be honest with yourself — where are you headed?",
    },
    {
      key: "improve",
      label: "📈 Areas to improve",
      placeholder:
        "Where do you need to level up? What skills, habits, or mindsets need work?",
    },
    {
      key: "not_giving_all",
      label: "⚡ Not giving my all",
      placeholder:
        "Where haven't you been showing up 100%? Be real with yourself.",
    },
    {
      key: "top_goals",
      label: "🎯 Top 3 goals",
      placeholder:
        "What are your top 3 goals for 2026? These can be new goals or existing WarMap items.",
    },
    {
      key: "overall",
      label: "📝 Overall reflection",
      placeholder: "Anything else on your mind? A note to your future self.",
    },
  ],
};

export const REFLECTION_LABELS: Record<ReflectionType, { label: string; color: string; bg: string }> = {
  daily: { label: "Daily", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  weekly: { label: "Weekly", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  monthly: { label: "Monthly", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

// ── Period helpers ────────────────────────────────────────────────────────────

/** Returns the ISO date string for the start of the period containing `date` */
export function getPeriodStart(type: ReflectionType, date?: Date): string {
  const d = date ?? new Date();
  if (type === "daily") {
    return localDateISO(d);
  }
  if (type === "weekly") {
    // Normalize to Monday of the current week
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return localDateISO(monday);
  }
  // monthly → 1st of the month
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/** Returns a human-readable label for the period */
export function getPeriodLabel(type: ReflectionType, periodStart: string): string {
  const today = localDateISO(new Date());
  if (type === "daily") {
    if (periodStart === today) return "Today";
    const yesterday = localDateISO(new Date(Date.now() - 86400000));
    if (periodStart === yesterday) return "Yesterday";
    return new Date(periodStart + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (type === "weekly") {
    const start = new Date(periodStart + "T12:00:00");
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const thisWeek = getPeriodStart("weekly");
    if (periodStart === thisWeek) return "This Week";
    return `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  // monthly
  const d = new Date(periodStart + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function localDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousPeriod(type: ReflectionType, periodStart: string): string {
  const d = new Date(periodStart + "T12:00:00");
  if (type === "daily") {
    d.setDate(d.getDate() - 1);
    return localDateISO(d);
  }
  if (type === "weekly") {
    d.setDate(d.getDate() - 7);
    return localDateISO(d);
  }
  // monthly
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getReflections(
  userId: string,
  type?: ReflectionType
): Promise<Reflection[]> {
  let query = supabase
    .from("reflections")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data } = await query;
  return (data as Reflection[]) ?? [];
}

export async function getReflectionById(id: string): Promise<Reflection | null> {
  const { data } = await supabase
    .from("reflections")
    .select("*")
    .eq("id", id)
    .single();
  return data as Reflection | null;
}

export async function getReflectionForPeriod(
  userId: string,
  type: ReflectionType,
  periodStart: string
): Promise<Reflection | null> {
  const { data } = await supabase
    .from("reflections")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("period_start", periodStart)
    .maybeSingle();
  return data as Reflection | null;
}

export async function saveReflection(
  userId: string,
  type: ReflectionType,
  periodStart: string,
  sections: Record<string, string>,
  mood: string | null,
  energyLevel: number | null,
  accomplishedIntent: boolean | null = null
): Promise<Reflection | null> {
  const { data, error } = await supabase
    .from("reflections")
    .upsert(
      {
        user_id: userId,
        type,
        period_start: periodStart,
        sections,
        mood,
        energy_level: energyLevel,
        accomplished_intent: accomplishedIntent,
      },
      { onConflict: "user_id,type,period_start" }
    )
    .select()
    .single();

  if (error || !data) return null;

  await upsertStreak(userId, type, periodStart);
  return data as Reflection;
}

export async function deleteReflection(id: string): Promise<void> {
  await supabase.from("reflections").delete().eq("id", id);
}

// ── Streaks ───────────────────────────────────────────────────────────────────

export async function getStreaks(userId: string): Promise<ReflectionStreak[]> {
  const { data } = await supabase
    .from("reflection_streaks")
    .select("*")
    .eq("user_id", userId);
  return (data as ReflectionStreak[]) ?? [];
}

export async function upsertStreak(
  userId: string,
  type: ReflectionType,
  periodStart: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("reflection_streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle();

  const prev = getPreviousPeriod(type, periodStart);

  let currentStreak: number;
  let longestStreak: number;

  if (!existing) {
    currentStreak = 1;
    longestStreak = 1;
  } else if (existing.last_completed_period === periodStart) {
    // Already recorded this period — no change
    return;
  } else if (existing.last_completed_period === prev) {
    // Consecutive period — extend streak
    currentStreak = existing.current_streak + 1;
    longestStreak = Math.max(existing.longest_streak, currentStreak);
  } else {
    // Streak broken — reset
    currentStreak = 1;
    longestStreak = Math.max(existing.longest_streak ?? 0, 1);
  }

  await supabase.from("reflection_streaks").upsert(
    {
      user_id: userId,
      type,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_period: periodStart,
    },
    { onConflict: "user_id,type" }
  );
}

// ── Reminder logic ────────────────────────────────────────────────────────────

export interface PendingReminder {
  type: ReflectionType;
  periodStart: string;
  message: string;
  isEvening: boolean;
}

/** Returns the highest-priority pending reminder, or null if none. */
export async function getPendingReminder(
  userId: string
): Promise<PendingReminder | null> {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun
  const dayOfMonth = now.getDate();

  // Monthly: show on days 1–3 if last month's reflection is missing
  if (dayOfMonth <= 3) {
    const lastMonthStart = getPreviousPeriod("monthly", getPeriodStart("monthly"));
    const existing = await getReflectionForPeriod(userId, "monthly", lastMonthStart);
    if (!existing) {
      return {
        type: "monthly",
        periodStart: lastMonthStart,
        message: "It's a new month — time for your monthly self-reflection.",
        isEvening: false,
      };
    }
  }

  // Weekly: show on Sunday or Monday if last week's reflection is missing
  if (dayOfWeek === 0 || dayOfWeek === 1) {
    const lastWeekStart = getPreviousPeriod("weekly", getPeriodStart("weekly"));
    const existing = await getReflectionForPeriod(userId, "weekly", lastWeekStart);
    if (!existing) {
      return {
        type: "weekly",
        periodStart: lastWeekStart,
        message: "New week, new start — complete last week's reflection.",
        isEvening: false,
      };
    }
  }

  // Daily morning (before noon): remind if yesterday's reflection is missing
  if (hour < 12) {
    const yesterday = getPreviousPeriod("daily", getPeriodStart("daily"));
    const existing = await getReflectionForPeriod(userId, "daily", yesterday);
    if (!existing) {
      return {
        type: "daily",
        periodStart: yesterday,
        message: "Have you reflected on yesterday? Take 2 minutes to check in.",
        isEvening: false,
      };
    }
  }

  // Daily evening (6pm+): remind to wrap up today
  if (hour >= 18) {
    const today = getPeriodStart("daily");
    const existing = await getReflectionForPeriod(userId, "daily", today);
    if (!existing) {
      return {
        type: "daily",
        periodStart: today,
        message: "Time to wrap up your day — write your daily reflection.",
        isEvening: true,
      };
    }
  }

  return null;
}
