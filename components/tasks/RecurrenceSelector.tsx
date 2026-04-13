"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RecurrenceType } from "@/types";
import {
  RECURRENCE_PRESETS,
  WEEKDAY_OPTIONS,
} from "@/lib/recurrence";
import { Repeat, ChevronDown, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RecurrenceSelectorProps {
  recurrenceType: RecurrenceType | null;
  recurrenceInterval: number;
  recurrenceEndDate: string | null;
  recurrenceWeekdays: number[] | null;
  onChange: (config: {
    recurrence_type: RecurrenceType | null;
    recurrence_interval: number;
    recurrence_end_date: string | null;
    recurrence_weekdays: number[] | null;
  }) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function RecurrenceSelector({
  recurrenceType,
  recurrenceInterval,
  recurrenceEndDate,
  recurrenceWeekdays,
  onChange,
  disabled = false,
  compact = false,
}: RecurrenceSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  const hasRecurrence = recurrenceType !== null;

  const handlePresetSelect = (preset: { type: RecurrenceType; interval: number }) => {
    onChange({
      recurrence_type: preset.type,
      recurrence_interval: preset.interval,
      recurrence_end_date: null,
      recurrence_weekdays: null,
    });
    setExpanded(false);
  };

  const handleCustomTypeSelect = (type: RecurrenceType) => {
    onChange({
      recurrence_type: type,
      recurrence_interval: recurrenceInterval || 1,
      recurrence_end_date: recurrenceEndDate,
      recurrence_weekdays: type === 'weekly' || type === 'custom' ? recurrenceWeekdays : null,
    });
  };

  const handleIntervalChange = (interval: number) => {
    if (interval >= 1 && interval <= 365) {
      onChange({
        recurrence_type: recurrenceType,
        recurrence_interval: interval,
        recurrence_end_date: recurrenceEndDate,
        recurrence_weekdays: recurrenceWeekdays,
      });
    }
  };

  const handleEndDateChange = (date: string) => {
    onChange({
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
      recurrence_end_date: date || null,
      recurrence_weekdays: recurrenceWeekdays,
    });
  };

  const handleWeekdayToggle = (day: number) => {
    const current = recurrenceWeekdays || [];
    const newWeekdays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);

    onChange({
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
      recurrence_end_date: recurrenceEndDate,
      recurrence_weekdays: newWeekdays.length > 0 ? newWeekdays : null,
    });
  };

  const handleClear = () => {
    onChange({
      recurrence_type: null,
      recurrence_interval: 1,
      recurrence_end_date: null,
      recurrence_weekdays: null,
    });
    setExpanded(false);
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border transition-colors",
              hasRecurrence
                ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                : "border-border text-muted-foreground hover:bg-secondary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Repeat size={12} />
            <span>{hasRecurrence ? (() => {
              const interval = recurrenceInterval || 1;
              switch (recurrenceType) {
                case 'daily': return interval === 1 ? 'Daily' : `Every ${interval} days`;
                case 'weekly': return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
                case 'monthly': return interval === 1 ? 'Monthly' : `Every ${interval} months`;
                case 'yearly': return interval === 1 ? 'Yearly' : `Every ${interval} years`;
                default: return 'Custom';
              }
            })() : "Repeat"}</span>
            {hasRecurrence && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="ml-1 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </button>
        </div>

        {expanded && (
          <div className="p-2 rounded-lg border border-border bg-secondary space-y-2">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-1">
              {RECURRENCE_PRESETS.map((preset) => (
                <button
                  key={`${preset.type}-${preset.interval}`}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "px-2 py-1 text-xs rounded border transition-colors",
                    recurrenceType === preset.type && recurrenceInterval === preset.interval
                      ? "border-purple-500 bg-purple-500/10 text-purple-400"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom option */}
            <button
              type="button"
              onClick={() => handleCustomTypeSelect('custom')}
              className={cn(
                "w-full px-2 py-1 text-xs rounded border transition-colors",
                recurrenceType === 'custom'
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              Custom...
            </button>

            {recurrenceType === 'custom' && (
              <div className="space-y-2 pt-2 border-t border-border">
                {/* Interval */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={recurrenceInterval}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                    className="w-16 h-7 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>

                {/* Weekday selector for custom */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">On days:</span>
                  <div className="flex gap-1">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWeekdayToggle(day.value)}
                        className={cn(
                          "w-8 h-8 text-xs rounded border transition-colors",
                          recurrenceWeekdays?.includes(day.value)
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : "border-border text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="space-y-1.5">
      <Label>Recurrence</Label>
      
      {/* Current selection display */}
      {hasRecurrence && !expanded ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-400 transition-colors",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Repeat size={14} />
            <span>{(() => {
              const interval = recurrenceInterval || 1;
              switch (recurrenceType) {
                case 'daily': return interval === 1 ? 'Daily' : `Every ${interval} days`;
                case 'weekly': return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
                case 'monthly': return interval === 1 ? 'Monthly' : `Every ${interval} months`;
                case 'yearly': return interval === 1 ? 'Yearly' : `Every ${interval} years`;
                default: return 'Custom';
              }
            })()}</span>
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Type buttons */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => hasRecurrence ? null : handlePresetSelect({ type: 'daily', interval: 1 })}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                recurrenceType === 'daily' && recurrenceInterval === 1
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-border text-muted-foreground hover:bg-secondary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => hasRecurrence ? null : handlePresetSelect({ type: 'weekly', interval: 1 })}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                recurrenceType === 'weekly' && recurrenceInterval === 1 && (!recurrenceWeekdays || recurrenceWeekdays.length === 0)
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-border text-muted-foreground hover:bg-secondary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => hasRecurrence ? null : handlePresetSelect({ type: 'monthly', interval: 1 })}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                recurrenceType === 'monthly' && recurrenceInterval === 1
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-border text-muted-foreground hover:bg-secondary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => handleCustomTypeSelect('custom')}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                recurrenceType === 'custom' || (recurrenceType === 'weekly' && recurrenceWeekdays && recurrenceWeekdays.length > 0)
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-border text-muted-foreground hover:bg-secondary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Custom
            </button>
          </div>

          {/* Custom options */}
          {hasRecurrence && (
            <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
              {/* Interval */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Every</span>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={recurrenceInterval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  className="w-16 h-8 text-sm"
                />
                <select
                  value={recurrenceType || 'daily'}
                  onChange={(e) => handleCustomTypeSelect(e.target.value as RecurrenceType)}
                  disabled={disabled}
                  className="px-2 py-1 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="daily">days</option>
                  <option value="weekly">weeks</option>
                  <option value="monthly">months</option>
                  <option value="yearly">years</option>
                </select>
              </div>

              {/* Weekday selector for weekly/custom */}
              {(recurrenceType === 'weekly' || recurrenceType === 'custom') && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">On days:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWeekdayToggle(day.value)}
                        disabled={disabled}
                        className={cn(
                          "px-2.5 py-1.5 text-xs rounded-md border transition-colors",
                          recurrenceWeekdays?.includes(day.value)
                            ? "border-purple-500 bg-purple-500/20 text-purple-400"
                            : "border-border text-muted-foreground hover:bg-secondary",
                          disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* End date */}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">End:</span>
                <Input
                  type="date"
                  value={recurrenceEndDate || ''}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={disabled}
                  className="flex-1 h-8 text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
                {recurrenceEndDate && (
                  <button
                    type="button"
                    onClick={() => handleEndDateChange('')}
                    disabled={disabled}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Clear button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                className="w-full"
              >
                Clear Recurrence
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}