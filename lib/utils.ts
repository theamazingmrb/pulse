import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TimeOfDay, SessionLabel } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

export function getSessionLabel(): SessionLabel {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function getGreeting(name = "BJ"): string {
  const tod = getTimeOfDay();
  const greetings: Record<TimeOfDay, string> = {
    morning: `Good morning, ${name}`,
    midday: `Hey ${name}`,
    evening: `Evening, ${name}`,
  };
  return greetings[tod];
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export const SESSION_EMOJI: Record<SessionLabel, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
  general: "📝",
};

export const PROJECT_COLORS: Record<string, string> = {
  GA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Smart Trader": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Simmr: "bg-green-500/10 text-green-400 border-green-500/20",
  "That Aisle": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Finance & Admin": "bg-red-500/10 text-red-400 border-red-500/20",
  Personal: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  waiting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  someday: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  done: "bg-green-500/10 text-green-400 border-green-500/20",
};
