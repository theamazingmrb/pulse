import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecurrenceSelector from "@/components/tasks/RecurrenceSelector";
import { RecurrenceType } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultOnChange = vi.fn();

function renderRecurrenceSelector(props: {
  recurrenceType: RecurrenceType | null;
  recurrenceInterval: number;
  recurrenceEndDate: string | null;
  recurrenceWeekdays: number[] | null;
  onChange?: typeof defaultOnChange;
  disabled?: boolean;
  compact?: boolean;
}) {
  return render(
    <RecurrenceSelector
      recurrenceType={props.recurrenceType}
      recurrenceInterval={props.recurrenceInterval}
      recurrenceEndDate={props.recurrenceEndDate}
      recurrenceWeekdays={props.recurrenceWeekdays}
      onChange={props.onChange || defaultOnChange}
      disabled={props.disabled}
      compact={props.compact}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Compact Mode Tests ─────────────────────────────────────────────────────────

describe("RecurrenceSelector - Compact Mode", () => {
  describe("rendering", () => {
    it("shows 'Repeat' when no recurrence is set", () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      expect(screen.getByText("Repeat")).toBeInTheDocument();
    });

    it("shows recurrence type when set", () => {
      renderRecurrenceSelector({
        recurrenceType: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      expect(screen.getByText("Daily")).toBeInTheDocument();
    });

    it("shows interval in label when > 1", () => {
      renderRecurrenceSelector({
        recurrenceType: "daily",
        recurrenceInterval: 3,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      expect(screen.getByText("Every 3 days")).toBeInTheDocument();
    });

    it("shows Weekly with correct interval", () => {
      renderRecurrenceSelector({
        recurrenceType: "weekly",
        recurrenceInterval: 2,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      expect(screen.getByText("Every 2 weeks")).toBeInTheDocument();
    });

    it("shows Monthly with correct interval", () => {
      renderRecurrenceSelector({
        recurrenceType: "monthly",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      expect(screen.getByText("Monthly")).toBeInTheDocument();
    });

    it("shows Yearly with correct interval", () => {
      renderRecurrenceSelector({
        recurrenceType: "yearly",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      expect(screen.getByText("Yearly")).toBeInTheDocument();
    });
  });

  describe("preset selection", () => {
    it("expands to show presets when clicked", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Repeat"));

      // Should show preset buttons after expanding
      expect(screen.getByRole("button", { name: "Daily" })).toBeInTheDocument();
    });

    it("selects preset and calls onChange", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Repeat"));
      await userEvent.click(screen.getByRole("button", { name: "Weekly" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "weekly",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });

    it("selects 'Every 2 days' preset", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Repeat"));
      await userEvent.click(screen.getByRole("button", { name: "Every 2 days" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "daily",
        recurrence_interval: 2,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });

    it("selects Monthly preset", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Repeat"));
      await userEvent.click(screen.getByRole("button", { name: "Monthly" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "monthly",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });

    it("selects Yearly preset", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Repeat"));
      await userEvent.click(screen.getByRole("button", { name: "Yearly" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "yearly",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });
  });

  describe("custom options", () => {
    it("shows custom inputs when Custom is selected", async () => {
      renderRecurrenceSelector({
        recurrenceType: "custom",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      // When custom is set, click on it to expand
      await userEvent.click(screen.getByText("Custom"));

      // Should show custom options
      expect(screen.getByText("Every")).toBeInTheDocument();
    });

    it("shows weekday buttons for custom recurrence", async () => {
      renderRecurrenceSelector({
        recurrenceType: "custom",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Custom"));

      expect(screen.getByRole("button", { name: "Mon" })).toBeInTheDocument();
    });

    it("toggles weekday selection", async () => {
      renderRecurrenceSelector({
        recurrenceType: "custom",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Custom"));
      await userEvent.click(screen.getByRole("button", { name: "Mon" }));

      expect(defaultOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_weekdays: [1],
        })
      );
    });

    it("adds second weekday to selection", async () => {
      renderRecurrenceSelector({
        recurrenceType: "custom",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: [1], // Monday selected
        compact: true,
      });

      await userEvent.click(screen.getByText("Custom"));
      await userEvent.click(screen.getByRole("button", { name: "Wed" }));

      expect(defaultOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_weekdays: [1, 3],
        })
      );
    });

    it("removes weekday from selection", async () => {
      renderRecurrenceSelector({
        recurrenceType: "custom",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: [1, 3], // Mon, Wed
        compact: true,
      });

      await userEvent.click(screen.getByText("Custom"));
      await userEvent.click(screen.getByRole("button", { name: "Mon" }));

      expect(defaultOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_weekdays: [3],
        })
      );
    });

    it("allows entering custom interval", async () => {
      renderRecurrenceSelector({
        recurrenceType: "custom",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
      });

      await userEvent.click(screen.getByText("Custom"));

      // Find the number input
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "5");

      expect(defaultOnChange).toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("does not open when disabled", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        compact: true,
        disabled: true,
      });

      await userEvent.click(screen.getByText("Repeat"));

      // Presets should not appear
      expect(screen.queryByRole("button", { name: "Monthly" })).not.toBeInTheDocument();
    });
  });
});

// ── Full Mode Tests ────────────────────────────────────────────────────────────

describe("RecurrenceSelector - Full Mode", () => {
  describe("rendering", () => {
    it("shows type buttons by default", () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      expect(screen.getByRole("button", { name: "Daily" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Monthly" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
    });

    it("shows recurrence label when set", () => {
      renderRecurrenceSelector({
        recurrenceType: "weekly",
        recurrenceInterval: 2,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      expect(screen.getByText("Every 2 weeks")).toBeInTheDocument();
    });

    it("shows monthly recurrence label", () => {
      renderRecurrenceSelector({
        recurrenceType: "monthly",
        recurrenceInterval: 3,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      expect(screen.getByText("Every 3 months")).toBeInTheDocument();
    });
  });

  describe("preset selection", () => {
    it("selects Daily preset", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      await userEvent.click(screen.getByRole("button", { name: "Daily" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "daily",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });

    it("selects Weekly preset", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      await userEvent.click(screen.getByRole("button", { name: "Weekly" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "weekly",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });

    it("selects Monthly preset", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      await userEvent.click(screen.getByRole("button", { name: "Monthly" }));

      expect(defaultOnChange).toHaveBeenCalledWith({
        recurrence_type: "monthly",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
      });
    });

    it("selects Custom type", async () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
      });

      await userEvent.click(screen.getByRole("button", { name: "Custom" }));

      expect(defaultOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_type: "custom",
        })
      );
    });
  });

  describe("disabled state", () => {
    it("disables all inputs when disabled", () => {
      renderRecurrenceSelector({
        recurrenceType: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        disabled: true,
      });

      const dailyButton = screen.getByRole("button", { name: "Daily" });
      expect(dailyButton).toBeDisabled();
    });

    it("has visual disabled state", () => {
      renderRecurrenceSelector({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        recurrenceWeekdays: null,
        disabled: true,
      });

      const dailyButton = screen.getByRole("button", { name: "Daily" });
      expect(dailyButton.className).toContain("opacity-50");
    });
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────────────

describe("RecurrenceSelector - Edge Cases", () => {
  it("handles rapid successive clicks without errors", async () => {
    renderRecurrenceSelector({
      recurrenceType: null,
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceWeekdays: null,
    });

    const dailyBtn = screen.getByRole("button", { name: "Daily" });
    const monthlyBtn = screen.getByRole("button", { name: "Monthly" });

    // Rapid clicks
    await userEvent.click(dailyBtn);
    await userEvent.click(monthlyBtn);
    await userEvent.click(dailyBtn);

    expect(defaultOnChange).toHaveBeenCalled();
  });

  it("handles null weekdays gracefully", async () => {
    renderRecurrenceSelector({
      recurrenceType: "custom",
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceWeekdays: null,
      compact: true,
    });

    // Click to expand
    await userEvent.click(screen.getByText("Custom"));

    // Should not crash when clicking weekday buttons
    const monBtn = screen.getByRole("button", { name: "Mon" });
    await userEvent.click(monBtn);

    expect(defaultOnChange).toHaveBeenCalled();
  });

  it("shows correct label for yearly", () => {
    renderRecurrenceSelector({
      recurrenceType: "yearly",
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceWeekdays: null,
    });

    expect(screen.getByText("Yearly")).toBeInTheDocument();
  });

  it("shows correct label for yearly with interval", () => {
    renderRecurrenceSelector({
      recurrenceType: "yearly",
      recurrenceInterval: 2,
      recurrenceEndDate: null,
      recurrenceWeekdays: null,
    });

    expect(screen.getByText("Every 2 years")).toBeInTheDocument();
  });

  it("handles empty weekdays array in compact mode", () => {
    renderRecurrenceSelector({
      recurrenceType: "weekly",
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceWeekdays: [],
      compact: true,
    });

    // Should not crash
    expect(screen.getByText("Weekly")).toBeInTheDocument();
  });

  it("preserves interval when changing type", async () => {
    // Start with no recurrence so Custom button is clickable
    renderRecurrenceSelector({
      recurrenceType: null,
      recurrenceInterval: 3,
      recurrenceEndDate: null,
      recurrenceWeekdays: null,
    });

    // Click Custom when no recurrence is set
    await userEvent.click(screen.getByRole("button", { name: "Custom" }));

    // Should call onChange with custom type and preserved interval
    expect(defaultOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence_type: "custom",
        recurrence_interval: 3,
      })
    );
  });

  it("clicking Custom in compact mode expands options", async () => {
    renderRecurrenceSelector({
      recurrenceType: "custom",
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceWeekdays: null,
      compact: true,
    });

    // Custom is already selected, click to see options
    await userEvent.click(screen.getByText("Custom"));

    // Should show expanded custom options
    expect(screen.getByText("Every")).toBeInTheDocument();
  });
});