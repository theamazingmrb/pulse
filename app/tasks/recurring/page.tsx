"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import { Plus, Repeat, ChevronRight, Clock, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getRecurringTaskTemplates, deleteTask, PRIORITY_CONFIG } from "@/lib/tasks";
import { formatRecurrence, getNextOccurrenceText } from "@/lib/recurrence";
import TaskForm from "@/components/tasks/TaskForm";
import AuthGuard from "@/components/auth-guard";

export default function RecurringTasksPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
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
    const data = await getRecurringTaskTemplates(user.id);
    setTemplates(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const success = await deleteTask(id);
    if (success) {
      toast.success("Recurring task deleted");
      load();
    } else {
      toast.error("Failed to delete recurring task");
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Recurring Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Tasks that repeat on a schedule. Complete one instance and the next is automatically created.
          </p>
        </div>

        {/* Add template button / form */}
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
            <Plus size={16} className="mr-2" /> New Recurring Task
          </Button>
        )}

        {/* Templates list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <Repeat size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-2">No recurring tasks yet</p>
            <p className="text-xs text-muted-foreground opacity-60">
              Create a task with recurrence to see it here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {templates.map((template) => {
              const priorityConfig = PRIORITY_CONFIG[template.priority_level as keyof typeof PRIORITY_CONFIG];
              const nextOccurrence = getNextOccurrenceText(template);

              return (
                <div
                  key={template.id}
                  className="group rounded-lg border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Recurrence icon */}
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Repeat size={14} className="text-purple-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/tasks/${template.id}`}
                        className="text-sm font-medium hover:underline block truncate"
                      >
                        {template.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="text-purple-400">{formatRecurrence(template)}</span>
                        {nextOccurrence && (
                          <span>• Next: {nextOccurrence}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {template.estimated_duration}m
                        </span>
                      </div>
                    </div>

                    {/* Priority */}
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: priorityConfig?.color }}
                      title={priorityConfig?.label}
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/tasks/${template.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronRight size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {/* End date if set */}
                  {template.recurrence_end_date && (
                    <div className="px-4 pb-3 pt-0">
                      <span className="text-xs text-muted-foreground">
                        <Calendar size={10} className="inline mr-1" />
                        Ends: {new Date(template.recurrence_end_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}