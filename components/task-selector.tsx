"use client";
import { Task } from "@/types";
import { cn, STATUS_COLORS } from "@/lib/utils";
import { Check } from "lucide-react";

interface TaskSelectorProps {
  tasks: Task[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export default function TaskSelector({ tasks, selected, onChange }: TaskSelectorProps) {
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== "done");

  if (!activeTasks.length) {
    return <p className="text-sm text-muted-foreground">No active tasks — add some in Tasks.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {activeTasks.map((task) => {
        const isSelected = selected.includes(task.id);
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => toggle(task.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary hover:border-primary/50"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors",
              isSelected ? "bg-primary border-primary" : "border-border"
            )}>
              {isSelected && <Check size={12} className="text-primary-foreground" />}
            </div>
            <span className="flex-1 truncate">{task.title}</span>
            {task.project_id && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full border", "bg-secondary text-muted-foreground border-border")}>
                Project
              </span>
            )}
            <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize", STATUS_COLORS[task.status])}>
              {task.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}
