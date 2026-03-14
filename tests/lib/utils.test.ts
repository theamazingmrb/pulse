import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  getTimeOfDay,
  getSessionLabel,
  getGreeting,
  formatDate,
  formatTime,
  todayISO,
} from "@/lib/utils";

// Local time dates — the utils functions use new Date().getHours() / getDate()
// so mocks must be in local time to match the timezone the code runs in.
const FIXED_NOW = new Date(2026, 2, 14, 12, 0, 0); // March 14, noon local

describe("cn", () => {
  it("merges plain class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("drops falsy values", () => {
    expect(cn("foo", false && "bar", undefined, "baz")).toBe("foo baz");
  });

  it("resolves Tailwind conflicts — last padding wins", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("resolves Tailwind conflicts — last text color wins", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("getTimeOfDay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns 'morning' at 6am", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 6, 0, 0));
    expect(getTimeOfDay()).toBe("morning");
  });

  it("returns 'morning' at 11:59am", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 11, 59, 0));
    expect(getTimeOfDay()).toBe("morning");
  });

  it("returns 'midday' at noon", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 12, 0, 0));
    expect(getTimeOfDay()).toBe("midday");
  });

  it("returns 'midday' at 4:59pm", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 16, 59, 0));
    expect(getTimeOfDay()).toBe("midday");
  });

  it("returns 'evening' at 5pm", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 17, 0, 0));
    expect(getTimeOfDay()).toBe("evening");
  });

  it("returns 'evening' at midnight", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 23, 59, 0));
    expect(getTimeOfDay()).toBe("evening");
  });
});

describe("getSessionLabel", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns 'morning' before noon", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 8, 0, 0));
    expect(getSessionLabel()).toBe("morning");
  });

  it("returns 'afternoon' at noon", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 12, 0, 0));
    expect(getSessionLabel()).toBe("afternoon");
  });

  it("returns 'afternoon' at 4:59pm", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 16, 59, 0));
    expect(getSessionLabel()).toBe("afternoon");
  });

  it("returns 'evening' at 5pm", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 17, 0, 0));
    expect(getSessionLabel()).toBe("evening");
  });
});

describe("getGreeting", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns morning greeting", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 8, 0, 0));
    expect(getGreeting("Alex")).toBe("Good morning, Alex");
  });

  it("returns midday greeting", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 14, 0, 0));
    expect(getGreeting("Alex")).toBe("Hey Alex");
  });

  it("returns evening greeting", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 19, 0, 0));
    expect(getGreeting("Alex")).toBe("Evening, Alex");
  });

  it("uses default name when none provided", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 8, 0, 0));
    expect(getGreeting()).toBe("Good morning, BJ");
  });
});

describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns 'today' for today's date", () => {
    expect(formatDate("2026-03-14")).toBe("today");
  });

  it("returns 'yesterday' for 1 day ago", () => {
    expect(formatDate("2026-03-13")).toBe("yesterday");
  });

  it("returns N days ago for 2–6 days", () => {
    expect(formatDate("2026-03-11")).toBe("3 days ago");
  });

  it("returns N weeks ago for 7–29 days", () => {
    expect(formatDate("2026-03-07")).toBe("1 weeks ago");
  });

  it("returns N months ago for 30–364 days", () => {
    // 2026-01-01 → ~72 days back → 2 months
    expect(formatDate("2026-01-01")).toBe("2 months ago");
  });

  it("returns N years ago for 365+ days", () => {
    // 2025-03-13 → 366 days back
    expect(formatDate("2025-03-13")).toBe("1 years ago");
  });
});

describe("formatTime", () => {
  it("formats an ISO string to a readable time", () => {
    // Use a fixed UTC time; exact format depends on locale but should include hour + minutes
    const result = formatTime("2026-03-14T14:30:00Z");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("todayISO", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns today in YYYY-MM-DD format", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0));
    expect(todayISO()).toBe("2026-03-14");
  });

  it("reflects the mocked date", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
    expect(todayISO()).toBe("2026-01-01");
  });
});
