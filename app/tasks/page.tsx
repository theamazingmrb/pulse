"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Task, TaskStatus, PROJECT_OPTIONS } from "@/types";
import { cn, PROJECT_COLORS, STATUS_COLORS } from "@/lib/utils";
import { Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BookOpen } from "lucide-react";

const STATUS_TABS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "someday", label: "Someday" },
  { value: "done", label: "Done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("active");
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("tasks").insert({
      title: newTitle.trim(),
      project: newProject || null,
      status: "active",
    });
    setAdding(false);
    if (error) { toast.error("Failed to add task"); return; }
    setNewTitle("");
    setNewProject("");
    toast.success("Task added");
    load();
  }

  async function updateStatus(id: string, status: TaskStatus) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    load();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Task deleted");
    load();
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Tasks</h1>
        <p className="text-muted-foreground text-sm">Keep it simple — what are you actually doing?</p>
      </div>

      {/* Add task */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6 flex gap-3">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <select
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary text-muted-foreground"
        >
          <option value="">Project</option>
          {PROJECT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Button size="sm" onClick={addTask} disabled={adding || !newTitle.trim()}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
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

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks here.</p>
        ) : (
          filtered.map((task) => (
            <div key={task.id}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-colors"
            >
              <button
                onClick={() => updateStatus(task.id, task.status === "done" ? "active" : "done")}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors",
                  task.status === "done" ? "bg-green-500 border-green-500" : "border-border hover:border-primary"
                )}
              >
                {task.status === "done" && <Check size={12} className="text-white" />}
              </button>

              <span className={cn("flex-1 text-sm", task.status === "done" && "line-through text-muted-foreground")}>
                {task.title}
              </span>

              {task.project && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full border", PROJECT_COLORS[task.project] ?? "bg-secondary border-border text-muted-foreground")}>
                  {task.project}
                </span>
              )}

              <select
                value={task.status}
                onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
                className={cn("text-xs px-2 py-0.5 rounded-full border bg-transparent outline-none cursor-pointer capitalize", STATUS_COLORS[task.status])}
              >
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="someday">Someday</option>
                <option value="done">Done</option>
              </select>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/journal/new`} title="Journal about this task">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <BookOpen size={13} />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                  onClick={() => deleteTask(task.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
