"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/auth-guard";
import { Task } from "@/types";
import { supabase } from "@/lib/supabase";
import { PRIORITY_CONFIG } from "@/lib/tasks";
import { getCalendarBusyBlocks, isGoogleConnected } from "@/lib/google-calendar";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
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
  const [googleEvents, setGoogleEvents] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDayIdx, setActiveDayIdx] = useState(() => new Date().getDay());
  const scrollRef = useRef<HTMLDivElement>(null);
  const googleConnected = isGoogleConnected();

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const today = useMemo(() => new Date(), []);
  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const nowPx = getNowTopPx();
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today));
  const showNowLine = isCurrentWeek && nowPx >= 0 && nowPx <= totalHeight;

  const loadAllEvents = useCallback(async (userId: string) => {
    setLoading(true);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Fetch tasks from Supabase
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

    // Fetch Google Calendar events for each day in the week
    if (isGoogleConnected()) {
      const allGCalEvents: Task[] = [];
      for (const day of getWeekDays(weekStart)) {
        try {
          const events = await getCalendarBusyBlocks(day);
          allGCalEvents.push(...events);
        } catch (err) {
          console.error("Failed to fetch Google Calendar events for", day, err);
        }
      }
      setGoogleEvents(allGCalEvents);
    }

    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    if (user) loadAllEvents(user.id);
  }, [user, loadAllEvents]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowPx - 120);
    }
  }, [loading, nowPx]);

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
    const dayTasks = tasks
      .filter((t) => t.start_time && isSameDay(new Date(t.start_time), day))
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());

    const dayGCal = googleEvents
      .filter((e) => e.start_time && isSameDay(new Date(e.start_time), day))
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());

    return [...dayTasks, ...dayGCal];
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

        {/* Scheduled tasks and Google Calendar events */}
        {scheduled.map((event) => {
          const isGCalEvent = event.id.startsWith("gcal-");
          const top = taskTopPx(event.start_time!);
          const height = taskHeightPx(event.estimated_duration ?? 30);

          // Google Calendar events get a distinct blue-gray style
          const eventColor = isGCalEvent ? "#6366f1" : (PRIORITY_CONFIG[event.priority_level as keyof typeof PRIORITY_CONFIG]?.color || "#6b7280");

          const content = (
            <div
              className="absolute inset-x-1 rounded overflow-hidden cursor-pointer hover:brightness-110 transition-all border"
              style={{
                top: `${top}px`,
                height: `${height}px`,
                backgroundColor: `${eventColor}22`,
                borderColor: `${eventColor}55`,
                borderLeftColor: eventColor,
                borderLeftWidth: "3px",
              }}
            >
              <div className={cn("p-1", isMobile && "p-1.5")}>
                <p
                  className="text-[10px] font-semibold leading-tight truncate"
                  style={{ color: eventColor }}
                >
                  {isGCalEvent && <span className="mr-1">📅</span>}
                  {event.title}
                </p>
                {height >= 40 && event.start_time && (
                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                    {formatTime(event.start_time)}
                    {event.end_time && ` – ${formatTime(event.end_time)}`}
                  </p>
                )}
              </div>
            </div>
          );

          // Google Calendar events aren't clickable (no task detail page)
          if (isGCalEvent) {
            return <div key={event.id}>{content}</div>;
          }

          return (
            <Link key={event.id} href={`/tasks/${event.id}`}>
              {content}
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

        {/* Google Calendar connection status */}
        {!googleConnected && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <CalendarOff size={14} />
            <span>Google Calendar not connected</span>
          </div>
        )}

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
