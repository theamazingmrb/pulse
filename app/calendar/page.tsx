"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/auth-guard";
import { Task } from "@/types";
import { supabase } from "@/lib/supabase";
import { PRIORITY_CONFIG } from "@/lib/tasks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(ws: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function taskTopPx(startTime: string): number {
  const start = new Date(startTime);
  const minutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
  return Math.max(0, minutes) * (HOUR_HEIGHT / 60);
}

function taskHeightPx(duration: number): number {
  return Math.max(20, duration * (HOUR_HEIGHT / 60));
}

function getNowTopPx(): number {
  const now = new Date();
  const minutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  return minutes * (HOUR_HEIGHT / 60);
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDayIdx, setActiveDayIdx] = useState(() => new Date().getDay());
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const today = useMemo(() => new Date(), []);
  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const nowPx = getNowTopPx();
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today));
  const showNowLine = isCurrentWeek && nowPx >= 0 && nowPx <= totalHeight;

  useEffect(() => {
    if (user) loadTasks(user.id);
  }, [user, weekStart, loadTasks]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowPx - 120);
    }
  }, [loading, nowPx]);

  async function loadTasks(userId: string) {
    setLoading(true);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [{ data: scheduled }, { data: dueTasks }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, projects(id, name, color, status)")
        .eq("user_id", userId)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString()),
      supabase
        .from("tasks")
        .select("*, projects(id, name, color, status)")
        .eq("user_id", userId)
        .is("start_time", null)
        .gte("due_date", weekStart.toISOString().split("T")[0])
        .lt("due_date", weekEnd.toISOString().split("T")[0])
        .neq("status", "done"),
    ]);

    const merged = [...(scheduled || []), ...(dueTasks || [])];
    const unique = Array.from(new Map(merged.map((t) => [t.id, t])).values());
    setTasks(unique.map((t) => ({ ...t, project: t.projects || null })));
    setLoading(false);
  }

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()));
    setActiveDayIdx(new Date().getDay());
  }

  function scheduledForDay(day: Date): Task[] {
    return tasks
      .filter((t) => t.start_time && isSameDay(new Date(t.start_time), day))
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());
  }

  function dueForDay(day: Date): Task[] {
    return tasks.filter(
      (t) => !t.start_time && t.due_date && isSameDay(new Date(t.due_date), day)
    );
  }

  const weekLabel = (() => {
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  })();

  function renderDayColumn(day: Date, isMobile = false) {
    const isToday = isSameDay(day, today);
    const scheduled = scheduledForDay(day);
    const due = dueForDay(day);

    return (
      <div
        className="relative border-l border-border flex-1"
        style={{ height: `${totalHeight}px` }}
      >
        {/* Hour lines */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/30"
            style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
          />
        ))}

        {/* Due-date tasks (no start_time) — shown as chips near top */}
        {due.length > 0 && (
          <div className="absolute inset-x-1 top-1 z-10 flex flex-col gap-0.5">
            {due.map((task) => {
              const cfg = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
              return (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <div
                    className="text-[9px] px-1 py-0.5 rounded truncate font-medium border"
                    style={{
                      backgroundColor: `${cfg?.color}22`,
                      borderColor: `${cfg?.color}44`,
                      color: cfg?.color,
                    }}
                  >
                    due: {task.title}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Scheduled tasks */}
        {scheduled.map((task) => {
          const cfg = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
          const top = taskTopPx(task.start_time!);
          const height = taskHeightPx(task.estimated_duration ?? 30);
          return (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <div
                className="absolute inset-x-1 rounded overflow-hidden cursor-pointer hover:brightness-110 transition-all border"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: `${cfg?.color}22`,
                  borderColor: `${cfg?.color}55`,
                  borderLeftColor: cfg?.color,
                  borderLeftWidth: "3px",
                }}
              >
                <div className={cn("p-1", isMobile && "p-1.5")}>
                  <p
                    className="text-[10px] font-semibold leading-tight truncate"
                    style={{ color: cfg?.color }}
                  >
                    {task.title}
                  </p>
                  {height >= 40 && task.start_time && (
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                      {formatTime(task.start_time)}
                      {task.end_time && ` – ${formatTime(task.end_time)}`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Current time indicator */}
        {isToday && showNowLine && (
          <div
            className="absolute inset-x-0 flex items-center z-20 pointer-events-none"
            style={{ top: `${nowPx}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
            <div className="flex-1 h-px bg-red-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <AuthGuard>
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight size={14} />
          </Button>
          <span className="text-sm font-semibold flex-1 text-center">{weekLabel}</span>
          {isCurrentWeek ? (
            <div className="w-16" />
          ) : (
            <Button variant="ghost" size="sm" className="text-xs h-8 w-16" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>

        {/* Mobile: day tab strip */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-2 no-scrollbar">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isActive = i === activeDayIdx;
            const hasTasks =
              scheduledForDay(day).length > 0 || dueForDay(day).length > 0;
            return (
              <button
                key={i}
                onClick={() => setActiveDayIdx(i)}
                className={cn(
                  "flex flex-col items-center min-w-[44px] px-2 py-1.5 rounded-lg transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <span className="text-[10px]">{DAY_SHORT[day.getDay()]}</span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    isToday && !isActive && "text-primary"
                  )}
                >
                  {day.getDate()}
                </span>
                <div
                  className={cn(
                    "w-1 h-1 rounded-full mt-0.5",
                    hasTasks
                      ? isActive
                        ? "bg-primary-foreground"
                        : "bg-primary"
                      : "invisible"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Calendar grid */}
        <div className="border border-border rounded-lg overflow-hidden relative">
          {/* Desktop: sticky day headers */}
          <div className="hidden md:flex border-b border-border bg-muted/30">
            <div className="w-12 flex-shrink-0" />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={i}
                  className="flex-1 min-w-[80px] flex flex-col items-center py-2 border-l border-border"
                >
                  <span
                    className={cn(
                      "text-xs",
                      isToday ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {DAY_SHORT[day.getDay()]}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div
            ref={scrollRef}
            className="overflow-y-auto h-[calc(100vh-260px)] md:h-[calc(100vh-210px)]"
          >
            <div className="flex" style={{ minHeight: `${totalHeight}px` }}>
              {/* Time labels column */}
              <div
                className="w-12 flex-shrink-0 relative bg-background"
                style={{ height: `${totalHeight}px` }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2 tabular-nums select-none"
                    style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                  >
                    {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                  </div>
                ))}
              </div>

              {/* Desktop: all 7 day columns */}
              <div className="hidden md:flex flex-1">
                {weekDays.map((day, i) => (
                  <div key={i} className="flex-1 min-w-[80px]">
                    {renderDayColumn(day)}
                  </div>
                ))}
              </div>

              {/* Mobile: single active day */}
              <div className="md:hidden flex-1">
                {renderDayColumn(weekDays[activeDayIdx], true)}
              </div>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
