import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Task } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    created_at: "2026-03-30T09:00:00Z",
    updated_at: "2026-03-30T09:00:00Z",
    user_id: "u1",
    title: "Test Task",
    description: null,
    status: "active",
    project_id: null,
    project: null,
    notes: null,
    due_date: null,
    image_url: null,
    priority_level: 2,
    scheduling_mode: "auto",
    estimated_duration: 30,
    start_time: "2026-03-30T09:00:00Z",
    end_time: "2026-03-30T09:30:00Z",
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

const defaultProps = {
  scheduledTasks: [] as Task[],
  unscheduledAutoTasks: [] as Task[],
  onPlanMyDay: vi.fn().mockResolvedValue(undefined),
  isPlanning: false,
  googleConnected: true, // suppress the GCal connect prompt by default
};

beforeEach(() => {
  vi.clearAllMocks();
});

// Wrap in TooltipProvider since TodaySchedule now uses radix tooltips
function renderSchedule(props: Partial<typeof defaultProps> = {}) {
  return render(
    <TooltipProvider>
      <TodaySchedule {...defaultProps} {...props} />
    </TooltipProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TodaySchedule", () => {
  describe("empty state", () => {
    it("shows empty state message when no tasks at all", () => {
      renderSchedule();

      expect(screen.getByText(/No tasks scheduled yet/i)).toBeInTheDocument();
    });

    it("does not show empty state when there are scheduled tasks", () => {
      renderSchedule({ scheduledTasks: [makeTask()] });

      expect(screen.queryByText(/No tasks scheduled yet/i)).not.toBeInTheDocument();
    });

    it("does not show empty state when there are unscheduled auto tasks", () => {
      renderSchedule({
        unscheduledAutoTasks: [makeTask({ start_time: null, end_time: null })],
      });

      expect(screen.queryByText(/No tasks scheduled yet/i)).not.toBeInTheDocument();
    });
  });

  describe("Plan My Day button", () => {
    it("renders the Plan My Day button", () => {
      renderSchedule();

      expect(screen.getByRole("button", { name: /Plan My Day/i })).toBeInTheDocument();
    });

    it("calls onPlanMyDay when button is clicked", async () => {
      const user = userEvent.setup();
      const onPlanMyDay = vi.fn().mockResolvedValue(undefined);

      renderSchedule({ onPlanMyDay });

      await user.click(screen.getByRole("button", { name: /Plan My Day/i }));

      expect(onPlanMyDay).toHaveBeenCalledTimes(1);
    });

    it("shows spinner and 'Planning…' text while isPlanning is true", () => {
      renderSchedule({ isPlanning: true });

      expect(screen.getByText(/Planning/i)).toBeInTheDocument();
      expect(screen.queryByText("Plan My Day")).not.toBeInTheDocument();
    });

    it("disables the button while isPlanning", () => {
      renderSchedule({ isPlanning: true });

      expect(screen.getByRole("button", { name: /Planning/i })).toBeDisabled();
    });

    it("button is enabled when not planning", () => {
      renderSchedule({ isPlanning: false });

      expect(screen.getByRole("button", { name: /Plan My Day/i })).not.toBeDisabled();
    });
  });

  describe("unscheduled auto tasks hint", () => {
    it("shows hint with count for a single unscheduled task", () => {
      renderSchedule({
        unscheduledAutoTasks: [makeTask({ id: "u1", start_time: null, end_time: null })],
      });

      expect(screen.getByText(/1 task ready to be scheduled/i)).toBeInTheDocument();
    });

    it("uses plural form for multiple unscheduled tasks", () => {
      renderSchedule({
        unscheduledAutoTasks: [
          makeTask({ id: "u1", start_time: null, end_time: null }),
          makeTask({ id: "u2", start_time: null, end_time: null }),
          makeTask({ id: "u3", start_time: null, end_time: null }),
        ],
      });

      expect(screen.getByText(/3 tasks ready to be scheduled/i)).toBeInTheDocument();
    });

    it("does not show hint when there are no unscheduled tasks", () => {
      renderSchedule({
        scheduledTasks: [makeTask()],
        unscheduledAutoTasks: [],
      });

      expect(screen.queryByText(/ready to be scheduled/i)).not.toBeInTheDocument();
    });
  });

  describe("scheduled task list", () => {
    it("renders a scheduled task's title", () => {
      renderSchedule({ scheduledTasks: [makeTask({ title: "Write report" })] });

      expect(screen.getByText("Write report")).toBeInTheDocument();
    });

    it("renders duration badge in minutes for short tasks", () => {
      renderSchedule({ scheduledTasks: [makeTask({ estimated_duration: 30 })] });

      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("renders duration badge in hours for 60-minute tasks", () => {
      renderSchedule({ scheduledTasks: [makeTask({ estimated_duration: 60 })] });

      expect(screen.getByText("1h")).toBeInTheDocument();
    });

    it("renders duration badge in mixed format for 90-minute tasks", () => {
      renderSchedule({ scheduledTasks: [makeTask({ estimated_duration: 90 })] });

      expect(screen.getByText("1h 30m")).toBeInTheDocument();
    });

    it("falls back to 30m when estimated_duration is null", () => {
      renderSchedule({
        scheduledTasks: [makeTask({ estimated_duration: null as unknown as number })],
      });

      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("renders multiple scheduled tasks", () => {
      renderSchedule({
        scheduledTasks: [
          makeTask({ id: "t1", title: "First task" }),
          makeTask({ id: "t2", title: "Second task" }),
        ],
      });

      expect(screen.getByText("First task")).toBeInTheDocument();
      expect(screen.getByText("Second task")).toBeInTheDocument();
    });

    it("renders '—' for a task with no start_time", () => {
      renderSchedule({ scheduledTasks: [makeTask({ start_time: null })] });

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows secondary empty message when unscheduled tasks exist but none are scheduled yet", () => {
      renderSchedule({
        scheduledTasks: [],
        unscheduledAutoTasks: [makeTask({ start_time: null, end_time: null })],
      });

      expect(screen.getByText(/No tasks scheduled for today yet/i)).toBeInTheDocument();
    });
  });

  describe("Google Calendar connect prompt", () => {
    it("shows connect prompt when googleConnected is false", () => {
      renderSchedule({ googleConnected: false });

      expect(screen.getByText(/Connect Google Calendar/i)).toBeInTheDocument();
    });

    it("hides connect prompt when googleConnected is true", () => {
      renderSchedule({ googleConnected: true });

      expect(screen.queryByText(/Connect Google Calendar/i)).not.toBeInTheDocument();
    });
  });

  describe("section header", () => {
    it("renders the Today's Schedule heading", () => {
      renderSchedule();

      expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
    });
  });
});
