"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Calendar, Target, TrendingUp } from "lucide-react";
import { Reflection, ReflectionType } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { getReflectionById, deleteReflection } from "@/lib/reflections";
import { REFLECTION_LABELS, REFLECTION_PROMPTS, getPeriodLabel } from "@/lib/reflections";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_ICONS = {
  daily: <Calendar className="w-4 h-4" />,
  weekly: <Target className="w-4 h-4" />,
  monthly: <TrendingUp className="w-4 h-4" />,
};

interface ReflectionViewProps {
  reflectionId: string;
}

export default function ReflectionView({ reflectionId }: ReflectionViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadReflection();
  }, [reflectionId]);

  const loadReflection = async () => {
    if (!user) return;

    setLoading(true);
    const data = await getReflectionById(reflectionId);
    
    if (!data || data.user_id !== user.id) {
      toast.error("Reflection not found");
      router.push("/reflections");
      return;
    }
    
    setReflection(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!reflection || !user) return;

    if (!confirm("Are you sure you want to delete this reflection?")) {
      return;
    }

    setDeleting(true);

    try {
      await deleteReflection(reflection.id);
      toast.success("Reflection deleted");
      router.push("/reflections");
    } catch (error) {
      console.error("Error deleting reflection:", error);
      toast.error("Failed to delete reflection");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!reflection) return;
    router.push(`/reflections/new?edit=${reflection.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!reflection) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Reflection not found</h3>
        <p className="text-muted-foreground mb-4">
          This reflection doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => router.push("/reflections")}>
          Back to Reflections
        </Button>
      </div>
    );
  }

  const config = REFLECTION_LABELS[reflection.type];
  const periodLabel = getPeriodLabel(reflection.type, reflection.period_start);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{periodLabel}</h1>
            <p className="text-muted-foreground">
              {formatDate(reflection.updated_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {TYPE_ICONS[reflection.type]}
              <Badge 
                variant="secondary" 
                className={cn(config.color, config.bg)}
              >
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {reflection.mood && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Mood:</span>
                  <span>{reflection.mood}</span>
                </div>
              )}
              
              {reflection.energy_level && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Energy:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < reflection.energy_level! ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reflection Content */}
      <div className="space-y-4">
        {REFLECTION_PROMPTS[reflection.type].map((prompt) => {
          const value = reflection.sections[prompt.key];
          if (!value?.trim()) return null;
          return (
            <Card key={prompt.key}>
              <CardHeader>
                <CardTitle className="text-lg">{prompt.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
