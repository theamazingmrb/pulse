"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ui/image-upload";
import { Project, ProjectStatus } from "@/types";
import { PROJECT_COLORS } from "@/lib/projects";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectFormProps {
  project?: Project;
  onSubmit: (project: Omit<Project, "id" | "created_at" | "updated_at"> & { user_id: string }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProjectForm({
  project,
  onSubmit,
  onCancel,
  loading = false,
}: ProjectFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: project?.name || "",
    description: project?.description || "",
    color: project?.color || PROJECT_COLORS[0],
    status: project?.status || "active" as ProjectStatus,
    image_url: project?.image_url || null,
    banner_url: project?.banner_url || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    await onSubmit({ ...formData, user_id: user!.id });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{project ? "Edit Project" : "Create Project"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Banner Image */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Banner Image</Label>
            <ImageUpload
              value={formData.banner_url}
              onChange={(url) => setFormData({ ...formData, banner_url: url })}
              bucket="project-banners"
              aspectRatio="banner"
              maxSize={2}
            />
          </div>

          {/* Project Icon */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Project Icon</Label>
            <ImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              bucket="project-banners"
              aspectRatio="square"
              maxSize={1}
            />
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter project description (optional)"
              rows={3}
            />
          </div>

          {/* Color */}
          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 transition-all",
                    formData.color === color
                      ? "border-foreground scale-110"
                      : "border-border hover:border-muted-foreground"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: ProjectStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : project ? "Update Project" : "Create Project"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
