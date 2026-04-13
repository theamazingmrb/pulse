export type TaskStatus = "active" | "waiting" | "someday" | "done";
export type ReflectionType = "daily" | "weekly" | "monthly";
export type FocusMode = "deep" | "quick" | "planning" | "admin";
export type EnergyLevel = "high" | "medium" | "low";
export type TimeBlock = "morning" | "afternoon" | "evening";
export type RhythmPreset = "makers_schedule" | "night_owl" | "balanced";

export const FOCUS_MODE_CONFIG: Record<FocusMode, { label: string; color: string; description: string; suggestion: string }> = {
  deep: {
    label: "Deep",
    color: "#8B5CF6", // Purple
    description: "Full creative attention",
    suggestion: "Block 1-2 hours. Turn off notifications."
  },
  quick: {
    label: "Quick",
    color: "#22C55E", // Green
    description: "Under 15 minutes",
    suggestion: "Batch these together. Knock them out fast."
  },
  planning: {
    label: "Planning",
    color: "#3B82F6", // Blue
    description: "Organizing & strategizing",
    suggestion: "Good for morning energy or end-of-day review."
  },
  admin: {
    label: "Admin",
    color: "#6B7280", // Gray
    description: "Logistical, repetitive tasks",
    suggestion: "Save for low-energy periods."
  }
};

export interface Reflection {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  type: ReflectionType;
  period_start: string;
  title: string | null;
  sections: Record<string, string>;
  mood: string | null;
  energy_level: number | null;
  accomplished_intent: boolean | null;
}

export interface ReflectionStreak {
  user_id: string;
  type: ReflectionType;
  current_streak: number;
  longest_streak: number;
  last_completed_period: string | null;
}
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

export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

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
  google_event_id?: string | null;
  // Focus mode (optional)
  focus_mode: FocusMode | null;
  // Recurrence fields
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  recurrence_weekdays: number[] | null;
  parent_task_id: string | null;
  skipped_dates: string[] | null;
  is_recurrence_template: boolean;
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
  image_urls?: string[] | null;
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
  daily_intent: string | null;
  say_no_to: string | null;
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

export interface WarMapCategory {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
  items?: WarMapItem[];
}

export interface WarMapItem {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "abandoned";
  target_date: string | null;
  sort_order: number;
  north_star_alignment: string | null;
  tasks?: Task[];
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

// Focus Session types
export type FocusSessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface FocusSession {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  task_id: string | null;
  duration: number; // planned duration in minutes
  started_at: string;
  completed_at: string | null;
  status: FocusSessionStatus;
  spotify_playlist_id: string | null;
  spotify_playlist_name: string | null;
  spotify_track_id: string | null;
  spotify_track_name: string | null;
  spotify_artist: string | null;
  journal_id: string | null;
  notes: string | null;
  task?: Task | null;
}

export interface FocusTimerPreset {
  label: string;
  minutes: number;
  description: string;
}

// North Star (Life Vision)
export interface NorthStar {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  content: string;
}

// Core Values (What Matters Most)
export interface CoreValue {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  value_text: string;
  value_order: number;
}

// Weekly Rhythm (Energy & Focus Preferences)
export interface WeeklyRhythm {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  time_block: TimeBlock;
  energy_level: EnergyLevel;
  focus_mode: FocusMode;
  notes: string | null;
}

export const RHYTHM_PRESETS: Record<RhythmPreset, { name: string; description: string }> = {
  makers_schedule: {
    name: "Maker's Schedule",
    description: "Mornings for deep work, afternoons for admin. Best for creators and builders."
  },
  night_owl: {
    name: "Night Owl",
    description: "Evening peak energy. Deep work happens after the world quiets down."
  },
  balanced: {
    name: "Balanced",
    description: "Mix of energy throughout the day. Flexible scheduling for varied work."
  }
};
