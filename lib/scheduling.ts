import { Task } from '@/types';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  task?: Task;
  score?: number;
}

export interface SchedulingOptions {
  workingHours?: {
    start: number; // 0-23 (e.g., 9 for 9 AM)
    end: number;   // 0-23 (e.g., 17 for 5 PM)
  };
  workingDays?: number[]; // 0-6 (0 = Sunday)
  defaultTaskDuration: number; // minutes
  minBreakDuration: number; // minutes between tasks
  bufferTime: number; // minutes before/after events
  enableDeadlineAwareness?: boolean;
  enableFragmentationPrevention?: boolean;
}

// Scheduling intelligence weights
const SCHEDULING_WEIGHTS = {
  DEADLINE_URGENCY: 40,
  TIME_OF_DAY: 25,
  PRIORITY_MATCH: 20,
  FRAGMENTATION: 15,
};

export class SchedulingService {
  private static DEFAULT_OPTIONS: SchedulingOptions = {
    workingHours: { start: 8, end: 22 },
    workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
    defaultTaskDuration: 30,
    minBreakDuration: 5,
    bufferTime: 5,
    enableDeadlineAwareness: true,
    enableFragmentationPrevention: true,
  };

  static async autoScheduleTask(
    task: Task,
    existingTasks: Task[],
    options: Partial<SchedulingOptions> = {}
  ): Promise<{ start_time: Date; end_time: Date } | null> {
    // Skip locked tasks
    if (task.locked) {
      return task.start_time && task.end_time 
        ? { start_time: new Date(task.start_time), end_time: new Date(task.end_time) }
        : null;
    }

    const opts: SchedulingOptions = {
      ...this.DEFAULT_OPTIONS,
      ...options
    };
    
    // Get available time slots
    const timeSlots = this.getAvailableTimeSlots(
      new Date(),
      existingTasks.filter(t => !t.locked || t.id === task.id),
      opts
    );

    const duration = task.estimated_duration ?? opts.defaultTaskDuration;

    // Score all viable slots
    const scoredSlots = this.scoreAllSlots(
      timeSlots, 
      task, 
      existingTasks,
      duration,
      opts
    );

    // Select the optimal slot
    const bestSlot = this.selectOptimalSlot(scoredSlots, duration, task);

    if (!bestSlot) {
      console.warn('No available time slot found for task:', task.title);
      return null;
    }

    return {
      start_time: bestSlot.start,
      end_time: new Date(bestSlot.start.getTime() + duration * 60000),
    };
  }

  private static scoreAllSlots(
    slots: TimeSlot[],
    task: Task,
    existingTasks: Task[],
    durationMinutes: number,
    options: SchedulingOptions
  ): TimeSlot[] {
    const now = new Date();
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    
    return slots
      .filter(slot => {
        const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000;
        return slotDuration >= durationMinutes;
      })
      .map(slot => {
        let totalScore = 0;

        // 1. DEADLINE URGENCY SCORE (0-40 points)
        if (options.enableDeadlineAwareness && dueDate) {
          const urgencyScore = this.calculateDeadlineUrgencyScore(slot.start, dueDate, task.priority_level);
          totalScore += urgencyScore * (SCHEDULING_WEIGHTS.DEADLINE_URGENCY / 100);
        } else {
          totalScore += this.calculateNoDeadlineScore(slot.start, now, task.priority_level) * (SCHEDULING_WEIGHTS.DEADLINE_URGENCY / 100);
        }

        // 2. TIME OF DAY SCORE (0-25 points)
        const timeScore = this.calculateTimeOfDayScore(slot.start, task);
        totalScore += timeScore * (SCHEDULING_WEIGHTS.TIME_OF_DAY / 100);

        // 3. PRIORITY MATCH SCORE (0-20 points)
        const priorityScore = this.calculatePriorityMatchScore(slot.start, task.priority_level);
        totalScore += priorityScore * (SCHEDULING_WEIGHTS.PRIORITY_MATCH / 100);

        // 4. FRAGMENTATION SCORE (0-15 points)
        if (options.enableFragmentationPrevention) {
          const fragScore = this.calculateFragmentationScore(slot, durationMinutes);
          totalScore += fragScore * (SCHEDULING_WEIGHTS.FRAGMENTATION / 100);
        }

        return { ...slot, score: totalScore };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private static calculateDeadlineUrgencyScore(
    slotStart: Date,
    dueDate: Date,
    priorityLevel: number
  ): number {
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);
    const timeUntilSlot = slotStart.getTime() - now.getTime();
    const hoursUntilSlot = timeUntilSlot / (1000 * 60 * 60);

    // Deadline has passed - maximum urgency
    if (hoursUntilDue <= 0) {
      return 100;
    }

    // Ideal scheduling windows based on priority
    const urgencyMultipliers: Record<number, { idealStart: number; idealEnd: number }> = {
      1: { idealStart: 0, idealEnd: 0.25 },      // Hot: immediate
      2: { idealStart: 0, idealEnd: 0.50 },      // Warm: first half
      3: { idealStart: 0.25, idealEnd: 0.75 },   // Cool: middle
      4: { idealStart: 0.50, idealEnd: 1.0 },    // Cold: later half
    };

    const multiplier = urgencyMultipliers[priorityLevel] || urgencyMultipliers[2];
    const slotPositionInWindow = hoursUntilSlot / hoursUntilDue;

    if (slotPositionInWindow >= multiplier.idealStart && slotPositionInWindow <= multiplier.idealEnd) {
      return 100;
    }

    if (slotPositionInWindow < multiplier.idealStart) {
      return 80 - (multiplier.idealStart - slotPositionInWindow) * 50;
    } else {
      const overshoot = slotPositionInWindow - multiplier.idealEnd;
      return Math.max(0, 100 - overshoot * 150);
    }
  }

  private static calculateNoDeadlineScore(
    slotStart: Date,
    now: Date,
    priorityLevel: number
  ): number {
    const hoursFromNow = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Hot priority: prefer immediate slots
    if (priorityLevel === 1) {
      if (hoursFromNow <= 2) return 100;
      if (hoursFromNow <= 8) return 80;
      if (hoursFromNow <= 24) return 60;
      return Math.max(20, 60 - hoursFromNow);
    }
    
    // Warm priority: prefer today/tomorrow
    if (priorityLevel === 2) {
      if (hoursFromNow <= 8) return 90;
      if (hoursFromNow <= 24) return 80;
      if (hoursFromNow <= 48) return 70;
      return Math.max(20, 70 - hoursFromNow / 2);
    }
    
    // Cool/Cold: more flexible
    if (hoursFromNow <= 24) return 70;
    if (hoursFromNow <= 72) return 80;
    return 75;
  }

  private static calculateTimeOfDayScore(slotStart: Date, task: Task): number {
    const hour = slotStart.getHours();
    
    // Energy-based scoring (research-backed productivity patterns)
    const energyScores: Record<number, number> = {
      8: 80,   // Early morning
      9: 100,  // Peak morning
      10: 100, // Peak morning
      11: 90,  // Still good
      12: 60,  // Lunch time
      13: 50,  // Post-lunch dip
      14: 70,  // Recovering
      15: 85,  // Afternoon pickup
      16: 95,  // Second peak
      17: 90,  // Good focus
      18: 70,  // Winding down
      19: 60,  // Evening
      20: 50,  // Late evening
      21: 40,  // Very late
    };

    const baseScore = energyScores[hour] || 30;
    
    // High priority tasks should get peak hours
    if (task.priority_level === 1 && (hour === 9 || hour === 10 || hour === 16)) {
      return baseScore + 10;
    }
    
    // Low priority tasks can go in low-energy slots
    if (task.priority_level >= 3 && baseScore < 70) {
      return baseScore + 20;
    }

    return baseScore;
  }

  private static calculatePriorityMatchScore(slotStart: Date, priorityLevel: number): number {
    const hour = slotStart.getHours();
    const dayOfWeek = slotStart.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Premium slots: weekday mornings 9-11 AM
    const isPremiumSlot = !isWeekend && hour >= 9 && hour <= 11;
    
    if (priorityLevel === 1) {
      return isPremiumSlot ? 100 : 60;
    }
    if (priorityLevel === 2) {
      return isPremiumSlot ? 90 : 70;
    }
    if (priorityLevel === 3) {
      return isPremiumSlot ? 70 : 80; // Prefer non-premium to save them
    }
    // Cold tasks - prefer off-peak
    return isPremiumSlot ? 50 : 90;
  }

  private static calculateFragmentationScore(slot: TimeSlot, taskDuration: number): number {
    const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000;
    const remainingAfterTask = slotDuration - taskDuration;
    
    // Perfect fit or slight buffer
    if (remainingAfterTask <= 15) {
      return 100;
    }
    
    // Leaves room for another task (30+ min)
    if (remainingAfterTask >= 30) {
      return 90;
    }
    
    // Creates awkward 15-30 min gap
    return 60;
  }

  private static selectOptimalSlot(
    scoredSlots: TimeSlot[],
    durationMinutes: number,
    task: Task
  ): TimeSlot | null {
    if (scoredSlots.length === 0) return null;
    
    // For hot priority, if top slots are close in score, pick earliest
    if (task.priority_level === 1 && scoredSlots.length > 1) {
      const topScore = scoredSlots[0].score || 0;
      const nearTopSlots = scoredSlots.filter(s => (s.score || 0) >= topScore - 10);
      nearTopSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
      return nearTopSlots[0];
    }
    
    return scoredSlots[0];
  }

  private static getAvailableTimeSlots(
    startDate: Date,
    tasks: Task[],
    options: SchedulingOptions
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const isToday = startDate.toDateString() === now.toDateString();
    const effectiveStartDate = isToday ? new Date(Math.max(startDate.getTime(), now.getTime())) : new Date(startDate);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      if (options.workingDays && !options.workingDays.includes(date.getDay())) {
        continue;
      }

      let dayStart = new Date(date);
      let dayEnd = new Date(date);
      dayStart.setHours(options.workingHours!.start, 0, 0, 0);
      dayEnd.setHours(options.workingHours!.end, 0, 0, 0);

      const isCurrentDay = date.toDateString() === now.toDateString();
      if (isCurrentDay && effectiveStartDate > dayStart) {
        dayStart = effectiveStartDate;
      }

      if (dayStart >= dayEnd) {
        continue;
      }

      const occupiedSlots = this.getOccupiedSlots(date, tasks, options);
      const availableSlots = this.findGaps(dayStart, dayEnd, occupiedSlots, options);
      slots.push(...availableSlots);
    }

    return slots;
  }

  private static getOccupiedSlots(
    date: Date,
    tasks: Task[],
    options: SchedulingOptions
  ): TimeSlot[] {
    const occupied: TimeSlot[] = [];

    tasks
      .filter(t => t.start_time && t.end_time)
      .forEach(task => {
        const start = new Date(task.start_time!);
        const end = new Date(task.end_time!);
        
        if (this.isSameDay(start, date)) {
          occupied.push({
            start: new Date(start.getTime() - options.bufferTime * 60000),
            end: new Date(end.getTime() + options.bufferTime * 60000),
            available: false,
            task,
          });
        }
      });

    occupied.sort((a, b) => a.start.getTime() - b.start.getTime());
    return occupied;
  }

  private static findGaps(
    dayStart: Date,
    dayEnd: Date,
    occupiedSlots: TimeSlot[],
    options: SchedulingOptions
  ): TimeSlot[] {
    const gaps: TimeSlot[] = [];
    let currentTime = new Date(dayStart);

    for (const occupied of occupiedSlots) {
      if (currentTime < occupied.start) {
        const gapDuration = (occupied.start.getTime() - currentTime.getTime()) / 60000;
        
        if (gapDuration >= options.defaultTaskDuration) {
          gaps.push({
            start: currentTime,
            end: occupied.start,
            available: true,
          });
        }
      }
      currentTime = new Date(Math.max(currentTime.getTime(), occupied.end.getTime()));
    }

    // Gap after last occupied slot
    if (currentTime < dayEnd) {
      const gapDuration = (dayEnd.getTime() - currentTime.getTime()) / 60000;
      
      if (gapDuration >= options.defaultTaskDuration) {
        gaps.push({
          start: currentTime,
          end: dayEnd,
          available: true,
        });
      }
    }

    return gaps;
  }

  private static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  static async rescheduleTasks(
    tasks: Task[],
    options: Partial<SchedulingOptions> = {}
  ): Promise<Task[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    const lockedTasks = tasks.filter(t => t.locked && t.start_time && t.end_time);
    const manualTasks = tasks.filter(t => !t.locked && t.scheduling_mode === 'manual' && t.start_time && t.end_time);
    const autoTasks = tasks.filter(t => !t.locked && t.scheduling_mode === 'auto');

    // Smart sorting: deadline urgency + priority + duration
    autoTasks.sort((a, b) => {
      const aDeadline = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDeadline = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      const now = Date.now();
      
      const aUrgency = aDeadline === Infinity ? 0 : Math.max(0, 1 - (aDeadline - now) / (7 * 24 * 60 * 60 * 1000));
      const bUrgency = bDeadline === Infinity ? 0 : Math.max(0, 1 - (bDeadline - now) / (7 * 24 * 60 * 60 * 1000));
      
      const aScore = aUrgency * 50 + (5 - a.priority_level) * 10;
      const bScore = bUrgency * 50 + (5 - b.priority_level) * 10;
      
      if (Math.abs(aScore - bScore) > 5) {
        return bScore - aScore;
      }
      
      // Longer tasks get scheduled first (harder to fit)
      return (b.estimated_duration || 30) - (a.estimated_duration || 30);
    });

    const scheduledTasks: Task[] = [...lockedTasks, ...manualTasks];
    
    for (const task of autoTasks) {
      const scheduling = await this.autoScheduleTask(task, scheduledTasks, opts);

      if (scheduling) {
        scheduledTasks.push({
          ...task,
          start_time: scheduling.start_time.toISOString(),
          end_time: scheduling.end_time.toISOString(),
        });
      }
    }

    return scheduledTasks;
  }
}

export const PRIORITY_CONFIG = {
  1: { label: 'Hot', color: '#EF4444', description: 'Urgent - do it now' },
  2: { label: 'Warm', color: '#F59E0B', description: 'Important - do it soon' },
  3: { label: 'Cool', color: '#3B82F6', description: 'Can wait a bit' },
  4: { label: 'Cold', color: '#6B7280', description: 'Backlog / someday' }
} as const;
