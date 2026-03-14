"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getGreeting, formatTime, todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JournalCard from "@/components/journal-card";
import { Compass, Plus, ArrowRight } from "lucide-react";
import { Journal, Checkin, Task } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth-guard";
import SpotifyConnectBanner from "@/components/spotify-connect-banner";
import ReflectionReminderBanner from "@/components/reflection-reminder-banner";

export default function DashboardPage() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    }
  }, [user]);

  async function loadData(userId: string) {
    const today = todayISO();
    const [{ data: checkinsData }, { data: journalsData }, { data: tasksData }] = await Promise.all([
      supabase
        .from("checkins")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", today + "T00:00:00")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("journals")
        .select("*, journal_tasks(task_id, tasks(id, title, status, project))")
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
    ]);

    setCheckins(checkinsData || []);
    setJournals(journalsData || []);
    setTasks(tasksData || []);
    setDataLoading(false);
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

          <SpotifyConnectBanner />
          <ReflectionReminderBanner />

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
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="truncate">{t.title}</span>
                        {t.project_id && (
                          <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">Project</span>
                        )}
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
