"use client";

import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/scheduling";

interface PrioritySelectorProps {
  selectedPriority: number;
  onPriorityChange: (priority: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function PrioritySelector({
  selectedPriority,
  onPriorityChange,
  disabled = false,
  compact = false,
}: PrioritySelectorProps) {
  const priorities = Object.entries(PRIORITY_CONFIG).map(([level, config]) => ({
    level: parseInt(level),
    ...config,
  }));

  if (compact) {
    return (
      <div className="flex gap-1">
        {priorities.map((priority) => (
          <button
            key={priority.level}
            type="button"
            onClick={() => onPriorityChange(priority.level)}
            disabled={disabled}
            className={cn(
              "w-6 h-6 rounded-full text-xs font-bold transition-all",
              "flex items-center justify-center",
              selectedPriority === priority.level
                ? "ring-2 ring-offset-2 ring-offset-background"
                : "opacity-50 hover:opacity-100"
            )}
            style={{
              backgroundColor: priority.color,
              color: "white",
              ...(selectedPriority === priority.level && { ringColor: priority.color }),
            }}
            title={`${priority.label}: ${priority.description}`}
          >
            {priority.level}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {priorities.map((priority) => (
          <button
            key={priority.level}
            type="button"
            onClick={() => onPriorityChange(priority.level)}
            disabled={disabled}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              "border-2 flex flex-col items-center gap-1",
              selectedPriority === priority.level
                ? "border-current shadow-md"
                : "border-transparent bg-secondary/50 hover:bg-secondary"
            )}
            style={{
              ...(selectedPriority === priority.level && {
                backgroundColor: `${priority.color}20`,
                borderColor: priority.color,
                color: priority.color,
              }),
            }}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: priority.color }}
            />
            <span>{priority.label}</span>
          </button>
        ))}
      </div>
      {selectedPriority && (
        <p className="text-xs text-muted-foreground text-center">
          {PRIORITY_CONFIG[selectedPriority as keyof typeof PRIORITY_CONFIG]?.description}
        </p>
      )}
    </div>
  );
}
