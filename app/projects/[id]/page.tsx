"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Calendar, Clock, CheckCircle2, Target, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project, Task, FocusMode, FOCUS_MODE_CONFIG } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { getProject } from "@/lib/projects";
import { getTasks, updateTask } from "@/lib/tasks";
import { cn, formatDate } from "@/lib/utils";
import AuthGuard from "@/components/auth-guard";
import Image from "next/image";
import TaskForm from "@/components/tasks/TaskForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIORITY_CONFIG } from "@/lib/tasks";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    if (user && projectId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  async function loadData() {
    setLoading(true);
    const [projectData, tasksData] = await Promise.all([
      getProject(projectId),
      getTasks(user!.id),
    ]);
    setProject(projectData);
    setTasks(tasksData.filter(t => t.project_id === projectId));
    setLoading(false);
  }

  // Task stats
  const taskStats = {
    total: tasks.length,
    active: tasks.filter(t => t.status === "active").length,
    waiting: tasks.filter(t => t.status === "waiting").length,
    someday: tasks.filter(t => t.status === "someday").length,
    done: tasks.filter(t => t.status === "done").length,
    byFocusMode: {
      deep: tasks.filter(t => t.focus_mode === "deep").length,
      quick: tasks.filter(t => t.focus_mode === "quick").length,
      planning: tasks.filter(t => t.focus_mode === "planning").length,
      admin: tasks.filter(t => t.focus_mode === "admin").length,
    },
  };

  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.done / taskStats.total) * 100) 
    : 0;

  async function handleToggleComplete(task: Task) {
    const newStatus = task.status === "done" ? "active" : "done";
    await updateTask(task.id, { status: newStatus });
    loadData();
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </AuthGuard>
    );
  }

  if (!project) {
    return (
      <AuthGuard>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <FolderOpen className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Project not found</h2>
          <Button onClick={() => router.push("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto p-6">
        {/* Back link */}
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Project Header */}
        <div className="relative mb-8">
          {/* Banner */}
          <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted/50">
            {project.banner_url ? (
              <>
                <Image
                  src={project.banner_url}
                  alt={project.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              </>
            ) : (
              <div 
                className="absolute inset-0 opacity-30"
                style={{ backgroundColor: project.color }}
              />
            )}
          </div>

          {/* Icon + Title */}
          <div className="absolute -bottom-8 left-6">
            {project.image_url ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-background shadow-xl">
                <Image
                  src={project.image_url}
                  alt={project.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center border-4 border-background shadow-xl"
                style={{ backgroundColor: project.color }}
              >
                <FolderOpen className="w-10 h-10 text-white" />
              </div>
            )}
          </div>

          {/* Edit button */}
          <div className="absolute top-4 right-4">
            <Button variant="secondary" size="sm" onClick={() => router.push(`/projects?edit=${project.id}`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <div className="mt-12 mb-8">
          <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mb-4">{project.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDate(project.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Updated {formatDate(project.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{taskStats.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{completionRate}%</div>
                  <div className="text-sm text-muted-foreground">Complete</div>
                </div>
                <Progress value={completionRate} className="w-16 h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Focus Mode Breakdown */}
        {taskStats.total > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Focus Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(taskStats.byFocusMode).map(([mode, count]) => {
                  const config = FOCUS_MODE_CONFIG[mode as FocusMode];
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={mode}
                      style={{ backgroundColor: config.color }}
                      className="text-white"
                    >
                      {count} {config.label}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button size="sm" onClick={() => setShowTaskForm(true)}>
            <Target className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No tasks in this project yet</p>
              <Button onClick={() => setShowTaskForm(true)}>
                <Target className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const priorityConfig = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
              return (
                <Card key={task.id} className={cn("transition-all", task.status === "done" && "opacity-60")}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={cn(
                          "w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                          task.status === "done"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-border hover:border-primary"
                        )}
                      >
                        {task.status === "done" && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", task.status === "done" && "line-through")}>
                            {task.title}
                          </span>
                          {task.focus_mode && (
                            <Badge
                              variant="outline"
                              style={{ borderColor: FOCUS_MODE_CONFIG[task.focus_mode].color }}
                              className="text-xs"
                            >
                              {FOCUS_MODE_CONFIG[task.focus_mode].label}
                            </Badge>
                          )}
                        </div>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due {formatDate(task.due_date)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: priorityConfig?.color }}
                          title={priorityConfig?.label}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/tasks/${task.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Task Form Dialog */}
        <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Task to {project.name}</DialogTitle>
            </DialogHeader>
            <TaskForm
              defaultProjectId={project.id}
              onSuccess={() => {
                setShowTaskForm(false);
                loadData();
              }}
              onCancel={() => setShowTaskForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}