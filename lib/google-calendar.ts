import { Task } from "@/types";
import { supabase } from "./supabase";

interface GoogleCredentials {
  accessToken: string;
  expiresAt: number; // ms timestamp
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface GoogleAccount {
  id: string;
  google_email: string;
  connected_at: string;
  is_primary: boolean;
}

// Memory cache for the current session (avoids repeated API calls)
let cachedAccounts: GoogleAccount[] | null = null;

// Per-account in-memory token cache
const _memoryCredentials = new Map<string, GoogleCredentials>();

/**
 * Check which Google accounts are connected for the current user
 */
export async function isGoogleConnectedAsync(): Promise<{ connected: boolean; accounts: GoogleAccount[] }> {
  if (cachedAccounts) {
    return { connected: cachedAccounts.length > 0, accounts: cachedAccounts };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { connected: false, accounts: [] };
  }

  try {
    const res = await fetch("/api/google/tokens", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      return { connected: false, accounts: [] };
    }

    const data = await res.json();
    cachedAccounts = (data.accounts ?? []) as GoogleAccount[];
    return { connected: cachedAccounts.length > 0, accounts: cachedAccounts };
  } catch {
    return { connected: false, accounts: [] };
  }
}

/**
 * Synchronous check - returns cached value or false
 */
export function isGoogleConnected(): boolean {
  return (cachedAccounts?.length ?? 0) > 0;
}

/**
 * Store Google tokens for a new account after OAuth callback
 */
export async function saveGoogleCredentials(
  refreshToken: string,
  accessToken: string,
  expiresIn: number,
  email?: string
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.error("No session for saving Google credentials");
    return false;
  }

  try {
    const res = await fetch("/api/google/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken, email }),
    });

    if (!res.ok) {
      console.error("Failed to save Google credentials");
      return false;
    }

    // Invalidate the account cache so it refetches
    cachedAccounts = null;

    // Store access token in memory for this session (keyed by email as a stand-in)
    _memoryCredentials.set(email ?? "default", {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    return true;
  } catch (err) {
    console.error("Error saving Google credentials:", err);
    return false;
  }
}

/**
 * Disconnect a specific Google account (or all if no id given)
 */
export async function disconnectGoogleCalendar(accountId?: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return false;

  try {
    const url = accountId ? `/api/google/tokens?id=${encodeURIComponent(accountId)}` : "/api/google/tokens";
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) return false;

    cachedAccounts = null;
    _memoryCredentials.clear();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a valid access token for a specific account (refreshing if needed)
 */
async function getValidToken(accountId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  // Check if we have a valid cached token
  const cached = _memoryCredentials.get(accountId);
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.accessToken;
  }

  // Refresh the token
  try {
    const res = await fetch("/api/google/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_id: accountId }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token revoked or expired - clear connection
        _memoryCredentials.delete(accountId);
        cachedAccounts = null;
      }
      return null;
    }

    const data = await res.json();

    // Cache the new token
    _memoryCredentials.set(accountId, {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Initiate Google OAuth flow
 * Returns an error message if OAuth isn't configured, or null if the redirect started.
 */
export function initiateGoogleAuth(): string | null {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientId || clientId.startsWith("your-") || clientId.length < 20) {
    return "Google Calendar isn't configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_REDIRECT_URI to your environment.";
  }
  if (!redirectUri || redirectUri.startsWith("your-") || !redirectUri.startsWith("http")) {
    return "Google Calendar isn't configured. Set NEXT_PUBLIC_GOOGLE_REDIRECT_URI to your callback URL.";
  }

  // Generate state for CSRF protection
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Store state in cookie (survives cross-site redirect on mobile)
  document.cookie = `google_oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  window.location.href = authUrl.toString();
  return null;
}

/**
 * Handle OAuth callback - process tokens from cookie and save to database
 */
export async function handleGoogleCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("google_connected") !== "true") return false;

  // Clean up URL early
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    const res = await fetch("/api/google/session");
    if (!res.ok) return false;

    const data = await res.json();

    // Read state from cookie (survives mobile redirect)
    const getCookie = (name: string): string | null => {
      const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
      return match ? match[2] : null;
    };

    const expectedState = getCookie("google_oauth_state");
    document.cookie = "google_oauth_state=; path=/; max-age=0"; // Clear cookie

    if (!expectedState || data.state !== expectedState) {
      console.error("Google OAuth state mismatch — possible CSRF");
      return false;
    }

    // Save to database
    const success = await saveGoogleCredentials(
      data.refresh_token,
      data.access_token,
      data.expires_in,
      data.email
    );

    return success;
  } catch (err) {
    console.error("Error processing Google callback:", err);
    return false;
  }
}

/**
 * Get calendar events as locked "busy blocks" for scheduling, aggregated across all connected accounts
 */
export async function getCalendarBusyBlocks(date: Date): Promise<Task[]> {
  const { connected, accounts } = await isGoogleConnectedAsync();
  if (!connected || accounts.length === 0) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const allEvents: Task[] = [];

  for (const account of accounts) {
    const token = await getValidToken(account.id);
    if (!token) continue;

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", startOfDay.toISOString());
    url.searchParams.set("timeMax", endOfDay.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");

    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) continue;

      const data = await res.json();

      const events = ((data.items as GCalEvent[]) || [])
        .filter((e) => e.start?.dateTime && e.end?.dateTime)
        .map((e): Task => ({
          id: `gcal-${account.id}-${e.id}`,
          user_id: "",
          title: e.summary || "Calendar Event",
          description: null,
          status: "active",
          project_id: null,
          notes: null,
          due_date: null,
          image_url: null,
          priority_level: 2,
          scheduling_mode: "manual",
          estimated_duration: Math.round(
            (new Date(e.end.dateTime!).getTime() - new Date(e.start.dateTime!).getTime()) / 60_000
          ),
          start_time: e.start.dateTime!,
          end_time: e.end.dateTime!,
          locked: true,
          google_event_id: e.id,
          created_at: "",
          updated_at: "",
          focus_mode: null,
          recurrence_type: null,
          recurrence_interval: 1,
          recurrence_end_date: null,
          recurrence_weekdays: null,
          parent_task_id: null,
          skipped_dates: null,
          is_recurrence_template: false,
        }));

      allEvents.push(...events);
    } catch {
      // Skip this account on failure
    }
  }

  return allEvents;
}

/**
 * Create or update a calendar event for a task (on the primary account)
 */
export async function syncTaskToCalendar(task: Task): Promise<string | null> {
  if (!task.start_time || !task.end_time) return null;

  const { connected, accounts } = await isGoogleConnectedAsync();
  if (!connected || accounts.length === 0) return null;

  const primary = accounts.find((a) => a.is_primary) ?? accounts[0];
  const token = await getValidToken(primary.id);
  if (!token) return null;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: task.title,
    ...(task.description ? { description: task.description } : {}),
    start: { dateTime: task.start_time, timeZone: tz },
    end: { dateTime: task.end_time, timeZone: tz },
  };

  try {
    if (task.google_event_id) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.google_event_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) return null;
      return task.google_event_id;
    } else {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.id as string;
    }
  } catch {
    return null;
  }
}

/**
 * Delete a calendar event (on the primary account)
 */
export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const { connected, accounts } = await isGoogleConnectedAsync();
  if (!connected || accounts.length === 0) return;

  const primary = accounts.find((a) => a.is_primary) ?? accounts[0];
  const token = await getValidToken(primary.id);
  if (!token) return;

  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    // Best-effort deletion
  }
}
