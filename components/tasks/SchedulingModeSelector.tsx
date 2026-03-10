"use client";

import { cn } from "@/lib/utils";
import { Zap, Hand } from "lucide-react";
import { SchedulingMode } from "@/types";

interface SchedulingModeSelectorProps {
  selectedMode: SchedulingMode;
  onModeChange: (mode: SchedulingMode) => void;
  disabled?: boolean;
}

export default function SchedulingModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: SchedulingModeSelectorProps) {
  const modes = [
    {
      value: "auto" as SchedulingMode,
      label: "Auto",
      icon: Zap,
      description: "AI finds the best time slot",
    },
    {
      value: "manual" as SchedulingMode,
      label: "Manual",
      icon: Hand,
      description: "You choose when to do it",
    },
  ];

  return (
    <div className="flex gap-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onModeChange(mode.value)}
            disabled={disabled}
            className={cn(
              "flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              "border flex items-center justify-center gap-2",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon size={16} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
