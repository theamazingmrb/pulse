import { Task } from "@/types";

interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const STORAGE_KEY = "google_calendar_credentials";

export function getGoogleCredentials(): GoogleCredentials | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setGoogleCredentials(creds: GoogleCredentials): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

export function clearGoogleCredentials(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isGoogleConnected(): boolean {
  const creds = getGoogleCredentials();
  return creds !== null;
}

export function initiateGoogleAuth(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Store state in a cookie (survives cross-site redirect on mobile)
  document.cookie = `google_oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId!);
  authUrl.searchParams.set("redirect_uri", redirectUri!);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  window.location.href = authUrl.toString();
}

export async function handleGoogleCallback(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("google_connected") !== "true") return false;

  window.history.replaceState({}, document.title, window.location.pathname);

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

  setGoogleCredentials({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return true;
}

async function getValidToken(): Promise<string | null> {
  const creds = getGoogleCredentials();
  if (!creds) return null;

  // Token still valid (with 60s buffer)
  if (Date.now() < creds.expiresAt - 60_000) {
    return creds.accessToken;
  }

  // Refresh
  try {
    const res = await fetch("/api/google/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: creds.refreshToken }),
    });

    if (!res.ok) {
      clearGoogleCredentials();
      return null;
    }

    const data = await res.json();
    setGoogleCredentials({
      ...creds,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    return data.access_token;
  } catch {
    clearGoogleCredentials();
    return null;
  }
}

// Returns GCal events for the day as locked Task objects the scheduler can treat as busy blocks
export async function getCalendarBusyBlocks(date: Date): Promise<Task[]> {
  const token = await getValidToken();
  if (!token) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", startOfDay.toISOString());
  url.searchParams.set("timeMax", endOfDay.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    void tz; // used in syncTaskToCalendar, not here

    return ((data.items as GCalEvent[]) || [])
      .filter((e) => e.start?.dateTime && e.end?.dateTime)
      .map((e): Task => ({
        id: `gcal-${e.id}`,
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
      }));
  } catch {
    return [];
  }
}

// Creates or updates a calendar event for a task. Returns the google_event_id.
export async function syncTaskToCalendar(task: Task): Promise<string | null> {
  if (!task.start_time || !task.end_time) return null;
  const token = await getValidToken();
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

export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const token = await getValidToken();
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
