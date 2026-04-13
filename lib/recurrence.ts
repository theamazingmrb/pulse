import { Task, RecurrenceType } from '@/types';
import { addDays, addWeeks, addMonths, addYears, format, isAfter, isBefore, parseISO } from 'date-fns';

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval: number;
  endDate?: string | null;
  weekdays?: number[] | null;
  skippedDates?: string[] | null;
}

/**
 * Calculate the next occurrence date based on recurrence config
 */
export function getNextOccurrence(
  config: RecurrenceConfig,
  fromDate: Date = new Date()
): Date | null {
  // Check if recurrence has ended
  if (config.endDate) {
    const endDate = parseISO(config.endDate);
    if (isAfter(fromDate, endDate)) {
      return null;
    }
  }

  let nextDate: Date;

  switch (config.type) {
    case 'daily':
      nextDate = addDays(fromDate, config.interval);
      break;

    case 'weekly':
      if (config.weekdays && config.weekdays.length > 0) {
        // Find next weekday in the pattern
        nextDate = getNextWeekdayOccurrence(fromDate, config.weekdays, config.interval);
      } else {
        nextDate = addWeeks(fromDate, config.interval);
      }
      break;

    case 'monthly':
      nextDate = addMonths(fromDate, config.interval);
      break;

    case 'yearly':
      nextDate = addYears(fromDate, config.interval);
      break;

    case 'custom':
      // For custom, use weekdays if provided, otherwise default to weekly
      if (config.weekdays && config.weekdays.length > 0) {
        nextDate = getNextWeekdayOccurrence(fromDate, config.weekdays, config.interval);
      } else {
        nextDate = addWeeks(fromDate, config.interval);
      }
      break;

    default:
      return null;
  }

  // Check if next occurrence is after end date
  if (config.endDate) {
    const endDate = parseISO(config.endDate);
    if (isAfter(nextDate, endDate)) {
      return null;
    }
  }

  return nextDate;
}

/**
 * Get next occurrence for weekday-based recurrence
 */
function getNextWeekdayOccurrence(fromDate: Date, weekdays: number[], intervalWeeks: number): Date {
  const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
  const currentDay = fromDate.getDay();
  
  // Try to find next weekday in current week
  for (let i = 0; i < sortedWeekdays.length; i++) {
    if (sortedWeekdays[i] > currentDay) {
      return addDays(fromDate, sortedWeekdays[i] - currentDay);
    }
  }
  
  // No more weekdays this week, go to first weekday of next interval
  const daysUntilNextWeek = 7 - currentDay + sortedWeekdays[0] + (intervalWeeks - 1) * 7;
  return addDays(fromDate, daysUntilNextWeek);
}

/**
 * Get occurrences within a date range
 */
export function getOccurrencesInRange(
  config: RecurrenceConfig,
  startDate: Date,
  endDate: Date,
  maxOccurrences: number = 100
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = startDate;
  let count = 0;

  while (isBefore(currentDate, endDate) && count < maxOccurrences) {
    const next = getNextOccurrence(config, currentDate);
    if (!next || isAfter(next, endDate)) break;
    
    // Skip if date is in skippedDates
    const nextStr = format(next, 'yyyy-MM-dd');
    if (!config.skippedDates?.includes(nextStr)) {
      occurrences.push(next);
    }
    
    currentDate = next;
    count++;
  }

  return occurrences;
}

/**
 * Create a new task instance from a recurrence template
 */
export function createTaskInstanceFromTemplate(
  template: Task,
  instanceDate: Date
): Omit<Task, 'id' | 'created_at' | 'updated_at'> {
  const startTime = instanceDate;
  const endTime = new Date(instanceDate.getTime() + (template.estimated_duration || 30) * 60000);

  return {
    user_id: template.user_id,
    title: template.title,
    description: template.description,
    status: 'active',
    project_id: template.project_id,
    notes: template.notes,
    due_date: template.due_date,
    image_url: template.image_url,
    priority_level: template.priority_level,
    scheduling_mode: 'manual',
    estimated_duration: template.estimated_duration,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    locked: false,
    focus_mode: template.focus_mode,
    // Recurrence fields
    recurrence_type: template.recurrence_type,
    recurrence_interval: template.recurrence_interval,
    recurrence_end_date: template.recurrence_end_date,
    recurrence_weekdays: template.recurrence_weekdays,
    parent_task_id: template.id,
    skipped_dates: null,
    is_recurrence_template: false,
  };
}

/**
 * Format recurrence for display
 */
export function formatRecurrence(task: Task): string {
  if (!task.recurrence_type) return '';

  const interval = task.recurrence_interval || 1;

  switch (task.recurrence_type) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
    
    case 'weekly':
      if (task.recurrence_weekdays && task.recurrence_weekdays.length > 0) {
        const days = task.recurrence_weekdays
          .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
          .join(', ');
        return interval === 1 
          ? `Weekly on ${days}`
          : `Every ${interval} weeks on ${days}`;
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    
    case 'monthly':
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    
    case 'yearly':
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    
    case 'custom':
      if (task.recurrence_weekdays && task.recurrence_weekdays.length > 0) {
        const days = task.recurrence_weekdays
          .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
          .join(', ');
        return `Custom: ${days}`;
      }
      return 'Custom';
    
    default:
      return '';
  }
}

/**
 * Check if a date should be skipped
 */
export function isDateSkipped(skippedDates: string[] | null, date: Date): boolean {
  if (!skippedDates || skippedDates.length === 0) return false;
  const dateStr = format(date, 'yyyy-MM-dd');
  return skippedDates.includes(dateStr);
}

/**
 * Get a human-readable description of the next occurrence
 */
export function getNextOccurrenceText(task: Task): string | null {
  if (!task.recurrence_type || !task.is_recurrence_template) return null;

  const nextDate = getNextOccurrence({
    type: task.recurrence_type,
    interval: task.recurrence_interval || 1,
    endDate: task.recurrence_end_date,
    weekdays: task.recurrence_weekdays,
  });

  if (!nextDate) {
    if (task.recurrence_end_date) {
      return 'Recurrence ended';
    }
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return 'Next week';
  if (diffDays < 30) return `${Math.round(diffDays / 7)} weeks`;
  
  return format(nextDate, 'MMM d, yyyy');
}

/**
 * Recurrence presets for quick selection
 */
export const RECURRENCE_PRESETS = [
  { type: 'daily' as RecurrenceType, interval: 1, label: 'Daily' },
  { type: 'daily' as RecurrenceType, interval: 2, label: 'Every 2 days' },
  { type: 'weekly' as RecurrenceType, interval: 1, label: 'Weekly' },
  { type: 'weekly' as RecurrenceType, interval: 2, label: 'Every 2 weeks' },
  { type: 'monthly' as RecurrenceType, interval: 1, label: 'Monthly' },
  { type: 'yearly' as RecurrenceType, interval: 1, label: 'Yearly' },
];

/**
 * Weekday options for custom recurrence
 */
export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];