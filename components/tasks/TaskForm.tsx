"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Task, SchedulingMode, FocusMode, RecurrenceType } from "@/types";
import { createTask, updateTask } from "@/lib/tasks";
import { useAuth } from "@/lib/auth-context";
import PrioritySelector from "./PrioritySelector";
import SchedulingModeSelector from "./SchedulingModeSelector";
import ProjectSelector from "./ProjectSelector";
import FocusModeSelector from "./FocusModeSelector";
import RecurrenceSelector from "./RecurrenceSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock, Calendar, Lock, Unlock, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";

interface TaskFormProps {
  initialData?: Partial<Task>;
  defaultProjectId?: string;
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
}

export default function TaskForm({ initialData, defaultProjectId, onSuccess, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [projectId, setProjectId] = useState<string | null>(initialData?.project_id || defaultProjectId || null);
  const [priorityLevel, setPriorityLevel] = useState(initialData?.priority_level || 1);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(
    initialData?.scheduling_mode || "auto"
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    initialData?.estimated_duration || 30
  );
  const [focusMode, setFocusMode] = useState<FocusMode | null>(
    (initialData as Task & { focus_mode?: FocusMode | null })?.focus_mode || null
  );
  const [startTime, setStartTime] = useState(
    initialData?.start_time
      ? new Date(initialData.start_time).toISOString().slice(0, 16)
      : ""
  );
  const [endTime, setEndTime] = useState(
    initialData?.end_time
      ? new Date(initialData.end_time).toISOString().slice(0, 16)
      : ""
  );
  const [dueDate, setDueDate] = useState(
    initialData?.due_date
      ? new Date(initialData.due_date).toISOString().slice(0, 16)
      : ""
  );
  const [locked, setLocked] = useState(initialData?.locked || false);
  
  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(
    (initialData as Task & { recurrence_type?: RecurrenceType | null })?.recurrence_type || null
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    initialData?.recurrence_interval || 1
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(
    initialData?.recurrence_end_date || null
  );
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[] | null>(
    initialData?.recurrence_weekdays || null
  );

  const isEditing = !!initialData?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !user) return;

    // Validation for manual mode
    if (schedulingMode === "manual") {
      if (!startTime || !endTime) {
        toast.error("Please specify both start and end times for manual scheduling");
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
        if (!isEditing) {
          resetForm();
        }
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
    setFocusMode(null);
    setStartTime("");
    setEndTime("");
    setDueDate("");
    setLocked(false);
    setRecurrenceType(null);
    setRecurrenceInterval(1);
    setRecurrenceEndDate(null);
    setRecurrenceWeekdays(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Task</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Details (optional)</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more context..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Project */}
      <div className="space-y-1.5">
        <Label>Project</Label>
        <ProjectSelector
          selectedProjectId={projectId}
          onProjectChange={setProjectId}
          disabled={loading}
        />
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <PrioritySelector
          selectedPriority={priorityLevel}
          onPriorityChange={setPriorityLevel}
          disabled={loading}
        />
      </div>

      {/* Focus Mode */}
      <div className="space-y-1.5">
        <Label>Focus Mode (optional)</Label>
        <FocusModeSelector
          selectedMode={focusMode}
          onModeChange={setFocusMode}
          disabled={loading}
        />
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label>Estimated Duration</Label>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          <input
            type="number"
            min="5"
            max="480"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(Math.max(5, parseInt(e.target.value) || 5))}
            className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">minutes</span>
          <div className="flex gap-1 ml-auto">
            {[15, 30, 60, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setEstimatedDuration(mins)}
                className={cn(
                  "px-2 py-1 text-xs rounded border transition-colors",
                  estimatedDuration === mins
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduling Mode */}
      <div className="space-y-1.5">
        <Label>Scheduling</Label>
        <SchedulingModeSelector
          selectedMode={schedulingMode}
          onModeChange={setSchedulingMode}
          disabled={loading}
        />
      </div>

      {/* Manual Time Selection */}
      {schedulingMode === "manual" && (
        <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Start</Label>
              <input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">End</Label>
              <input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Due Date */}
      <div className="space-y-1.5">
        <Label htmlFor="due-date">Due Date (optional)</Label>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground" />
          <input
            id="due-date"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Lock Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLocked(!locked)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors",
            locked
              ? "border-amber-500 bg-amber-500/10 text-amber-500"
              : "border-border text-muted-foreground hover:bg-secondary"
          )}
        >
          {locked ? <Lock size={14} /> : <Unlock size={14} />}
          <span>{locked ? "Locked" : "Lock task"}</span>
        </button>
        <span className="text-xs text-muted-foreground">
          {locked ? "Won't be auto-rescheduled" : "Can be auto-rescheduled"}
        </span>
      </div>

      {/* Recurrence */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          <Repeat size={14} className="text-muted-foreground" />
          Recurrence
        </Label>
        <RecurrenceSelector
          recurrenceType={recurrenceType}
          recurrenceInterval={recurrenceInterval}
          recurrenceEndDate={recurrenceEndDate}
          recurrenceWeekdays={recurrenceWeekdays}
          onChange={({ recurrence_type, recurrence_interval, recurrence_end_date, recurrence_weekdays }) => {
            setRecurrenceType(recurrence_type);
            setRecurrenceInterval(recurrence_interval);
            setRecurrenceEndDate(recurrence_end_date);
            setRecurrenceWeekdays(recurrence_weekdays);
          }}
          disabled={loading}
        />
        {recurrenceType && (
          <p className="text-xs text-muted-foreground">
            This task will automatically create the next instance when completed.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
          {loading ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <Plus size={16} className="mr-2" />
          )}
          {isEditing ? "Update Task" : "Create Task"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
