"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FocusMode, FOCUS_MODE_CONFIG } from "@/types";
import { HelpCircle } from "lucide-react";

interface FocusModeSelectorProps {
  selectedMode: FocusMode | null;
  onModeChange: (mode: FocusMode | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function FocusModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
  compact = false,
}: FocusModeSelectorProps) {
  const [showTooltip, setShowTooltip] = useState<FocusMode | null>(null);

  const modes = Object.entries(FOCUS_MODE_CONFIG) as [FocusMode, typeof FOCUS_MODE_CONFIG[FocusMode]][];

  if (compact) {
    // Compact mode for inline display (like in task cards)
    return (
      <div className="flex gap-1">
        {modes.map(([mode, cfg]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            disabled={disabled}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-all",
              selectedMode === mode
                ? "border-2"
                : "border border-transparent hover:border-muted-foreground/30"
            )}
            style={{
              backgroundColor: selectedMode === mode ? cfg.color : "transparent",
              borderColor: selectedMode === mode ? cfg.color : undefined,
            }}
            title={`${cfg.label}: ${cfg.description}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* None option */}
        <button
          type="button"
          onClick={() => onModeChange(null)}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
            selectedMode === null
              ? "bg-secondary border-border text-foreground"
              : "bg-transparent border-border/50 text-muted-foreground hover:border-border",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          None
        </button>

        {/* Focus mode options */}
        {modes.map(([mode, cfg]) => (
          <div key={mode} className="relative">
            <button
              type="button"
              onClick={() => onModeChange(mode)}
              onMouseEnter={() => setShowTooltip(mode)}
              onMouseLeave={() => setShowTooltip(null)}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                selectedMode === mode
                  ? "text-white"
                  : "bg-transparent hover:bg-secondary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                backgroundColor: selectedMode === mode ? cfg.color : undefined,
                borderColor: selectedMode === mode ? cfg.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: selectedMode === mode ? "white" : cfg.color,
                }}
              />
              {cfg.label}
            </button>

            {/* Tooltip with suggestion */}
            {showTooltip === mode && (
              <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-popover border border-border rounded-lg shadow-lg text-xs">
                <p className="font-medium text-foreground mb-1">{cfg.description}</p>
                <p className="text-muted-foreground flex items-start gap-1">
                  <HelpCircle size={12} className="mt-0.5 flex-shrink-0" />
                  {cfg.suggestion}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected mode description */}
      {selectedMode && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: FOCUS_MODE_CONFIG[selectedMode].color }}
          />
          {FOCUS_MODE_CONFIG[selectedMode].description} — {FOCUS_MODE_CONFIG[selectedMode].suggestion}
        </p>
      )}
    </div>
  );
}