"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Task, SchedulingMode, FocusMode, FOCUS_MODE_CONFIG, RecurrenceType } from "@/types";
import { createTask, updateTask } from "@/lib/tasks";
import { PRIORITY_CONFIG } from "@/lib/tasks";
import { getActiveProjects, PROJECT_COLORS } from "@/lib/projects";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Lock, Unlock, Loader2, ChevronDown, Zap, Hand, Folder, X, Check, Repeat } from "lucide-react";
import { toast } from "sonner";

interface TaskFormProps {
  initialData?: Partial<Task>;
  defaultProjectId?: string;
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
}

const DURATION_PRESETS = [
  { mins: 15, label: "15m" },
  { mins: 30, label: "30m" },
  { mins: 60, label: "1h" },
  { mins: 120, label: "2h" },
];

export default function TaskForm({ initialData, defaultProjectId, onSuccess, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(!!initialData?.description || !!initialData?.due_date || !!initialData?.recurrence_type);

  // Form state
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [projectId, setProjectId] = useState<string | null>(initialData?.project_id || defaultProjectId || null);
  const [priorityLevel, setPriorityLevel] = useState(initialData?.priority_level || 1);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(initialData?.scheduling_mode || "auto");
  const [estimatedDuration, setEstimatedDuration] = useState(initialData?.estimated_duration || 30);
  const [customDuration, setCustomDuration] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode | null>(
    (initialData as Task & { focus_mode?: FocusMode | null })?.focus_mode || null
  );
  const [startTime, setStartTime] = useState(
    initialData?.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : ""
  );
  const [endTime, setEndTime] = useState(
    initialData?.end_time ? new Date(initialData.end_time).toISOString().slice(0, 16) : ""
  );
  const [dueDate, setDueDate] = useState(
    initialData?.due_date ? new Date(initialData.due_date).toISOString().slice(0, 16) : ""
  );
  const [locked, setLocked] = useState(initialData?.locked || false);

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(
    (initialData as Task & { recurrence_type?: RecurrenceType | null })?.recurrence_type || null
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(initialData?.recurrence_interval || 1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(
    initialData?.recurrence_end_date || null
  );
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[] | null>(
    initialData?.recurrence_weekdays || null
  );

  // Project dropdown state
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const isEditing = !!initialData?.id;

  // Load projects on mount
  useEffect(() => {
    if (user) {
      getActiveProjects(user.id).then(setProjects);
    }
  }, [user]);

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) return;
    const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    const { createProject } = await import("@/lib/projects");
    const newProject = await createProject({
      user_id: user.id,
      name: newProjectName.trim(),
      description: null,
      color: randomColor,
      status: "active",
      image_url: null,
      banner_url: null,
    });
    if (newProject) {
      setProjects([...projects, newProject]);
      setProjectId(newProject.id);
      setNewProjectName("");
      setIsCreatingProject(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    if (schedulingMode === "manual") {
      if (!startTime || !endTime) {
        toast.error("Please specify both start and end times");
        return;
      }
      if (new Date(endTime) <= new Date(startTime)) {
        toast.error("End time must be after start time");
        return;
      }
    }

    setLoading(true);

    try {
      const taskData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        priority_level: priorityLevel,
        scheduling_mode: schedulingMode,
        estimated_duration: estimatedDuration,
        focus_mode: focusMode,
        start_time: schedulingMode === "manual" && startTime ? new Date(startTime).toISOString() : null,
        end_time: schedulingMode === "manual" && endTime ? new Date(endTime).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        locked,
        status: "active" as const,
        notes: null,
        image_url: null,
        // Recurrence fields
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        recurrence_end_date: recurrenceEndDate,
        recurrence_weekdays: recurrenceWeekdays,
        is_recurrence_template: recurrenceType !== null,
        parent_task_id: null,
        skipped_dates: null,
      };

      let result: Task | null;

      if (isEditing && initialData?.id) {
        result = await updateTask(initialData.id, taskData);
      } else {
        result = await createTask(taskData);
      }

      if (result) {
        toast.success(isEditing ? "Task updated" : "Task created");
        onSuccess?.(result);
        if (!isEditing) resetForm();
      } else {
        toast.error("Failed to save task");
      }
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectId(null);
    setPriorityLevel(1);
    setSchedulingMode("auto");
    setEstimatedDuration(30);
    setCustomDuration(false);
    setFocusMode(null);
    setStartTime("");
    setEndTime("");
    setDueDate("");
    setLocked(false);
    setRecurrenceType(null);
    setRecurrenceInterval(1);
    setRecurrenceEndDate(null);
    setRecurrenceWeekdays(null);
    setShowDetails(false);
  };

  const handleDurationSelect = (mins: number) => {
    setEstimatedDuration(mins);
    setCustomDuration(false);
  };

  const priorities = Object.entries(PRIORITY_CONFIG).map(([level, config]) => ({
    level: parseInt(level),
    ...config,
  }));

  const focusModes = Object.entries(FOCUS_MODE_CONFIG) as [FocusMode, typeof FOCUS_MODE_CONFIG[FocusMode]][];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Main input row - title + priority + duration */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Title input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60"
            required
            autoFocus
          />
        </div>
      </div>

      {/* Quick settings row - chips */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* Priority chips */}
        <div className="flex items-center gap-1.5 py-1 px-0.5">
          {priorities.map((p) => (
            <button
              key={p.level}
              type="button"
              onClick={() => setPriorityLevel(p.level)}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mx-0.5",
                priorityLevel === p.level
                  ? "scale-110 shadow-[0_0_0_2px_var(--tw-shadow-color)]"
                  : "opacity-40 hover:opacity-70"
              )}
              style={{
                backgroundColor: p.color,
                color: "white",
                ...(priorityLevel === p.level && { boxShadow: `0 0 0 2px ${p.color}` }),
              }}
              title={`${p.label}: ${p.description}`}
            >
              {p.level}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Duration chips */}
        <div className="flex items-center gap-1">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d.mins}
              type="button"
              onClick={() => handleDurationSelect(d.mins)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
                estimatedDuration === d.mins && !customDuration
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {d.label}
            </button>
          ))}
          {customDuration ? (
            <input
              type="number"
              min={5}
              max={480}
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(Math.max(5, parseInt(e.target.value) || 5))}
              className="w-16 px-2 py-1 text-xs border border-primary rounded-full bg-background text-center focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setCustomDuration(true)}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-muted-foreground hover:text-foreground"
            >
              ...
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Focus mode chip */}
        {focusMode ? (
          <button
            type="button"
            onClick={() => setFocusMode(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full text-white transition-all hover:opacity-80"
            style={{ backgroundColor: FOCUS_MODE_CONFIG[focusMode].color }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            {FOCUS_MODE_CONFIG[focusMode].label}
            <X size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setFocusMode("deep")}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            + Focus
          </button>
        )}
      </div>

      {/* Second row - project + scheduling mode + recurrence */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* Project dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
              selectedProject
                ? "border-transparent"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            )}
            style={selectedProject ? { backgroundColor: `${selectedProject.color}20`, color: selectedProject.color, borderColor: selectedProject.color } : undefined}
          >
            {selectedProject ? (
              <>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                {selectedProject.name}
              </>
            ) : (
              <>
                <Folder size={12} />
                Project
              </>
            )}
            <ChevronDown size={12} />
          </button>

          {showProjectDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
              <div className="absolute z-20 top-full left-0 mt-1 w-48 py-1 rounded-lg border border-border bg-card shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setProjectId(null);
                    setShowProjectDropdown(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-xs text-left flex items-center gap-2 hover:bg-secondary",
                    !projectId && "bg-primary/10 text-primary"
                  )}
                >
                  <Folder size={12} className="text-muted-foreground" />
                  No project
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProjectId(p.id);
                      setShowProjectDropdown(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-xs text-left flex items-center gap-2 hover:bg-secondary",
                      projectId === p.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  {isCreatingProject ? (
                    <div className="px-2 py-1 flex gap-1">
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateProject();
                          if (e.key === "Escape") setIsCreatingProject(false);
                        }}
                        placeholder="Name..."
                        className="flex-1 px-2 py-1 text-xs bg-secondary border border-border rounded"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingProject(true)}
                      className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <Plus size={12} />
                      New project
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scheduling mode toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-secondary">
          <button
            type="button"
            onClick={() => setSchedulingMode("auto")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all",
              schedulingMode === "auto"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap size={12} />
            Auto
          </button>
          <button
            type="button"
            onClick={() => setSchedulingMode("manual")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all",
              schedulingMode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Hand size={12} />
            Manual
          </button>
        </div>

        {/* Recurrence chip */}
        {recurrenceType ? (
          <button
            type="button"
            onClick={() => {
              setRecurrenceType(null);
              setRecurrenceInterval(1);
              setRecurrenceEndDate(null);
              setRecurrenceWeekdays(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/30 transition-all hover:opacity-80"
          >
            <Repeat size={12} />
            {recurrenceInterval > 1 ? `Every ${recurrenceInterval} ${recurrenceType}s` : `${recurrenceType.charAt(0).toUpperCase() + recurrenceType.slice(1)}ly`}
            <X size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRecurrenceType("daily")}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            <Repeat size={12} />
            Repeat
          </button>
        )}

        {/* Lock toggle */}
        <button
          type="button"
          onClick={() => setLocked(!locked)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
            locked
              ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {locked ? <Lock size={12} /> : <Unlock size={12} />}
          {locked ? "Locked" : "Lock"}
        </button>

        {/* Show details toggle */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
            showDetails || description || dueDate
              ? "border-primary/50 bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar size={12} />
          Details
        </button>
      </div>

      {/* Expanded details */}
      {(showDetails || description || dueDate || schedulingMode === "manual" || recurrenceType) && (
        <div className="space-y-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
          {/* Focus mode expanded selector (when focus is set) */}
          {focusMode && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFocusMode(null)}
                className="px-2.5 py-1 text-xs rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                None
              </button>
              {focusModes.map(([mode, cfg]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFocusMode(mode)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-all",
                    focusMode === mode
                      ? "text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                  style={focusMode === mode ? { backgroundColor: cfg.color } : undefined}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: focusMode === mode ? "white" : cfg.color }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          )}

          {/* Recurrence expanded selector */}
          {recurrenceType && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(["daily", "weekly", "monthly"] as RecurrenceType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRecurrenceType(type)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-full transition-all",
                      recurrenceType === type
                        ? "bg-purple-500 text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              {recurrenceType && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 text-xs border border-border rounded bg-background text-center"
                  />
                  <span className="text-xs text-muted-foreground">
                    {recurrenceType}{recurrenceInterval > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Manual scheduling time pickers */}
          {schedulingMode === "manual" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
            </div>
          )}

          {/* Due date */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Due date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, links, subtasks..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading || !title.trim()} className="flex-1" size="lg">
          {loading ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <Plus size={16} className="mr-2" />
          )}
          {isEditing ? "Update" : "Add Task"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} size="lg">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}