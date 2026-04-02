"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/auth-guard";
import { Task } from "@/types";
import { supabase } from "@/lib/supabase";
import { PRIORITY_CONFIG } from "@/lib/tasks";
import { getCalendarBusyBlocks, isGoogleConnected } from "@/lib/google-calendar";
import { ChevronLeft, ChevronRight, CalendarOff, Plus, X } from "lucide-react";
import Link from "next/link";
import { cn, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TaskForm from "@/components/tasks/TaskForm";

type ViewMode = "day" | "week" | "month";

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

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
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

function getMonthDays(ms: Date): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(ms);
  const lastDay = new Date(ms);
  lastDay.setMonth(lastDay.getMonth() + 1);
  lastDay.setDate(0);

  // Add days from previous month to fill first week
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(-i);
    days.push(d);
  }

  // Add all days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(ms);
    d.setDate(i);
    days.push(d);
  }

  // Add days from next month to fill last week
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    const d = new Date(lastDay);
    d.setDate(lastDay.getDate() + i);
    days.push(d);
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleEvents, setGoogleEvents] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDayIdx, setActiveDayIdx] = useState(() => new Date().getDay());
  const scrollRef = useRef<HTMLDivElement>(null);
  const googleConnected = isGoogleConnected();

  // New task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const monthDays = useMemo(() => getMonthDays(monthStart), [monthStart]);
  const today = useMemo(() => new Date(), []);
  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const nowPx = getNowTopPx();
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today));
  const isCurrentMonth = isSameMonth(currentDate, today);
  const showNowLine = viewMode !== "month" && isCurrentWeek && nowPx >= 0 && nowPx <= totalHeight;

  const loadAllEvents = useCallback(async (userId: string) => {
    setLoading(true);

    // Determine date range based on view mode
    let startDate: Date;
    let endDate: Date;

    if (viewMode === "month") {
      startDate = monthStart;
      endDate = new Date(monthStart);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      startDate = weekStart;
      endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 7);
    }

    // Fetch tasks from Supabase
    const [{ data: scheduled }, { data: dueTasks }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, projects(id, name, color, status)")
        .eq("user_id", userId)
        .gte("start_time", startDate.toISOString())
        .lt("start_time", endDate.toISOString()),
      supabase
        .from("tasks")
        .select("*, projects(id, name, color, status)")
        .eq("user_id", userId)
        .is("start_time", null)
        .gte("due_date", startDate.toISOString().split("T")[0])
        .lt("due_date", endDate.toISOString().split("T")[0])
        .neq("status", "done"),
    ]);

    const merged = [...(scheduled || []), ...(dueTasks || [])];
    const unique = Array.from(new Map(merged.map((t) => [t.id, t])).values());
    setTasks(unique.map((t) => ({ ...t, project: t.projects || null })));

    // Fetch Google Calendar events
    if (isGoogleConnected()) {
      const allGCalEvents: Task[] = [];
      const days = viewMode === "month" ? monthDays : weekDays;
      for (const day of days) {
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
  }, [viewMode, weekStart, monthStart, monthDays, weekDays]);

  useEffect(() => {
    if (user) loadAllEvents(user.id);
  }, [user, loadAllEvents]);

  useEffect(() => {
    if (!loading && scrollRef.current && viewMode !== "month") {
      scrollRef.current.scrollTop = Math.max(0, nowPx - 120);
    }
  }, [loading, nowPx, viewMode]);

  function navigatePrev() {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  }

  function navigateNext() {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
    setActiveDayIdx(new Date().getDay());
  }

  function handleTimeSlotClick(day: Date, hour: number) {
    setSelectedDate(day);
    setSelectedHour(hour);
    setShowTaskModal(true);
  }

  function handleTaskCreated(task: Task) {
    setTasks((prev) => [...prev, task]);
    setShowTaskModal(false);
    setSelectedDate(null);
    setSelectedHour(null);
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

  const dateLabel = (() => {
    if (viewMode === "day") {
      return `${DAY_SHORT[currentDate.getDay()]}, ${MONTH_SHORT[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
    if (viewMode === "month") {
      return `${MONTH_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  })();

  function renderDayColumn(day: Date, isMobile = false, _showTimeLabels = false) {
    const isToday = isSameDay(day, today);
    const scheduled = scheduledForDay(day);
    const due = dueForDay(day);

    return (
      <div
        className="relative border-l border-border flex-1"
        style={{ height: `${totalHeight}px` }}
      >
        {/* Hour lines + click zones */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/30 hover:bg-primary/5 cursor-pointer transition-colors"
            style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            onClick={() => handleTimeSlotClick(day, h)}
          />
        ))}

        {/* Due-date tasks */}
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
              onClick={(e) => e.stopPropagation()}
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

  function renderMonthView() {
    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* Day headers */}
        {DAY_SHORT.map((day) => (
          <div key={day} className="bg-muted/30 p-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Days */}
        {monthDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayTasks = scheduledForDay(day);
          const dayDue = dueForDay(day);
          const hasTasks = dayTasks.length > 0 || dayDue.length > 0;

          return (
            <div
              key={i}
              className={cn(
                "bg-background p-2 min-h-[80px] cursor-pointer hover:bg-muted/30 transition-colors",
                !isCurrentMonth && "opacity-40"
              )}
              onClick={() => {
                setCurrentDate(day);
                setViewMode("day");
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
                {hasTasks && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>

              {/* Task indicators */}
              <div className="space-y-0.5">
                {dayDue.slice(0, 2).map((task) => {
                  const cfg = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
                  return (
                    <div
                      key={task.id}
                      className="text-[9px] px-1 py-0.5 rounded truncate border"
                      style={{
                        backgroundColor: `${cfg?.color}22`,
                        borderColor: `${cfg?.color}44`,
                        color: cfg?.color,
                      }}
                    >
                      {task.title}
                    </div>
                  );
                })}
                {dayTasks.slice(0, 2).map((event) => {
                  const isGCal = event.id.startsWith("gcal-");
                  const color = isGCal ? "#6366f1" : (PRIORITY_CONFIG[event.priority_level as keyof typeof PRIORITY_CONFIG]?.color || "#6b7280");
                  return (
                    <div
                      key={event.id}
                      className="text-[9px] px-1 py-0.5 rounded truncate border-l-2"
                      style={{
                        backgroundColor: `${color}22`,
                        borderLeftColor: color,
                        color,
                      }}
                    >
                      {isGCal && "📅 "}{event.title}
                    </div>
                  );
                })}
                {(dayTasks.length + dayDue.length > 4) && (
                  <div className="text-[9px] text-muted-foreground px-1">
                    +{dayTasks.length + dayDue.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AuthGuard>
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrev}>
            <ChevronLeft size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
            <ChevronRight size={14} />
          </Button>
          <span className="text-sm font-semibold flex-1 text-center">{dateLabel}</span>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-2 py-1 text-xs font-medium transition-colors",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/50"
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Add task button */}
          <Button
            size="sm"
            className="h-8"
            onClick={() => {
              setSelectedDate(new Date());
              setSelectedHour(new Date().getHours());
              setShowTaskModal(true);
            }}
          >
            <Plus size={14} className="mr-1" />
            New
          </Button>
        </div>

        {/* Today button (if not on current period) */}
        {!(viewMode === "month" ? isCurrentMonth : isCurrentWeek) && (
          <div className="mb-2">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={goToToday}>
              Jump to Today
            </Button>
          </div>
        )}

        {/* Google Calendar connection status */}
        {!googleConnected && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <CalendarOff size={14} />
            <span>Google Calendar not connected</span>
          </div>
        )}

        {/* Month view */}
        {viewMode === "month" && renderMonthView()}

        {/* Day/Week views */}
        {viewMode !== "month" && (
          <>
            {/* Mobile: day tab strip (week view only) */}
            {viewMode === "week" && (
              <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-2 no-scrollbar">
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  const isActive = i === activeDayIdx;
                  const hasTasks = scheduledForDay(day).length > 0 || dueForDay(day).length > 0;
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
            )}

            {/* Calendar grid */}
            <div className="border border-border rounded-lg overflow-hidden relative">
              {/* Desktop: sticky day headers */}
              <div className="hidden md:flex border-b border-border bg-muted/30">
                <div className="w-12 flex-shrink-0" />
                {(viewMode === "day" ? [currentDate] : weekDays).map((day, i) => {
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
                className="overflow-y-auto h-[calc(100vh-300px)] md:h-[calc(100vh-250px)]"
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

                  {/* Desktop: day columns */}
                  <div className="hidden md:flex flex-1">
                    {(viewMode === "day" ? [currentDate] : weekDays).map((day, i) => (
                      <div key={i} className="flex-1 min-w-[80px]">
                        {renderDayColumn(day)}
                      </div>
                    ))}
                  </div>

                  {/* Mobile: single active day (week view) */}
                  <div className="md:hidden flex-1">
                    {renderDayColumn(viewMode === "day" ? currentDate : weekDays[activeDayIdx], true)}
                  </div>
                </div>
              </div>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <p className="text-sm text-muted-foreground">Loading…</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* New Task Modal */}
        {showTaskModal && selectedDate && selectedHour !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">New Task</h2>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedDate(null);
                    setSelectedHour(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {DAY_SHORT[selectedDate.getDay()]}, {MONTH_SHORT[selectedDate.getMonth()]} {selectedDate.getDate()} at {selectedHour > 12 ? selectedHour - 12 : selectedHour}{selectedHour >= 12 ? "pm" : "am"}
                </p>
                <TaskForm
                  initialData={{
                    start_time: new Date(selectedDate.setHours(selectedHour, 0, 0, 0)).toISOString(),
                    end_time: new Date(selectedDate.setHours(selectedHour + 1, 0, 0, 0)).toISOString(),
                    scheduling_mode: "manual",
                    estimated_duration: 60,
                  }}
                  onSuccess={handleTaskCreated}
                  onCancel={() => {
                    setShowTaskModal(false);
                    setSelectedDate(null);
                    setSelectedHour(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}