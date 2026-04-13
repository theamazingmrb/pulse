import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FocusTimeOverview {
  today: number;
  thisWeek: number;
  thisMonth: number;
  trend: { date: string; minutes: number }[];
  completionRate: number; // started vs completed
}

export interface ProductivityPatterns {
  hourlyData: { hour: number; sessions: number; minutes: number }[];
  weeklyData: { day: string; sessions: number; minutes: number }[];
  energyCorrelation: {
    highEnergy: number;
    mediumEnergy: number;
    lowEnergy: number;
  };
}

export interface TaskInsights {
  priorityDistribution: { priority: string; minutes: number; sessions: number }[];
  topTasks: { taskId: string; title: string; minutes: number; sessions: number }[];
  focusPerTask: number; // avg focus sessions per completed task
}

export interface StreaksData {
  checkinStreak: number;
  reflectionStreak: number;
  focusStreak: number;
  milestones: { label: string; current: number; target: number; achieved: boolean }[];
}

export interface WarMapProgress {
  completedTasks: number;
  totalTasks: number;
  focusMinutesTowardGoals: number;
  categories: { name: string; completed: number; total: number }[];
}

export interface AnalyticsData {
  focusTime: FocusTimeOverview;
  productivity: ProductivityPatterns;
  tasks: TaskInsights;
  streaks: StreaksData;
  warmap?: WarMapProgress;
}

// ── Date Helpers ──────────────────────────────────────────────────────────────

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ── Focus Time Overview ───────────────────────────────────────────────────────

export async function getFocusTimeOverview(userId: string): Promise<FocusTimeOverview> {
  const now = new Date();
  const todayStart = getStartOfDay(now);
  const weekStart = getStartOfWeek(now);
  const monthStart = getStartOfMonth(now);

  // Get all sessions from the past 30 days for trend
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions } = await supabase
    .from("focus_sessions")
    .select("id, duration, status, started_at")
    .eq("user_id", userId)
    .gte("started_at", thirtyDaysAgo.toISOString());

  if (!sessions) {
    return {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      trend: [],
      completionRate: 0,
    };
  }

  // Calculate totals
  const todaySessions = sessions.filter((s) => new Date(s.started_at) >= todayStart);
  const weekSessions = sessions.filter((s) => new Date(s.started_at) >= weekStart);
  const monthSessions = sessions.filter((s) => new Date(s.started_at) >= monthStart);

  const today = todaySessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.duration, 0);
  const thisWeek = weekSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.duration, 0);
  const thisMonth = monthSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.duration, 0);

  // Calculate completion rate (started vs completed)
  const totalStarted = sessions.length;
  const totalCompleted = sessions.filter((s) => s.status === "completed").length;
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  // Build trend data (last 14 days)
  const trend: { date: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = getStartOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayMinutes = sessions
      .filter((s) => {
        const start = new Date(s.started_at);
        return s.status === "completed" && start >= dayStart && start < dayEnd;
      })
      .reduce((sum, s) => sum + s.duration, 0);

    trend.push({
      date: formatDateString(date),
      minutes: dayMinutes,
    });
  }

  return {
    today,
    thisWeek,
    thisMonth,
    trend,
    completionRate,
  };
}

// ── Productivity Patterns ─────────────────────────────────────────────────────

export async function getProductivityPatterns(userId: string): Promise<ProductivityPatterns> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get focus sessions
  const { data: sessions } = await supabase
    .from("focus_sessions")
    .select("id, duration, started_at, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("started_at", thirtyDaysAgo.toISOString());

  // Get check-ins for energy correlation
  const { data: checkins } = await supabase
    .from("checkins")
    .select("id, energy_level, created_at")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Hourly distribution (sessions completed by hour)
  const hourlyMap = new Map<number, { sessions: number; minutes: number }>();
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, { sessions: 0, minutes: 0 });
  }

  if (sessions) {
    for (const session of sessions) {
      const hour = new Date(session.started_at).getHours();
      const entry = hourlyMap.get(hour) || { sessions: 0, minutes: 0 };
      hourlyMap.set(hour, {
        sessions: entry.sessions + 1,
        minutes: entry.minutes + session.duration,
      });
    }
  }

  const hourlyData = Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour - b.hour);

  // Weekly distribution (sessions by day of week)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyMap = new Map<string, { sessions: number; minutes: number }>();
  for (const day of dayNames) {
    weeklyMap.set(day, { sessions: 0, minutes: 0 });
  }

  if (sessions) {
    for (const session of sessions) {
      const dayIndex = new Date(session.started_at).getDay();
      const dayName = dayNames[dayIndex];
      const entry = weeklyMap.get(dayName) || { sessions: 0, minutes: 0 };
      weeklyMap.set(dayName, {
        sessions: entry.sessions + 1,
        minutes: entry.minutes + session.duration,
      });
    }
  }

  const weeklyData = dayNames.map((day) => ({
    day,
    ...(weeklyMap.get(day) || { sessions: 0, minutes: 0 }),
  }));

  // Energy correlation
  const energyCorrelation = {
    highEnergy: 0,
    mediumEnergy: 0,
    lowEnergy: 0,
  };

  if (checkins) {
    for (const checkin of checkins) {
      if (checkin.energy_level) {
        if (checkin.energy_level >= 4) energyCorrelation.highEnergy++;
        else if (checkin.energy_level >= 2) energyCorrelation.mediumEnergy++;
        else energyCorrelation.lowEnergy++;
      }
    }
  }

  return {
    hourlyData,
    weeklyData,
    energyCorrelation,
  };
}

// ── Task Insights ─────────────────────────────────────────────────────────────

const PRIORITY_LABELS = ["Hot", "Warm", "Cool", "Cold"];

export async function getTaskInsights(userId: string): Promise<TaskInsights> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get focus sessions with task info
  const { data: sessions } = await supabase
    .from("focus_sessions")
    .select(
      `
      id,
      duration,
      status,
      task_id,
      tasks!focus_sessions_task_id_fkey (
        id,
        title,
        priority_level,
        project_id
      )
    `
    )
    .eq("user_id", userId)
    .gte("started_at", thirtyDaysAgo.toISOString());

  // Get completed tasks
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select("id, status, completed_at")
    .eq("user_id", userId)
    .eq("status", "done")
    .gte("updated_at", thirtyDaysAgo.toISOString());

  // Priority distribution
  const priorityMap = new Map<number, { minutes: number; sessions: number }>();
  for (let i = 1; i <= 4; i++) {
    priorityMap.set(i, { minutes: 0, sessions: 0 });
  }

  // Task-level aggregation
  const taskMap = new Map<
    string,
    { title: string; minutes: number; sessions: number }
  >();

  if (sessions) {
    for (const session of sessions) {
      if (session.status !== "completed") continue;

      const taskData = session.tasks;
      // Supabase returns a single object for the relation, not an array
      const task = taskData && typeof taskData === 'object' && !Array.isArray(taskData) 
        ? taskData as { id: string; title: string; priority_level: number } 
        : null;
      const minutes = session.duration;

      // Priority distribution
      if (task?.priority_level) {
        const entry = priorityMap.get(task.priority_level) || { minutes: 0, sessions: 0 };
        priorityMap.set(task.priority_level, {
          minutes: entry.minutes + minutes,
          sessions: entry.sessions + 1,
        });
      }

      // Task aggregation
      if (task?.id && task.title) {
        const taskEntry = taskMap.get(task.id) || {
          title: task.title,
          minutes: 0,
          sessions: 0,
        };
        taskMap.set(task.id, {
          title: task.title,
          minutes: taskEntry.minutes + minutes,
          sessions: taskEntry.sessions + 1,
        });
      }
    }
  }

  const priorityDistribution = PRIORITY_LABELS.map((label, index) => {
    const data = priorityMap.get(index + 1) || { minutes: 0, sessions: 0 };
    return {
      priority: label,
      ...data,
    };
  });

  const topTasks = Array.from(taskMap.entries())
    .map(([taskId, data]) => ({
      taskId,
      ...data,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  // Focus sessions per completed task
  const totalFocusSessions = sessions?.filter((s) => s.status === "completed").length || 0;
  const totalCompletedTasks = completedTasks?.length || 0;
  const focusPerTask =
    totalCompletedTasks > 0
      ? Math.round((totalFocusSessions / totalCompletedTasks) * 10) / 10
      : 0;

  return {
    priorityDistribution,
    topTasks,
    focusPerTask,
  };
}

// ── Streaks & Milestones ───────────────────────────────────────────────────────

export async function getStreaksData(userId: string): Promise<StreaksData> {
  // Check-in streak (consecutive days with check-ins)
  const { data: checkins } = await supabase
    .from("checkins")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const checkinStreak = calculateStreak(checkins?.map((c) => c.created_at) || []);

  // Reflection streak
  const { data: reflectionStreaks } = await supabase
    .from("reflection_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .eq("type", "daily")
    .single();

  const reflectionStreak = reflectionStreaks?.current_streak || 0;

  // Focus streak (consecutive days with focus sessions)
  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("started_at", { ascending: false });

  const focusStreak = calculateStreak(focusSessions?.map((s) => s.started_at) || []);

  // Get total focus time and sessions for milestones
  const { data: allSessions } = await supabase
    .from("focus_sessions")
    .select("duration")
    .eq("user_id", userId)
    .eq("status", "completed");

  const totalMinutes = allSessions?.reduce((sum, s) => sum + s.duration, 0) || 0;
  const totalSessions = allSessions?.length || 0;
  const totalHours = Math.floor(totalMinutes / 60);

  const milestones: StreaksData["milestones"] = [
    {
      label: "1 Hour Focused",
      current: totalHours,
      target: 1,
      achieved: totalHours >= 1,
    },
    {
      label: "5 Hours Focused",
      current: totalHours,
      target: 5,
      achieved: totalHours >= 5,
    },
    {
      label: "10 Hours Focused",
      current: totalHours,
      target: 10,
      achieved: totalHours >= 10,
    },
    {
      label: "25 Hours Focused",
      current: totalHours,
      target: 25,
      achieved: totalHours >= 25,
    },
    {
      label: "50 Hours Focused",
      current: totalHours,
      target: 50,
      achieved: totalHours >= 50,
    },
    {
      label: "10 Sessions",
      current: totalSessions,
      target: 10,
      achieved: totalSessions >= 10,
    },
    {
      label: "25 Sessions",
      current: totalSessions,
      target: 25,
      achieved: totalSessions >= 25,
    },
    {
      label: "50 Sessions",
      current: totalSessions,
      target: 50,
      achieved: totalSessions >= 50,
    },
    {
      label: "100 Sessions",
      current: totalSessions,
      target: 100,
      achieved: totalSessions >= 100,
    },
    {
      label: "7-Day Focus Streak",
      current: focusStreak,
      target: 7,
      achieved: focusStreak >= 7,
    },
  ];

  return {
    checkinStreak,
    reflectionStreak,
    focusStreak,
    milestones,
  };
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = new Set(
    dates.map((d) => new Date(d).toISOString().split("T")[0])
  );
  const sortedDays = Array.from(uniqueDays).sort().reverse();

  if (sortedDays.length === 0) return 0;

  // Check if today or yesterday is in the streak
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const current = new Date(sortedDays[i - 1]);
    const prev = new Date(sortedDays[i]);
    const diffDays = Math.floor(
      (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ── WarMap Progress ───────────────────────────────────────────────────────────

export async function getWarMapProgress(userId: string): Promise<WarMapProgress> {
  // Get WarMap items
  const { data: warmapItems } = await supabase
    .from("warmap_items")
    .select("id, status, category_id, warmap_categories!warmap_items_category_id_fkey (name)")
    .eq("user_id", userId);

  // Count completed vs total
  const totalTasks = warmapItems?.filter((i) => i.status !== "abandoned").length || 0;
  const completedTasks = warmapItems?.filter((i) => i.status === "completed").length || 0;

  // Group by category
  const categoryMap = new Map<string, { name: string; completed: number; total: number }>();

  if (warmapItems) {
    for (const item of warmapItems) {
      if (item.status === "abandoned") continue;

      const categoryData = item.warmap_categories;
      const category = categoryData && typeof categoryData === 'object' && !Array.isArray(categoryData)
        ? categoryData as { name: string }
        : null;
      const categoryName = category?.name || "Uncategorized";
      const entry = categoryMap.get(categoryName) || {
        name: categoryName,
        completed: 0,
        total: 0,
      };

      entry.total++;
      if (item.status === "completed") entry.completed++;
      categoryMap.set(categoryName, entry);
    }
  }

  const categories = Array.from(categoryMap.values());

  // Get focus sessions for completed tasks (approximation)
  const { data: focusData } = await supabase
    .from("focus_sessions")
    .select("duration")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("task_id", "is", null);

  const focusMinutesTowardGoals = focusData?.reduce((sum, s) => sum + s.duration, 0) || 0;

  return {
    completedTasks,
    totalTasks,
    focusMinutesTowardGoals,
    categories,
  };
}

// ── Combined Analytics ──────────────────────────────────────────────────────────

export async function getAnalyticsData(userId: string): Promise<AnalyticsData> {
  const [focusTime, productivity, tasks, streaks, warmap] = await Promise.all([
    getFocusTimeOverview(userId),
    getProductivityPatterns(userId),
    getTaskInsights(userId),
    getStreaksData(userId),
    getWarMapProgress(userId),
  ]);

  return {
    focusTime,
    productivity,
    tasks,
    streaks,
    warmap,
  };
}