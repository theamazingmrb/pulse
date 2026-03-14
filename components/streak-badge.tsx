import { ReflectionType } from "@/types";
import { REFLECTION_LABELS } from "@/lib/reflections";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  type: ReflectionType;
  streak: number;
  longest?: number;
  className?: string;
}

export default function StreakBadge({ type, streak, longest, className }: StreakBadgeProps) {
  const meta = REFLECTION_LABELS[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-4 py-3 min-w-[90px]",
        meta.bg,
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
      <div className="flex items-center gap-1">
        <span className="text-lg">{streak > 0 ? "🔥" : "—"}</span>
        {streak > 0 && (
          <span className={cn("text-xl font-bold", meta.color)}>{streak}</span>
        )}
      </div>
      {streak > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {streak === 1 ? "1 streak" : `${streak} streak`}
          {longest && longest > streak ? ` · best ${longest}` : ""}
        </span>
      )}
      {streak === 0 && (
        <span className="text-[10px] text-muted-foreground">No streak yet</span>
      )}
    </div>
  );
}
