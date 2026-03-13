export type TaskStatus = "active" | "waiting" | "someday" | "done";
export type SessionLabel = "morning" | "afternoon" | "evening" | "general";
export type TimeOfDay = "morning" | "midday" | "evening";
export type PriorityLabel = "Hot" | "Warm" | "Cool" | "Cold";
export type SchedulingMode = "manual" | "auto";
export type ProjectStatus = "active" | "completed" | "archived" | "on_hold";

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  image_url: string | null;
  banner_url: string | null;
}

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  project_id: string | null;
  project?: Project | null;
  notes: string | null;
  due_date: string | null;
  image_url: string | null;
  // Scheduling fields
  priority_level: number; // 1-4 (1=Hot, 4=Cold)
  scheduling_mode: SchedulingMode;
  estimated_duration: number; // minutes
  start_time: string | null;
  end_time: string | null;
  locked: boolean;
}

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
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
  album_art: string | null;
  preview_url: string | null;
  spotify_url: string;
  uri: string;
}

export interface Journal {
  id: string;
  created_at: string;
  updated_at: string;
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
  updated_at: string;
  time_of_day: TimeOfDay | null;
  top_priority: string;
  other_priorities: string[] | null;
  context: string | null;
  energy_level: number | null;
}

export interface SpotifyPlaylist {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  spotify_id: string;
  name: string;
  description: string | null;
  external_url: string;
  last_synced: string | null;
  auto_sync: boolean;
  track_count: number;
}

// Legacy - will be removed once projects are fully database-driven
export const PROJECT_OPTIONS = [
  "GA",
  "Smart Trader",
  "Simmr",
  "That Aisle",
  "Finance & Admin",
  "Personal",
] as const;

export type LegacyProject = (typeof PROJECT_OPTIONS)[number];
