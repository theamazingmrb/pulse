"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  FolderOpen, 
  Calendar, 
  Music, 
  Target,
  X,
  SkipForward
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  skip?: boolean;
  progress?: number;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps: OnboardingStep[];
}

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete,
  steps,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleStepAction = () => {
    if (currentStepData.action) {
      currentStepData.action.onClick();
    }
    handleNext();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Welcome to Pulse
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-semibold mb-3">{currentStepData.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}

            {currentStepData.action ? (
              <Button
                onClick={handleStepAction}
                className="flex-1"
              >
                {currentStepData.action.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className={cn(
                  "flex-1",
                  currentStep > 0 && "ml-auto"
                )}
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStepData.skip && currentStep < steps.length - 1 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentStep
                    ? "bg-primary"
                    : completedSteps.has(index)
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Default onboarding steps for Pulse
export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Pulse",
    description: "Your personal productivity companion that helps you organize tasks, track progress, and stay focused on what matters most.",
    icon: <Sparkles className="w-8 h-8 text-primary" />,
  },
  {
    id: "projects",
    title: "Organize with Projects",
    description: "Create projects to group related tasks. Add custom colors, descriptions, and even project images to make them uniquely yours.",
    icon: <FolderOpen className="w-8 h-8 text-primary" />,
    action: {
      label: "Create Your First Project",
      onClick: () => {
        // Navigate to projects page with create modal open
        window.location.href = "/projects?create=true";
      },
    },
    skip: true,
  },
  {
    id: "tasks",
    title: "Manage Your Tasks",
    description: "Break down your work into manageable tasks. Set priorities, due dates, and track your progress with our smart scheduling system.",
    icon: <Target className="w-8 h-8 text-primary" />,
    action: {
      label: "View Tasks",
      onClick: () => {
        window.location.href = "/tasks";
      },
    },
    skip: true,
  },
  {
    id: "journal",
    title: "Reflect & Grow",
    description: "Use the journal to capture thoughts, track your mood, and reflect on your progress. Build a habit of daily reflection.",
    icon: <Calendar className="w-8 h-8 text-primary" />,
    action: {
      label: "Open Journal",
      onClick: () => {
        window.location.href = "/journal";
      },
    },
    skip: true,
  },
  {
    id: "playlist",
    title: "Focus with Music",
    description: "Connect your Spotify account to create focus playlists that help you stay in the zone while working on important tasks.",
    icon: <Music className="w-8 h-8 text-primary" />,
    action: {
      label: "Set Up Spotify",
      onClick: () => {
        window.location.href = "/playlist";
      },
    },
    skip: true,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Pulse is ready to help you achieve your goals. Remember to check in daily and keep your tasks organized.",
    icon: <Check className="w-8 h-8 text-primary" />,
  },
];
