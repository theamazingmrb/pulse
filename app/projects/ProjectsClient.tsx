"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Folder, MoreHorizontal, Edit, Trash2, Archive, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project, ProjectStatus, Task, FocusMode, FOCUS_MODE_CONFIG } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { getProjects, deleteProject, updateProject, createProject } from "@/lib/projects";
import { getTasks } from "@/lib/tasks";
import { cn, formatDate } from "@/lib/utils";
import AuthGuard from "@/components/auth-guard";
import Image from "next/image";
import ProjectForm from "@/components/projects/ProjectForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; textColor: string }> = {
  active: { label: "Active", color: "bg-green-500/10", textColor: "text-green-600" },
  completed: { label: "Completed", color: "bg-blue-500/10", textColor: "text-blue-600" },
  archived: { label: "Archived", color: "bg-gray-500/10", textColor: "text-gray-600" },
  on_hold: { label: "On Hold", color: "bg-yellow-500/10", textColor: "text-yellow-600" },
};

const FOCUS_MODE_FILTERS: { value: FocusMode | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "#6B7280" },
  { value: "deep", label: "Deep", color: FOCUS_MODE_CONFIG.deep.color },
  { value: "quick", label: "Quick", color: FOCUS_MODE_CONFIG.quick.color },
  { value: "planning", label: "Planning", color: FOCUS_MODE_CONFIG.planning.color },
  { value: "admin", label: "Admin", color: FOCUS_MODE_CONFIG.admin.color },
];

function ProjectsClientInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromQuickStart = searchParams.get("create") === "true";
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(fromQuickStart);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [focusModeFilter, setFocusModeFilter] = useState<FocusMode | "all">("all");

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [projectData, taskData] = await Promise.all([
      getProjects(user.id),
      getTasks(user.id)
    ]);
    setProjects(projectData);
    setTasks(taskData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  const handleDelete = async (id: string) => {
    const success = await deleteProject(id);
    if (success) {
      loadProjects();
    }
  };

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    const success = await updateProject(id, { status });
    if (success) {
      loadProjects();
    }
  };

  const handleCreate = async (projectData: Omit<Project, "id" | "created_at" | "updated_at"> & { user_id: string }) => {
    const success = await createProject(projectData);
    if (success) {
      setShowForm(false);
      if (fromQuickStart) {
        // Return to dashboard so the QuickStartGuide advances to the next step
        router.push("/dashboard");
      } else {
        loadProjects();
      }
    }
  };

  const handleEdit = async (projectData: Omit<Project, "id" | "created_at" | "updated_at"> & { user_id: string }) => {
    if (!editingProject) return;
    const success = await updateProject(editingProject.id, projectData);
    if (success) {
      setEditingProject(undefined);
      loadProjects();
    }
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProject(undefined);
  };

  // Get focus mode breakdown for a project
  const getFocusModeBreakdown = (projectId: string): Record<FocusMode, number> => {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    const breakdown: Record<FocusMode, number> = { deep: 0, quick: 0, planning: 0, admin: 0 };
    projectTasks.forEach(task => {
      if (task.focus_mode) {
        breakdown[task.focus_mode]++;
      }
    });
    return breakdown;
  };

  // Get active focus modes for a project
  const getProjectFocusModes = (projectId: string): FocusMode[] => {
    const breakdown = getFocusModeBreakdown(projectId);
    return (Object.keys(breakdown) as FocusMode[]).filter(mode => breakdown[mode] > 0);
  };

  // Filter projects by focus mode
  const filteredProjects = focusModeFilter === "all"
    ? projects
    : projects.filter(project => {
        const projectFocusModes = getProjectFocusModes(project.id);
        return projectFocusModes.includes(focusModeFilter);
      });

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading projects...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Organize your tasks into meaningful projects
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Focus Mode Filter */}
        <div className="flex gap-1 mb-5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2 self-center">Focus:</span>
          {FOCUS_MODE_FILTERS.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setFocusModeFilter(mode.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                focusModeFilter === mode.value
                  ? "text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground bg-secondary/50"
              )}
              style={{
                backgroundColor: focusModeFilter === mode.value ? mode.color : undefined,
              }}
            >
              {mode.value !== "all" && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: focusModeFilter === mode.value ? "white" : mode.color }}
                />
              )}
              {mode.label}
            </button>
          ))}
        </div>

        {/* Projects Grid - increased gap for better spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50"
            >
              {/* Notion-style Banner with Overlapping Icon */}
              <div className="relative">
                {/* Banner - increased height to h-44 */}
                <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                  {project.banner_url ? (
                    <>
                      <Image
                        src={project.banner_url}
                        alt={project.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    </>
                  ) : (
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                </div>

                {/* Status Badge - positioned in top right of banner */}
                <div className="absolute top-3 right-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-medium backdrop-blur-sm",
                      STATUS_CONFIG[project.status].color,
                      STATUS_CONFIG[project.status].textColor
                    )}
                  >
                    {STATUS_CONFIG[project.status].label}
                  </Badge>
                </div>

                {/* Overlapping Icon - positioned at bottom overlapping into content */}
                <div className="absolute -bottom-8 left-5">
                  {project.image_url ? (
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-4 border-background shadow-xl">
                      <Image
                        src={project.image_url}
                        alt={project.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-background shadow-xl"
                      style={{ backgroundColor: project.color }}
                    >
                      <Folder className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Actions Menu - positioned at bottom right of banner */}
                <div className="absolute -bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0 shadow-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(project.id, "archived")}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content - increased padding top to accommodate overlapping icon */}
              <CardContent className="pt-10 pb-5 px-5">
                {/* Project Name */}
                <h3 className="text-lg font-semibold mb-2 line-clamp-1">{project.name}</h3>

                {/* Description */}
                {project.description ? (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                    {project.description}
                  </p>
                ) : (
                  <div className="mb-4 min-h-[2.5rem]" />
                )}

                {/* Focus Mode Badges & Breakdown */}
                {(() => {
                  const breakdown = getFocusModeBreakdown(project.id);
                  const activeModes = (Object.keys(breakdown) as FocusMode[]).filter(m => breakdown[m] > 0);
                  if (activeModes.length === 0) return null;
                  return (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {activeModes.map(mode => (
                          <span
                            key={mode}
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: FOCUS_MODE_CONFIG[mode].color }}
                            title={FOCUS_MODE_CONFIG[mode].description}
                          >
                            {breakdown[mode]} {FOCUS_MODE_CONFIG[mode].label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer with task count and last updated */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <Link
                    href={`/tasks?project=${project.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View tasks →
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Updated {formatDate(project.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {filteredProjects.length === 0 && projects.length > 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Folder className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects with this focus mode</h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-center">
                Try selecting a different focus mode or create a project with tasks in this category
              </p>
            </div>
          )}
          {projects.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Folder className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-center">
                Create your first project to start organizing your tasks into meaningful collections
              </p>
              <Button onClick={() => setShowForm(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Project
              </Button>
            </div>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={closeForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Edit Project" : "Create New Project"}
              </DialogTitle>
            </DialogHeader>
            <ProjectForm
              project={editingProject}
              onSubmit={editingProject ? handleEdit : handleCreate}
              onCancel={closeForm}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

export default function ProjectsClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">Loading...</div></div>}>
      <ProjectsClientInner />
    </Suspense>
  );
}