"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { createTask, PRIORITY_CONFIG } from "@/lib/tasks";
import { getActiveProjects } from "@/lib/projects";
import { Project, FocusMode, FOCUS_MODE_CONFIG } from "@/types";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, Check, Calendar, Folder, Sparkles } from "lucide-react";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "title" | "priority" | "project" | "dueDate";

export default function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<number>(2); // Default to Warm
  const [projectId, setProjectId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode | null>(null);
  const [dueDate, setDueDate] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("title");
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent projects
  useEffect(() => {
    if (open && user) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setPriority(2);
      setProjectId(null);
      setFocusMode(null);
      setDueDate("");
      setStep("title");
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const loadProjects = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getActiveProjects(user.id);
    setProjects(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;

    setSubmitting(true);
    try {
      const taskData = {
        user_id: user.id,
        title: title.trim(),
        description: null,
        project_id: projectId,
        priority_level: priority,
        scheduling_mode: "auto" as const,
        estimated_duration: 30,
        start_time: null,
        end_time: null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        locked: false,
        status: "active" as const,
        notes: null,
        image_url: null,
        focus_mode: focusMode,
      };

      const result = await createTask(taskData);

      if (result) {
        const priorityLabel = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.label || "Warm";
        toast.success(`Task created`, {
          description: `"${title.trim()}" added to ${priorityLabel}`,
        });
        onOpenChange(false);
      } else {
        toast.error("Failed to create task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      if (step === "title" && title.trim()) {
        // Move to priority selection or submit directly
        handleSubmit();
      }
    }
    
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Go backwards
        if (step === "project") setStep("priority");
        else if (step === "dueDate") setStep("project");
        else if (step === "title") setStep("dueDate");
      } else {
        // Go forwards
        if (step === "title") setStep("priority");
        else if (step === "priority") setStep("project");
        else if (step === "project") setStep("dueDate");
      }
    }
  };

  const priorityOptions = Object.entries(PRIORITY_CONFIG).map(([level, config]) => ({
    level: parseInt(level),
    ...config,
  }));

  return (
    <Command
      className="rounded-lg border shadow-md"
      onKeyDown={handleKeyDown}
    >
      {/* Title Input - Always visible */}
      <div className="flex items-center border-b px-3">
        <Sparkles className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <CommandInput
          ref={inputRef}
          placeholder="What needs to be done?"
          value={title}
          onValueChange={setTitle}
          className="flex-1"
        />
      </div>

      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-6 text-center text-sm">
          {title.trim() ? "Press Enter to create task" : "Start typing to add a task"}
        </CommandEmpty>

        {/* Priority Selection */}
        <CommandGroup heading="Priority">
          {priorityOptions.map((p) => (
            <CommandItem
              key={p.level}
              value={`priority-${p.level}`}
              onSelect={() => setPriority(p.level)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-muted-foreground">
                  {p.description}
                </span>
              </div>
              {priority === p.level && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Focus Mode Selection */}
        <CommandGroup heading="Focus Mode">
          <CommandItem
            value="focus-none"
            onSelect={() => setFocusMode(null)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-border" />
              <span className="font-medium">None</span>
            </div>
            {!focusMode && <Check className="h-4 w-4 text-primary" />}
          </CommandItem>
          {Object.entries(FOCUS_MODE_CONFIG).map(([mode, cfg]) => (
            <CommandItem
              key={mode}
              value={`focus-${mode}`}
              onSelect={() => setFocusMode(mode as FocusMode)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="font-medium">{cfg.label}</span>
                <span className="text-xs text-muted-foreground">
                  {cfg.description}
                </span>
              </div>
              {focusMode === mode && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Projects */}
        <CommandGroup heading="Project">
          <CommandItem
            value="no-project"
            onSelect={() => setProjectId(null)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>No project</span>
            </div>
            {!projectId && <Check className="h-4 w-4 text-primary" />}
          </CommandItem>
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            projects.slice(0, 5).map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.id}-${project.name.toLowerCase()}`}
                onSelect={() => setProjectId(project.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </div>
                {projectId === project.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Due Date */}
        <CommandGroup heading="Due Date">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Add due date"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </CommandGroup>

        <CommandSeparator />

        {/* Submit Button */}
        <div className="p-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
              title.trim() && !submitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create Task
                <span className="text-xs opacity-70 ml-auto">Enter</span>
              </>
            )}
          </button>
        </div>

        {/* Keyboard Hints */}
        <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-secondary">Tab</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-secondary">Esc</kbd> to close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-secondary">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded bg-secondary">K</kbd>
          </span>
        </div>
      </CommandList>
    </Command>
  );
}