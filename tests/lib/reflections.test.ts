import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getPeriodStart, getPeriodLabel } from "@/lib/reflections";

// All dates assume UTC so tests are timezone-independent.
// FIXED_NOW = Saturday 2026-03-14 noon UTC
const FIXED_NOW = new Date(2026, 2, 14, 12, 0, 0);

describe("getPeriodStart", () => {
  describe("daily", () => {
    it("returns the date itself as ISO string", () => {
      expect(getPeriodStart("daily", new Date(2026, 2, 14))).toBe(
        "2026-03-14"
      );
    });

    it("handles month boundaries correctly", () => {
      expect(getPeriodStart("daily", new Date(2026, 2, 1))).toBe(
        "2026-03-01"
      );
    });

    it("uses today when no date passed", () => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
      expect(getPeriodStart("daily")).toBe("2026-03-14");
      vi.useRealTimers();
    });
  });

  describe("weekly — always returns Monday", () => {
    it("Wednesday → previous Monday", () => {
      // 2026-03-11 is Wednesday
      expect(getPeriodStart("weekly", new Date(2026, 2, 11))).toBe(
        "2026-03-09"
      );
    });

    it("Monday → same Monday", () => {
      expect(getPeriodStart("weekly", new Date(2026, 2, 9))).toBe(
        "2026-03-09"
      );
    });

    it("Sunday → previous Monday (6 days back)", () => {
      // 2026-03-15 is Sunday
      expect(getPeriodStart("weekly", new Date(2026, 2, 15))).toBe(
        "2026-03-09"
      );
    });

    it("Saturday → previous Monday (5 days back)", () => {
      // 2026-03-14 is Saturday
      expect(getPeriodStart("weekly", new Date(2026, 2, 14))).toBe(
        "2026-03-09"
      );
    });

    it("Tuesday → previous Monday", () => {
      // 2026-03-10 is Tuesday
      expect(getPeriodStart("weekly", new Date(2026, 2, 10))).toBe(
        "2026-03-09"
      );
    });
  });

  describe("monthly — always returns 1st of the month", () => {
    it("mid-month → 1st", () => {
      expect(getPeriodStart("monthly", new Date(2026, 2, 14))).toBe(
        "2026-03-01"
      );
    });

    it("last day of month → 1st", () => {
      expect(getPeriodStart("monthly", new Date(2026, 2, 31))).toBe(
        "2026-03-01"
      );
    });

    it("January → 2026-01-01", () => {
      expect(getPeriodStart("monthly", new Date(2026, 0, 15))).toBe(
        "2026-01-01"
      );
    });

    it("December → 2025-12-01", () => {
      expect(getPeriodStart("monthly", new Date(2025, 11, 25))).toBe(
        "2025-12-01"
      );
    });
  });
});

describe("getPeriodLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW); // Saturday 2026-03-14 noon UTC
  });
  afterEach(() => vi.useRealTimers());

  describe("daily", () => {
    it("returns 'Today' for today's period", () => {
      expect(getPeriodLabel("daily", "2026-03-14")).toBe("Today");
    });

    it("returns 'Yesterday' for yesterday's period", () => {
      expect(getPeriodLabel("daily", "2026-03-13")).toBe("Yesterday");
    });

    it("returns formatted date for older periods", () => {
      const label = getPeriodLabel("daily", "2026-03-10");
      expect(label).toMatch(/Mar 10/);
    });

    it("returns formatted date for a date in a different month", () => {
      const label = getPeriodLabel("daily", "2026-02-01");
      expect(label).toMatch(/Feb 1/);
    });
  });

  describe("weekly", () => {
    it("returns 'This Week' for the current week's Monday", () => {
      // Current week (FIXED_NOW = Saturday Mar 14): Monday = 2026-03-09
      expect(getPeriodLabel("weekly", "2026-03-09")).toBe("This Week");
    });

    it("returns 'Week of ...' for a past week", () => {
      const label = getPeriodLabel("weekly", "2026-03-02");
      expect(label).toMatch(/Week of/);
      expect(label).toMatch(/Mar 2/);
    });

    it("returns 'Week of ...' for an even older week", () => {
      const label = getPeriodLabel("weekly", "2026-02-23");
      expect(label).toMatch(/Week of/);
    });
  });

  describe("monthly", () => {
    it("returns 'March 2026' for March", () => {
      expect(getPeriodLabel("monthly", "2026-03-01")).toBe("March 2026");
    });

    it("returns 'January 2026' for January", () => {
      expect(getPeriodLabel("monthly", "2026-01-01")).toBe("January 2026");
    });

    it("returns 'December 2025' for December last year", () => {
      expect(getPeriodLabel("monthly", "2025-12-01")).toBe("December 2025");
    });
  });
});
