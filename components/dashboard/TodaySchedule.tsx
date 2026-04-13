"use client";
import { Task, FOCUS_MODE_CONFIG } from "@/types";
import { PRIORITY_CONFIG } from "@/lib/tasks";
import { formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, Link2 } from "lucide-react";
import { initiateGoogleAuth } from "@/lib/google-calendar";

interface TodayScheduleProps {
  scheduledTasks: Task[];
  unscheduledAutoTasks: Task[];
  onPlanMyDay: () => Promise<void>;
  isPlanning: boolean;
  googleConnected: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TodaySchedule({
  scheduledTasks,
  unscheduledAutoTasks,
  onPlanMyDay,
  isPlanning,
  googleConnected,
}: TodayScheduleProps) {
  const isEmpty = scheduledTasks.length === 0 && unscheduledAutoTasks.length === 0;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar size={16} />
            Today&apos;s Schedule
          </CardTitle>
          <Button
            size="sm"
            onClick={onPlanMyDay}
            disabled={isPlanning}
            className="text-xs"
          >
            {isPlanning ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Planning…
              </>
            ) : (
              "Plan My Day"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!googleConnected && (
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <Link2 size={12} className="flex-shrink-0" />
            <span>
              <button
                onClick={initiateGoogleAuth}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Connect Google Calendar
              </button>
              {" "}to schedule around your meetings.
            </span>
          </div>
        )}
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            No tasks scheduled yet. Click &quot;Plan My Day&quot; to auto-schedule your active tasks.
          </p>
        ) : (
          <>
            {unscheduledAutoTasks.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                {unscheduledAutoTasks.length} task{unscheduledAutoTasks.length !== 1 ? "s" : ""} ready to be scheduled
              </p>
            )}
            {scheduledTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks scheduled for today yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {scheduledTasks.map((task) => {
                  const config = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
                  return (
                    <li key={task.id} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0 tabular-nums">
                        {task.start_time ? formatTime(task.start_time) : "—"}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config?.color ?? "#6B7280" }}
                      />
                      <span className="truncate flex-1">{task.title}</span>
                      {task.focus_mode && FOCUS_MODE_CONFIG[task.focus_mode] && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                          style={{ backgroundColor: FOCUS_MODE_CONFIG[task.focus_mode].color }}
                        >
                          {FOCUS_MODE_CONFIG[task.focus_mode].label}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {formatDuration(task.estimated_duration ?? 30)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
