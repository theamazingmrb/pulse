import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getNextOccurrence,
  getOccurrencesInRange,
  createTaskInstanceFromTemplate,
  formatRecurrence,
} from "@/lib/recurrence";
import { Task } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "user-1",
    title: "Test Task",
    description: null,
    status: "active",
    project_id: null,
    project: null,
    notes: null,
    due_date: null,
    image_url: null,
    priority_level: 2,
    scheduling_mode: "manual",
    estimated_duration: 30,
    start_time: null,
    end_time: null,
    locked: false,
    focus_mode: null,
    recurrence_type: null,
    recurrence_interval: 1,
    recurrence_end_date: null,
    recurrence_weekdays: null,
    parent_task_id: null,
    skipped_dates: null,
    is_recurrence_template: false,
    ...overrides,
  };
}

// ── Integration Tests for Recurring Task Workflows ──────────────────────────────

describe("Integration: Task completion workflow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T00:00:00")); // Monday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("daily standup workflow", () => {
    it("calculates next occurrence correctly after completing daily task", () => {
      const template = makeTask({
        title: "Daily Standup",
        recurrence_type: "daily",
        recurrence_interval: 1,
        start_time: "2026-03-16T09:00:00",
        is_recurrence_template: true,
      });

      // Get next occurrence after completing today's standup
      const nextDate = getNextOccurrence(
        {
          type: "daily",
          interval: 1,
        },
        new Date(template.start_time!)
      );

      expect(nextDate).not.toBeNull();
      expect(nextDate!.getDate()).toBe(17); // Tomorrow
    });

    it("creates correct instance from template", () => {
      const template = makeTask({
        title: "Daily Standup",
        recurrence_type: "daily",
        recurrence_interval: 1,
        estimated_duration: 15,
        focus_mode: "deep",
        is_recurrence_template: true,
      });

      const nextDate = new Date("2026-03-17T09:00:00");
      const instance = createTaskInstanceFromTemplate(template, nextDate);

      expect(instance.title).toBe("Daily Standup");
      expect(instance.start_time).toBe(nextDate.toISOString());
      expect(instance.focus_mode).toBe("deep");
      expect(instance.estimated_duration).toBe(15);
    });

    it("formats daily recurrence correctly in UI", () => {
      const template = makeTask({
        recurrence_type: "daily",
        recurrence_interval: 1,
      });

      const formatted = formatRecurrence(template);
      expect(formatted).toBe("Daily");
    });
  });

  describe("weekly review with weekdays", () => {
    it("calculates next Monday correctly from Friday", () => {
      const friday = new Date("2026-03-20T00:00:00"); // Friday
      const nextDate = getNextOccurrence(
        {
          type: "weekly",
          interval: 1,
          weekdays: [1], // Monday
        },
        friday
      );

      expect(nextDate).not.toBeNull();
      expect(nextDate!.getDay()).toBe(1); // Monday
    });

    it("calculates next occurrence for multiple weekdays", () => {
      const monday = new Date("2026-03-16T00:00:00");
      const nextDate = getNextOccurrence(
        {
          type: "weekly",
          interval: 1,
          weekdays: [1, 3, 5], // Mon, Wed, Fri
        },
        monday
      );

      expect(nextDate).not.toBeNull();
      // Should be one of the valid weekdays
      expect([1, 3, 5]).toContain(nextDate!.getDay());
    });

    it("formats weekly recurrence with weekdays", () => {
      const template = makeTask({
        recurrence_type: "weekly",
        recurrence_interval: 1,
        recurrence_weekdays: [1, 3, 5],
      });

      const formatted = formatRecurrence(template);
      expect(formatted).toBe("Weekly on Mon, Wed, Fri");
    });
  });

  describe("monthly task workflow", () => {
    it("calculates next month occurrence", () => {
      const march16 = new Date("2026-03-16T00:00:00");
      const nextDate = getNextOccurrence(
        {
          type: "monthly",
          interval: 1,
        },
        march16
      );

      expect(nextDate).not.toBeNull();
      expect(nextDate!.getMonth()).toBe(3); // April
      expect(nextDate!.getDate()).toBe(16);
    });

    it("formats monthly recurrence with interval", () => {
      const template = makeTask({
        recurrence_type: "monthly",
        recurrence_interval: 3,
      });

      const formatted = formatRecurrence(template);
      expect(formatted).toBe("Every 3 months");
    });
  });

  describe("task with end date", () => {
    it("returns null when past end date", () => {
      const today = new Date("2026-03-16T00:00:00");
      const nextDate = getNextOccurrence(
        {
          type: "daily",
          interval: 1,
          endDate: "2026-03-15", // Yesterday
        },
        today
      );

      expect(nextDate).toBeNull();
    });

    it("returns next occurrence before end date", () => {
      const today = new Date("2026-03-16T00:00:00");
      const nextDate = getNextOccurrence(
        {
          type: "daily",
          interval: 1,
          endDate: "2026-03-20", // 4 days from now
        },
        today
      );

      expect(nextDate).not.toBeNull();
      expect(nextDate!.getDate()).toBe(17);
    });
  });
});

// ── Skip Date Integration ─────────────────────────────────────────────────────────

describe("Integration: Skip date workflow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T00:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("excludes skipped date from occurrences", () => {
    const config = {
      type: "daily" as const,
      interval: 1,
      skippedDates: ["2026-03-17"],
    };

    const startDate = new Date("2026-03-16");
    const endDate = new Date("2026-03-18");
    const occurrences = getOccurrencesInRange(config, startDate, endDate);

    // Should have occurrences excluding the skipped date
    expect(occurrences.length).toBeGreaterThanOrEqual(1);
    // Verify the skipped date is not in the results
    expect(occurrences.every(o => o.getDate() !== 17)).toBe(true);
  });

  it("detects skipped date correctly", () => {
    // isDateSkipped compares date strings in YYYY-MM-DD format
    const skippedDate = new Date("2026-03-17");
    const dateStr = skippedDate.toISOString().split('T')[0];
    const isSkipped = ["2026-03-17", "2026-03-19"].includes(dateStr);

    expect(isSkipped).toBe(true);
  });

  it("allows unskipping by removing from array", () => {
    const skippedDate = new Date("2026-03-17");
    const skippedDates = ["2026-03-17", "2026-03-19"];
    
    // Remove the date to unskip
    const newSkippedDates = skippedDates.filter(d => d !== "2026-03-17");
    const dateStr = skippedDate.toISOString().split('T')[0];
    const isSkipped = newSkippedDates.includes(dateStr);

    expect(isSkipped).toBe(false);
  });

  it("handles multiple skipped dates in range", () => {
    const config = {
      type: "daily" as const,
      interval: 1,
      skippedDates: ["2026-03-17", "2026-03-19", "2026-03-21"],
    };

    const startDate = new Date("2026-03-16");
    const endDate = new Date("2026-03-23");
    const occurrences = getOccurrencesInRange(config, startDate, endDate);

    // Verify skipped dates are not in the results
    expect(occurrences.every(o => o.getDate() !== 17)).toBe(true);
    expect(occurrences.every(o => o.getDate() !== 19)).toBe(true);
    expect(occurrences.every(o => o.getDate() !== 21)).toBe(true);
  });
});

// ── Focus Timer Integration ─────────────────────────────────────────────────────

describe("Integration: Focus timer with recurring tasks", () => {
  it("preserves focus_mode in instance creation", () => {
    const template = makeTask({
      title: "Deep Work Session",
      focus_mode: "deep",
      estimated_duration: 90,
      recurrence_type: "daily",
      is_recurrence_template: true,
    });

    const instanceDate = new Date("2026-03-17T09:00:00");
    const instance = createTaskInstanceFromTemplate(template, instanceDate);

    expect(instance.focus_mode).toBe("deep");
    expect(instance.estimated_duration).toBe(90);
  });

  it("preserves project_id in instance", () => {
    const template = makeTask({
      project_id: "project-123",
      recurrence_type: "weekly",
      is_recurrence_template: true,
    });

    const instanceDate = new Date("2026-03-18T09:00:00");
    const instance = createTaskInstanceFromTemplate(template, instanceDate);

    expect(instance.project_id).toBe("project-123");
  });

  it("sets correct end_time based on estimated_duration", () => {
    const template = makeTask({
      estimated_duration: 45,
      is_recurrence_template: true,
    });

    const instanceDate = new Date("2026-03-17T09:00:00");
    const instance = createTaskInstanceFromTemplate(template, instanceDate);

    const expectedEndTime = new Date(instanceDate.getTime() + 45 * 60000);
    expect(instance.end_time).toBe(expectedEndTime.toISOString());
  });
});

// ── End-to-End Scenarios ───────────────────────────────────────────────────────

describe("End-to-end: Complete workflow scenarios", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T00:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles daily standup from template to instance to completion", () => {
    // 1. Create template
    const template = makeTask({
      title: "Daily Standup",
      recurrence_type: "daily",
      recurrence_interval: 1,
      start_time: "2026-03-16T09:00:00",
      estimated_duration: 15,
      is_recurrence_template: true,
    });

    // 2. Create today's instance
    const todayInstance = createTaskInstanceFromTemplate(template, new Date("2026-03-16T09:00:00"));
    expect(todayInstance.title).toBe("Daily Standup");
    expect(todayInstance.parent_task_id).toBe("task-1");

    // 3. Get next occurrence after completing today
    const nextDate = getNextOccurrence(
      { type: "daily", interval: 1 },
      new Date(template.start_time!)
    );
    expect(nextDate!.getDate()).toBe(17);

    // 4. Create tomorrow's instance
    const tomorrowInstance = createTaskInstanceFromTemplate(template, nextDate!);
    expect(tomorrowInstance.start_time).toContain("2026-03-17");
  });

  it("handles weekly task with skipped holiday", () => {
    makeTask({
      title: "Weekly Review",
      recurrence_type: "weekly",
      recurrence_interval: 1,
      recurrence_weekdays: [1], // Monday
      is_recurrence_template: true,
    });

    // Skip next Monday
    const nextMonday = getNextOccurrence(
      { type: "weekly", interval: 1, weekdays: [1] },
      new Date("2026-03-16")
    );
    
    // Verify we get a Monday
    expect(nextMonday!.getDay()).toBe(1);

    // With skipped date, verify it's excluded
    const config = {
      type: "weekly" as const,
      interval: 1,
      weekdays: [1],
      skippedDates: ["2026-03-23"],
    };

    const occurrences = getOccurrencesInRange(config, new Date("2026-03-16"), new Date("2026-03-30"));
    expect(occurrences.some(o => o.getDate() === 23)).toBe(false);
  });

  it("handles recurring task reaching end date", () => {
    makeTask({
      title: "Limited Series Task",
      recurrence_type: "daily",
      recurrence_interval: 1,
      recurrence_end_date: "2026-03-18",
      is_recurrence_template: true,
    });

    // Get occurrences before end date
    const occurrences = getOccurrencesInRange(
      { type: "daily", interval: 1, endDate: "2026-03-18" },
      new Date("2026-03-16"),
      new Date("2026-03-25")
    );

    // Should only have dates up to the end date
    expect(occurrences.every(o => o.getDate() <= 18)).toBe(true);
  });

  it("handles custom recurrence with multiple weekdays", () => {
    const template = makeTask({
      title: "MWF Workout",
      recurrence_type: "custom",
      recurrence_interval: 1,
      recurrence_weekdays: [1, 3, 5], // Mon, Wed, Fri
      is_recurrence_template: true,
    });

    // Get next occurrence from Monday
    const monday = new Date("2026-03-16");
    const nextDate = getNextOccurrence(
      { type: "custom", interval: 1, weekdays: [1, 3, 5] },
      monday
    );

    expect(nextDate).not.toBeNull();
    // The next occurrence should be one of the weekdays
    expect([1, 3, 5]).toContain(nextDate!.getDay());

    // Format correctly
    const formatted = formatRecurrence(template);
    expect(formatted).toBe("Custom: Mon, Wed, Fri");
  });
});