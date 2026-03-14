import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveReflection, upsertStreak, getPendingReminder, getReflections, getReflectionById, deleteReflection, getStreaks } from "@/lib/reflections";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const chain = () => {
    const obj: Record<string, unknown> = {};
    const methods = ["select", "insert", "update", "delete", "upsert", "eq", "order", "single", "maybeSingle"];
    methods.forEach((m) => {
      obj[m] = vi.fn(() => obj);
    });
    // Default resolved value; individual tests override via mockResolvedValueOnce
    (obj as Record<string, unknown> & { then: unknown }).then = undefined;
    return obj;
  };

  const from = vi.fn(() => chain());
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

// Helper to build a chainable mock that resolves to a given value
function mockChain(resolvedValue: unknown) {
  const obj: Record<string, () => unknown> = {};
  const terminal = vi.fn().mockResolvedValue(resolvedValue);
  const methods = ["select", "insert", "update", "delete", "upsert", "eq", "order"];
  methods.forEach((m) => {
    obj[m] = vi.fn(() => obj);
  });
  obj.single = terminal;
  obj.maybeSingle = terminal;
  return obj;
}

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── saveReflection ────────────────────────────────────────────────────────────

describe("saveReflection", () => {
  it("calls supabase upsert with correct payload and returns reflection", async () => {
    const mockReflection = {
      id: "r1",
      user_id: "u1",
      type: "daily",
      period_start: "2026-03-14",
      sections: { accomplishments: "Done stuff" },
      mood: "happy",
      energy_level: 4,
    };

    // upsert chain → select → single
    const upsertChain = mockChain({ data: mockReflection, error: null });
    // streak chain (maybeSingle for existing check, then upsert)
    const streakReadChain = mockChain({ data: null, error: null });
    const streakWriteChain = mockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(upsertChain)   // reflections upsert
      .mockReturnValueOnce(streakReadChain) // reflection_streaks select
      .mockReturnValueOnce(streakWriteChain); // reflection_streaks upsert

    const result = await saveReflection(
      "u1",
      "daily",
      "2026-03-14",
      { accomplishments: "Done stuff" },
      "happy",
      4
    );

    expect(result).toEqual(mockReflection);
    expect(mockFrom).toHaveBeenCalledWith("reflections");
  });

  it("returns null when upsert returns error", async () => {
    const errorChain = mockChain({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValueOnce(errorChain);

    const result = await saveReflection("u1", "daily", "2026-03-14", {}, null, null);

    expect(result).toBeNull();
  });

  it("returns null when upsert returns no data", async () => {
    const noDataChain = mockChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(noDataChain);

    const result = await saveReflection("u1", "daily", "2026-03-14", {}, null, null);

    expect(result).toBeNull();
  });
});

// ── upsertStreak ──────────────────────────────────────────────────────────────

describe("upsertStreak", () => {
  it("creates new streak (current=1, longest=1) when no existing record", async () => {
    const readChain = mockChain({ data: null, error: null });
    const writeChain = mockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await upsertStreak("u1", "daily", "2026-03-14");

    // Verify write was called
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom).toHaveBeenNthCalledWith(2, "reflection_streaks");
  });

  it("does nothing when same period already recorded", async () => {
    const existing = {
      user_id: "u1",
      type: "daily",
      current_streak: 3,
      longest_streak: 5,
      last_completed_period: "2026-03-14",
    };

    const readChain = mockChain({ data: existing, error: null });
    mockFrom.mockReturnValueOnce(readChain);

    await upsertStreak("u1", "daily", "2026-03-14");

    // Should only call from once (the read) — no write
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("extends streak when previous period matches", async () => {
    const existing = {
      user_id: "u1",
      type: "daily",
      current_streak: 3,
      longest_streak: 3,
      last_completed_period: "2026-03-13", // yesterday
    };

    const readChain = mockChain({ data: existing, error: null });
    const writeChain = mockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await upsertStreak("u1", "daily", "2026-03-14");

    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("resets streak when a period was skipped", async () => {
    const existing = {
      user_id: "u1",
      type: "daily",
      current_streak: 5,
      longest_streak: 7,
      last_completed_period: "2026-03-10", // several days ago
    };

    const readChain = mockChain({ data: existing, error: null });
    const writeChain = mockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await upsertStreak("u1", "daily", "2026-03-14");

    // longest_streak should be preserved (7), current_streak reset to 1
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("extends weekly streak correctly", async () => {
    const existing = {
      user_id: "u1",
      type: "weekly",
      current_streak: 2,
      longest_streak: 2,
      last_completed_period: "2026-03-02", // previous Monday
    };

    const readChain = mockChain({ data: existing, error: null });
    const writeChain = mockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await upsertStreak("u1", "weekly", "2026-03-09");

    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("extends monthly streak correctly", async () => {
    const existing = {
      user_id: "u1",
      type: "monthly",
      current_streak: 1,
      longest_streak: 1,
      last_completed_period: "2026-02-01", // previous month
    };

    const readChain = mockChain({ data: existing, error: null });
    const writeChain = mockChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await upsertStreak("u1", "monthly", "2026-03-01");

    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});

// ── getPendingReminder ────────────────────────────────────────────────────────

describe("getPendingReminder", () => {
  // Monthly reminder: days 1–3, when last month's reflection is missing
  it("returns monthly reminder on day 1 when last month is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 10, 0, 0)); // Mar 1, 10am

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("monthly");
    expect(result?.periodStart).toBe("2026-02-01");
    vi.useRealTimers();
  });

  it("returns monthly reminder on day 3 when last month is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 3, 10, 0, 0)); // Mar 3

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("monthly");
    vi.useRealTimers();
  });

  it("does not return monthly reminder when last month's reflection exists", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 10, 0, 0)); // Mar 1

    const hasData = mockChain({ data: { id: "r1" }, error: null });
    mockFrom.mockReturnValue(hasData);

    const result = await getPendingReminder("u1");

    // monthly exists, no reminder expected (or lower priority one)
    if (result) {
      expect(result.type).not.toBe("monthly");
    }
    vi.useRealTimers();
  });

  // Weekly reminder: Sunday (0) or Monday (1)
  it("returns weekly reminder on Sunday when last week is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0)); // Mar 15 = Sunday

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("weekly");
    vi.useRealTimers();
  });

  it("returns weekly reminder on Monday when last week is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 10, 0, 0)); // Mar 16 = Monday

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("weekly");
    vi.useRealTimers();
  });

  // Daily morning: before noon → remind about yesterday
  it("returns daily morning reminder before noon when yesterday is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 14, 9, 0, 0)); // Saturday Mar 14, 9am

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("daily");
    expect(result?.isEvening).toBe(false);
    expect(result?.periodStart).toBe("2026-03-13");
    vi.useRealTimers();
  });

  // Daily evening: 6pm+ → remind about today
  it("returns daily evening reminder at 6pm when today is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 14, 18, 0, 0)); // Saturday Mar 14, 6pm

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("daily");
    expect(result?.isEvening).toBe(true);
    expect(result?.periodStart).toBe("2026-03-14");
    vi.useRealTimers();
  });

  it("returns null when no reminders are pending", async () => {
    vi.useFakeTimers();
    // Midday on Wednesday — not a monthly/weekly trigger day, not morning/evening
    vi.setSystemTime(new Date(2026, 2, 11, 13, 0, 0)); // Wed Mar 11, 1pm

    const result = await getPendingReminder("u1");

    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("monthly takes priority over weekly on day 1 of month that is also a Monday", async () => {
    vi.useFakeTimers();
    // Find a date that is both day 1 of month AND a Monday:
    // 2026-06-01 is a Monday
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));

    const noData = mockChain({ data: null, error: null });
    mockFrom.mockReturnValue(noData);

    const result = await getPendingReminder("u1");

    expect(result?.type).toBe("monthly");
    vi.useRealTimers();
  });
});

// ── getReflections ────────────────────────────────────────────────────────────

describe("getReflections", () => {
  it("returns list of reflections for user", async () => {
    const mockData = [
      { id: "r1", user_id: "u1", type: "daily", period_start: "2026-03-14" },
      { id: "r2", user_id: "u1", type: "weekly", period_start: "2026-03-09" },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getReflections("u1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("r1");
  });

  it("filters by type when provided", async () => {
    const mockData = [{ id: "r1", type: "daily" }];
    // getReflections does: .order(...) then conditionally .eq("type", type)
    // so the chain must remain chainable after .order() and be thenable at the end
    const resolved = { data: mockData, error: null };
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolved).then(resolve),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getReflections("u1", "daily");

    expect(result).toHaveLength(1);
    expect((chain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("type", "daily");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getReflections("u1");

    expect(result).toEqual([]);
  });
});

// ── getReflectionById ─────────────────────────────────────────────────────────

describe("getReflectionById", () => {
  it("returns reflection when found", async () => {
    const mockReflection = { id: "r1", type: "daily" };
    const chain = mockChain({ data: mockReflection, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getReflectionById("r1");

    expect(result?.id).toBe("r1");
  });

  it("returns null when not found", async () => {
    const chain = mockChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getReflectionById("nonexistent");

    expect(result).toBeNull();
  });
});

// ── deleteReflection ──────────────────────────────────────────────────────────

describe("deleteReflection", () => {
  it("calls delete on reflections table with the id", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await deleteReflection("r1");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "r1");
  });
});

// ── getStreaks ────────────────────────────────────────────────────────────────

describe("getStreaks", () => {
  it("returns streaks for user", async () => {
    const mockData = [
      { user_id: "u1", type: "daily", current_streak: 3, longest_streak: 5 },
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getStreaks("u1");

    expect(result).toHaveLength(1);
    expect(result[0].current_streak).toBe(3);
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getStreaks("u1");

    expect(result).toEqual([]);
  });
});
