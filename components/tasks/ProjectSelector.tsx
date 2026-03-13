"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Project } from "@/types";
import { getActiveProjects, createProject, PROJECT_COLORS } from "@/lib/projects";
import { useAuth } from "@/lib/auth-context";
import { Plus, ChevronDown, Folder } from "lucide-react";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  disabled?: boolean;
}

export default function ProjectSelector({
  selectedProjectId,
  onProjectChange,
  disabled = false,
}: ProjectSelectorProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    const data = await getActiveProjects(user.id);
    setProjects(data);
  };

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) return;

    setLoading(true);
    const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    
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
      onProjectChange(newProject.id);
      setNewProjectName("");
      setIsCreating(false);
    }
    setLoading(false);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm text-left",
          "border border-border bg-background",
          "flex items-center justify-between gap-2",
          "hover:border-primary/50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedProject ? (
            <>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedProject.color }}
              />
              <span>{selectedProject.name}</span>
            </>
          ) : (
            <>
              <Folder size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">No project</span>
            </>
          )}
        </div>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
            }}
          />
          <div className="absolute z-20 top-full left-0 right-0 mt-1 py-1 rounded-lg border border-border bg-card shadow-lg max-h-64 overflow-auto">
            <button
              type="button"
              onClick={() => {
                onProjectChange(null);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-sm text-left flex items-center gap-2",
                "hover:bg-secondary transition-colors",
                !selectedProjectId && "bg-primary/10 text-primary"
              )}
            >
              <Folder size={14} className="text-muted-foreground" />
              <span>No project</span>
            </button>

            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  onProjectChange(project.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left flex items-center gap-2",
                  "hover:bg-secondary transition-colors",
                  selectedProjectId === project.id && "bg-primary/10 text-primary"
                )}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span>{project.name}</span>
              </button>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              {isCreating ? (
                <div className="px-3 py-2 flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                      if (e.key === "Escape") setIsCreating(false);
                    }}
                    placeholder="Project name..."
                    className="flex-1 px-2 py-1 text-sm bg-secondary border border-border rounded"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={loading || !newProjectName.trim()}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Plus size={14} />
                  <span>New project</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
