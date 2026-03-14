"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Target, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";

interface QuickStartGuideProps {
  hasProjects: boolean;
  hasTasks: boolean;
  hasReflections: boolean;
}

export default function QuickStartGuide({ hasProjects, hasTasks, hasReflections }: QuickStartGuideProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const allComplete = hasProjects && hasTasks && hasReflections;

  if (isDismissed || allComplete) return null;

  const steps = [
    {
      id: "projects",
      title: "Create a Project",
      description: "Organize your work into projects",
      icon: FolderOpen,
      href: "/projects?create=true",
      completed: hasProjects,
    },
    {
      id: "tasks",
      title: "Add Your First Task",
      description: "Break down your work into tasks",
      icon: Target,
      href: "/tasks",
      completed: hasTasks,
    },
    {
      id: "reflections",
      title: "Start Reflecting",
      description: "Write your first daily reflection",
      icon: Calendar,
      href: "/reflections/new?type=daily",
      completed: hasReflections,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Start Guide</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedCount} of {steps.length} completed
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link key={step.id} href={step.href}>
              <div
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-all
                  ${step.completed 
                    ? 'bg-muted/50 border-muted opacity-60' 
                    : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${step.completed ? 'bg-primary/20' : 'bg-primary/10'}
                  `}>
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <Icon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${step.completed ? 'line-through' : ''}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
                {!step.completed && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
