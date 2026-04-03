import { supabase } from "@/lib/supabase";
import { FocusSession } from "@/types";

export async function getFocusSessions(
  userId: string,
  options?: {
    taskId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<FocusSession[]> {
  let query = supabase
    .from("focus_sessions")
    .select("*, tasks(id, title, project_id)")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (options?.taskId) {
    query = query.eq("task_id", options.taskId);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.startDate) {
    query = query.gte("started_at", options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte("started_at", options.endDate.toISOString());
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching focus sessions:", error);
    return [];
  }

  return data || [];
}

export async function getTodayFocusMinutes(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("duration")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("started_at", today.toISOString());

  if (error || !data) {
    return 0;
  }

  return data.reduce((sum, session) => sum + session.duration, 0);
}

export async function getFocusTimeByTask(
  userId: string
): Promise<Map<string, { minutes: number; sessions: number }>> {
  const result = new Map<string, { minutes: number; sessions: number }>();

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("task_id, duration")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("task_id", "is", null);

  if (error || !data) {
    return result;
  }

  for (const session of data) {
    if (!session.task_id) continue;

    const existing = result.get(session.task_id) || { minutes: 0, sessions: 0 };
    result.set(session.task_id, {
      minutes: existing.minutes + session.duration,
      sessions: existing.sessions + 1,
    });
  }

  return result;
}

export async function createFocusSession(
  userId: string,
  options: {
    taskId?: string;
    duration: number;
    spotifyTrackId?: string;
    spotifyTrackName?: string;
    spotifyArtist?: string;
  }
): Promise<FocusSession | null> {
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: userId,
      task_id: options.taskId || null,
      duration: options.duration,
      started_at: new Date().toISOString(),
      status: "active",
      spotify_track_id: options.spotifyTrackId || null,
      spotify_track_name: options.spotifyTrackName || null,
      spotify_artist: options.spotifyArtist || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating focus session:", error);
    return null;
  }

  return data;
}

export async function updateFocusSession(
  sessionId: string,
  updates: Partial<FocusSession>
): Promise<FocusSession | null> {
  const { data, error } = await supabase
    .from("focus_sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating focus session:", error);
    return null;
  }

  return data;
}