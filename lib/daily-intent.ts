import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/utils";

export interface DailyIntent {
  id: string;
  created_at: string;
  user_id: string;
  date: string;
  time_of_day: "morning" | "midday" | "evening";
  daily_intent: string | null;
  say_no_to: string | null;
  top_priority: string;
}

/**
 * Get today's Daily Intent from checkins
 */
export async function getTodayDailyIntent(userId: string): Promise<DailyIntent | null> {
  const today = todayISO();
  
  const { data, error } = await supabase
    .from("checkins")
    .select("id, created_at, user_id, time_of_day, daily_intent, say_no_to, top_priority")
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Transform to DailyIntent format
  return {
    ...data,
    date: today,
  };
}

/**
 * Get the most recent Daily Intent (could be from today or earlier)
 */
export async function getLatestDailyIntent(userId: string): Promise<DailyIntent | null> {
  // First try to get today's
  const today = await getTodayDailyIntent(userId);
  if (today?.daily_intent) return today;

  // Then get the most recent one with daily_intent
  const { data, error } = await supabase
    .from("checkins")
    .select("id, created_at, user_id, time_of_day, daily_intent, say_no_to, top_priority")
    .eq("user_id", userId)
    .not("daily_intent", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const createdDate = new Date(data.created_at);
  const dateStr = createdDate.toISOString().split("T")[0];

  return {
    ...data,
    date: dateStr,
  };
}

/**
 * Check if today's checkin has a daily intent set
 */
export async function hasTodayIntent(userId: string): Promise<boolean> {
  const today = await getTodayDailyIntent(userId);
  return today !== null && today.daily_intent !== null && today.daily_intent.trim() !== "";
}

/**
 * Get today's Daily Intent specifically for evening reflection context
 * Only returns if it's from today (not fallback to older intents)
 */
export async function getTodayIntentForReflection(userId: string): Promise<{ daily_intent: string | null; say_no_to: string | null } | null> {
  const today = await getTodayDailyIntent(userId);
  if (!today || !today.daily_intent) return null;
  return {
    daily_intent: today.daily_intent,
    say_no_to: today.say_no_to,
  };
}