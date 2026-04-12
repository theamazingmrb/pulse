"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Task, TaskStatus, FocusMode, FOCUS_MODE_CONFIG } from "@/types";
import { cn } from "@/lib/utils";
import { Plus, Check, Trash2, Clock, Zap, Lock, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getTasks, deleteTask, updateTask, completeTask, uncompleteTask, PRIORITY_CONFIG } from "@/lib/tasks";
import TaskForm from "@/components/tasks/TaskForm";
import PrioritySelector from "@/components/tasks/PrioritySelector";
import WarMapSelector from "@/components/tasks/WarMapSelector";
import AuthGuard from "@/components/auth-guard";

const STATUS_TABS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "someday", label: "Someday" },
  { value: "done", label: "Done" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("active");
  const [focusFilter, setFocusFilter] = useState<FocusMode | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const data = await getTasks(user.id);
    setTasks(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const success = await deleteTask(id);
    if (success) {
      toast.success("Task deleted");
      load();
    } else {
      toast.error("Failed to delete task");
    }
  }

  async function handleToggleComplete(task: Task) {
    const result = task.status === "done"
      ? await uncompleteTask(task.id)
      : await completeTask(task.id);
    
    if (result) {
      load();
    }
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    const result = await updateTask(id, { status });
    if (result) {
      load();
    }
  }

  const filtered = tasks.filter((t) => {
    const statusMatch = filter === "all" || t.status === filter;
    const focusMatch = focusFilter === "all" || t.focus_mode === focusFilter;
    return statusMatch && focusMatch;
  });

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatScheduledTime = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    
    const timeStr = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const dateStr = start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    
    if (end) {
      const endTimeStr = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${dateStr} · ${timeStr} - ${endTimeStr}`;
    }
    return `${dateStr} · ${timeStr}`;
  };

  return (
    <AuthGuard>
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Tasks</h1>
        <p className="text-muted-foreground text-sm">Smart scheduling for what matters most.</p>
      </div>

      {/* Add task button / form */}
      {showForm ? (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <TaskForm
            onSuccess={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="mb-6">
          <Plus size={16} className="mr-2" /> New Task
        </Button>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              filter === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {tab.label}
            <span className="ml-1.5 opacity-60">
              {tab.value === "all" ? tasks.length : tasks.filter((t) => t.status === tab.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Focus Mode filter */}
      <div className="flex gap-1 mb-5 flex-wrap">
        <span className="text-xs text-muted-foreground mr-2">Focus:</span>
        <button
          onClick={() => setFocusFilter("all")}
          className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
            focusFilter === "all"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {Object.entries(FOCUS_MODE_CONFIG).map(([mode, cfg]) => (
          <button
            key={mode}
            onClick={() => setFocusFilter(mode as FocusMode)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
              focusFilter === mode
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{
              backgroundColor: focusFilter === mode ? cfg.color : "transparent",
              border: `1px solid ${focusFilter === mode ? cfg.color : "var(--border)"}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: focusFilter === mode ? "white" : cfg.color }}
            />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading tasks...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks here.</p>
        ) : (
          filtered.map((task) => {
            const priorityConfig = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
            const isExpanded = expandedTaskId === task.id;
            const scheduledTime = formatScheduledTime(task.start_time, task.end_time);

            return (
              <div
                key={task.id}
                className={cn(
                  "group rounded-lg border bg-card transition-all",
                  task.status === "done"
                    ? "border-border/50 opacity-60"
                    : "border-border hover:border-primary/30"
                )}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Complete checkbox */}
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors",
                      task.status === "done"
                        ? "bg-green-500 border-green-500"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {task.status === "done" && <Check size={12} className="text-white" />}
                  </button>

                  {/* Priority indicator */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: priorityConfig?.color }}
                    title={priorityConfig?.label}
                  />

                  {/* Title and meta */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/tasks/${task.id}`}
                      className={cn(
                        "text-sm block truncate hover:underline hover:text-primary transition-colors",
                        task.status === "done" && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {task.scheduling_mode === "auto" && (
                        <span className="flex items-center gap-1">
                          <Zap size={10} /> Auto
                        </span>
                      )}
                      {task.locked && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Lock size={10} /> Locked
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {formatDuration(task.estimated_duration)}
                      </span>
                      {scheduledTime && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {scheduledTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project badge */}
                  {task.project && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border flex-shrink-0"
                      style={{
                        backgroundColor: `${task.project.color}20`,
                        borderColor: task.project.color,
                        color: task.project.color,
                      }}
                    >
                      {task.project.name}
                    </span>
                  )}

                  {/* Focus Mode badge */}
                  {task.focus_mode && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1"
                      style={{
                        backgroundColor: `${FOCUS_MODE_CONFIG[task.focus_mode as FocusMode]?.color}15`,
                        borderColor: FOCUS_MODE_CONFIG[task.focus_mode as FocusMode]?.color,
                        color: FOCUS_MODE_CONFIG[task.focus_mode as FocusMode]?.color,
                      }}
                      title={FOCUS_MODE_CONFIG[task.focus_mode as FocusMode]?.description}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: FOCUS_MODE_CONFIG[task.focus_mode as FocusMode]?.color }}
                      />
                      {FOCUS_MODE_CONFIG[task.focus_mode as FocusMode]?.label}
                    </span>
                  )}

                  {/* Status dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border bg-transparent outline-none cursor-pointer capitalize",
                      task.status === "done" && "border-green-500/50 text-green-500",
                      task.status === "active" && "border-blue-500/50 text-blue-500",
                      task.status === "waiting" && "border-amber-500/50 text-amber-500",
                      task.status === "someday" && "border-gray-500/50 text-gray-500"
                    )}
                  >
                    <option value="active">Active</option>
                    <option value="waiting">Waiting</option>
                    <option value="someday">Someday</option>
                    <option value="done">Done</option>
                  </select>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="p-1.5 rounded hover:bg-secondary transition-colors"
                      title="Expand"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <Link href={`/journal/new?task_id=${task.id}`} title="Journal about this task">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <BookOpen size={13} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Priority</p>
                        <PrioritySelector
                          selectedPriority={task.priority_level}
                          onPriorityChange={async (level) => {
                            await updateTask(task.id, { priority_level: level });
                            load();
                          }}
                          compact
                        />
                      </div>
                      {task.description && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs mb-1">Description</p>
                          <p className="text-sm">{task.description}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <WarMapSelector taskId={task.id} />
                      </div>
                      {task.due_date && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Due Date</p>
                          <p className="text-sm">
                            {new Date(task.due_date).toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
