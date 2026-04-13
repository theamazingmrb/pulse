"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getGreeting, formatTime, todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JournalCard from "@/components/journal-card";
import { Compass, Plus, ArrowRight, Sparkles } from "lucide-react";
import { Journal, Checkin, Task } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth-guard";
import SpotifyConnectBanner from "@/components/spotify-connect-banner";
import ReflectionReminderBanner from "@/components/reflection-reminder-banner";
import GoogleCalendarConnect from "@/components/google-calendar-connect";
import QuickStartGuide from "@/components/dashboard/QuickStartGuide";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import FocusStats from "@/components/focus-stats";
import { getScheduledTasksForDay, rescheduleOverdueTasks, updateTask } from "@/lib/tasks";
import { SchedulingService } from "@/lib/scheduling";
import {
  isGoogleConnected,
  handleGoogleCallback,
  getCalendarBusyBlocks,
  syncTaskToCalendar,
} from "@/lib/google-calendar";
import { getNorthStar } from "@/lib/north-star";
import { getCoreValues } from "@/lib/core-values";
import { CoreValue } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasProjects, setHasProjects] = useState(false);
  const [hasReflections, setHasReflections] = useState(false);
  const [northStar, setNorthStar] = useState<string | null>(null);
  const [coreValues, setCoreValues] = useState<CoreValue[]>([]);

  useEffect(() => {
    setGoogleConnected(isGoogleConnected());
    handleGoogleCallback().then((connected) => {
      if (connected) setGoogleConnected(true);
    });
  }, []);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    }
  }, [user]);

  async function loadData(userId: string) {
    const today = todayISO();
    const [
      { data: checkinsData },
      { data: journalsData },
      { data: tasksData },
      { data: projectsData },
      { data: reflectionsData },
      scheduledForToday,
      northStarData,
      coreValuesData,
    ] = await Promise.all([
      supabase
        .from("checkins")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", today + "T00:00:00")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("journals")
        .select("*, journal_tasks(task_id, tasks(id, title, status, project_id))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("projects")
        .select("id")
        .eq("user_id", userId)
        .limit(1),
      supabase
        .from("reflections")
        .select("id")
        .eq("user_id", userId)
        .limit(1),
      getScheduledTasksForDay(userId, new Date()),
      getNorthStar(userId),
      getCoreValues(userId),
    ]);

    setCheckins(checkinsData || []);
    setJournals(journalsData || []);
    setTasks(tasksData || []);
    setScheduledTasks(scheduledForToday);
    setHasProjects((projectsData?.length || 0) > 0);
    setHasReflections((reflectionsData?.length || 0) > 0);
    setNorthStar(northStarData?.content || null);
    setCoreValues(coreValuesData || []);
    setDataLoading(false);
  }

  async function planMyDay() {
    if (!user) return;
    setIsPlanning(true);
    try {
      await rescheduleOverdueTasks(user.id);

      const { data: allActiveData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      const allActive: Task[] = allActiveData || [];
      const autoTasksWithoutTimes = allActive.filter(
        (t) => t.scheduling_mode === "auto" && !t.start_time
      );

      // Pull GCal events as locked busy-blocks so the scheduler avoids those slots
      const gcalBusyBlocks = googleConnected ? await getCalendarBusyBlocks(new Date()) : [];

      if (autoTasksWithoutTimes.length > 0 || gcalBusyBlocks.length > 0) {
        const rescheduled = await SchedulingService.rescheduleTasks([
          ...autoTasksWithoutTimes,
          ...gcalBusyBlocks,
        ]);

        // Only persist real tasks (not the gcal- busy-block placeholders)
        const realTasks = rescheduled.filter((t) => !t.id.startsWith("gcal-"));

        await Promise.all(
          realTasks
            .filter((t) => t.start_time && t.end_time)
            .map(async (t) => {
              const saved = await updateTask(t.id, {
                start_time: t.start_time,
                end_time: t.end_time,
              });

              if (saved && googleConnected) {
                const googleEventId = await syncTaskToCalendar(saved);
                if (googleEventId && googleEventId !== saved.google_event_id) {
                  await updateTask(saved.id, { google_event_id: googleEventId });
                }
              }
            })
        );
      }

      const refreshed = await getScheduledTasksForDay(user.id, new Date());
      setScheduledTasks(refreshed);
    } finally {
      setIsPlanning(false);
    }
  }

  const latestCheckin = checkins[0];

  const reshapedJournals = journals.map((j: Journal & { journal_tasks?: { tasks: unknown }[] }) => ({
    ...j,
    tasks: j.journal_tasks?.map((jt) => jt.tasks) ?? [],
  }));

  return (
    <AuthGuard>
      {dataLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">{getGreeting()}</h1>
            <p className="text-muted-foreground text-sm">What matters most right now?</p>
          </div>

          {/* North Star & Core Values */}
          {(northStar || coreValues.length > 0) && (
            <div className="mb-6 space-y-3">
              {northStar && (
                <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Compass size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">North Star</p>
                        <p className="text-sm leading-relaxed">{northStar}</p>
                      </div>
                      <Link href="/settings/intention">
                        <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
              {coreValues.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Sparkles size={14} className="text-violet-500" />
                  {coreValues.slice(0, 5).map((v) => (
                    <span
                      key={v.id}
                      className="text-xs px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                    >
                      {v.value_text}
                    </span>
                  ))}
                  <Link href="/settings/intention">
                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2">Edit</Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          <QuickStartGuide
            hasProjects={hasProjects}
            hasTasks={tasks.length > 0}
            hasReflections={hasReflections}
          />

          <SpotifyConnectBanner />
          <GoogleCalendarConnect />
          <ReflectionReminderBanner />
          <FocusStats />

          {/* Today's priority */}
          {latestCheckin ? (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Today&apos;s focus · {formatTime(latestCheckin.created_at)}
                    </p>
                    <p className="text-lg font-semibold">{latestCheckin.top_priority}</p>
                    {latestCheckin.other_priorities && latestCheckin.other_priorities.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {latestCheckin.other_priorities.map((p, i) => (
                          <span key={i} className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link href="/checkin">
                    <Button variant="outline" size="sm">
                      <Compass size={14} /> Recalibrate
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Link href="/checkin">
              <Card className="mb-6 border-dashed border-primary/40 hover:border-primary/70 transition-colors cursor-pointer">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium mb-1">No check-in yet today</p>
                      <p className="text-sm text-muted-foreground">Set your priority for today — takes 60 seconds.</p>
                    </div>
                    <Button>
                      <Compass size={14} /> Check in <ArrowRight size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Tasks</CardTitle>
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="text-xs">View all <ArrowRight size={12} /></Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active tasks.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {tasks.map((t) => (
                      <li key={t.id}>
                        <Link href={`/tasks/${t.id}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors group">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="truncate group-hover:underline">{t.title}</span>
                          {t.project_id && (
                            <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">Project</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="mt-3 w-full text-xs">
                    <Plus size={12} /> Add task
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent check-ins */}
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                {checkins.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No check-ins yet today.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {checkins.map((c: Checkin) => (
                      <li key={c.id} className="text-sm border-l-2 border-primary/30 pl-3">
                        <p className="font-medium truncate">{c.top_priority}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(c.created_at)} · energy {c.energy_level}/5</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <TodaySchedule
            scheduledTasks={scheduledTasks}
            unscheduledAutoTasks={tasks.filter(
              (t) => t.scheduling_mode === "auto" && !t.start_time
            )}
            onPlanMyDay={planMyDay}
            isPlanning={isPlanning}
            googleConnected={googleConnected}
          />

          {/* Recent journals */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Journal Entries</h2>
              <div className="flex gap-2">
                <Link href="/journal/new">
                  <Button size="sm"><Plus size={14} /> New Entry</Button>
                </Link>
                <Link href="/journal">
                  <Button variant="outline" size="sm">View all <ArrowRight size={14} /></Button>
                </Link>
              </div>
            </div>
            {reshapedJournals.length === 0 ? (
              <Card className="border-dashed">
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No journal entries yet. Write your first one.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {reshapedJournals.map((j) => (
                  <JournalCard key={j.id} journal={j as Journal} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
