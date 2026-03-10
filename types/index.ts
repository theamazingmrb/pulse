export type TaskStatus = "active" | "waiting" | "someday" | "done";
export type SessionLabel = "morning" | "afternoon" | "evening" | "general";
export type TimeOfDay = "morning" | "midday" | "evening";

export interface Task {
  id: string;
  created_at: string;
  title: string;
  status: TaskStatus;
  project: string | null;
  notes: string | null;
  due_date: string | null;
}

export interface SpotifyUser {
  id: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album_art: string;
  preview_url: string | null;
  spotify_url: string;
  uri: string;
}

export interface Journal {
  id: string;
  created_at: string;
  date: string;
  session_label: SessionLabel;
  title: string | null;
  content: string;
  mood: string | null;
  spotify_track_id: string | null;
  spotify_track_name: string | null;
  spotify_artist: string | null;
  spotify_album_art: string | null;
  spotify_preview_url: string | null;
  spotify_url: string | null;
  tasks?: Task[];
}

export interface Checkin {
  id: string;
  created_at: string;
  time_of_day: TimeOfDay | null;
  top_priority: string;
  other_priorities: string[] | null;
  context: string | null;
  energy_level: number | null;
}

export const PROJECT_OPTIONS = [
  "GA",
  "Smart Trader",
  "Simmr",
  "That Aisle",
  "Finance & Admin",
  "Personal",
] as const;

export type Project = (typeof PROJECT_OPTIONS)[number];
