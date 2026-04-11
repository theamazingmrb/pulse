import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTodayDailyIntent,
  getLatestDailyIntent,
  hasTodayIntent,
  getTodayIntentForReflection,
} from "@/lib/daily-intent";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

// Mock todayISO to return a fixed date
vi.mock("@/lib/utils", () => ({
  todayISO: () => "2026-03-14",
}));

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const MOCK_INTENT = {
  id: "ci1",
  created_at: "2026-03-14T08:00:00Z",
  user_id: "u1",
  time_of_day: "morning",
  daily_intent: "Focus on writing tests",
  say_no_to: "Social media",
  top_priority: "Complete test suite",
};

beforeEach(() => vi.clearAllMocks());

// ── getTodayDailyIntent ───────────────────────────────────────────────────────

describe("getTodayDailyIntent", () => {
  it("returns today's daily intent when found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_INTENT, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayDailyIntent("u1");

    expect(result).not.toBeNull();
    expect(result?.daily_intent).toBe("Focus on writing tests");
    expect(result?.date).toBe("2026-03-14");
    expect(chain.select).toHaveBeenCalledWith(
      "id, created_at, user_id, time_of_day, daily_intent, say_no_to, top_priority"
    );
  });

  it("returns null when no check-in found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayDailyIntent("u1");

    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayDailyIntent("u1");

    expect(result).toBeNull();
  });

  it("queries with today's date", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getTodayDailyIntent("u1");

    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(chain.eq).toHaveBeenCalledWith("date", "2026-03-14");
  });
});

// ── getLatestDailyIntent ───────────────────────────────────────────────────────

describe("getLatestDailyIntent", () => {
  it("returns today's intent if it has daily_intent set", async () => {
    // First call for getTodayDailyIntent
    const todayChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_INTENT, error: null }),
    };
    mockFrom.mockReturnValueOnce(todayChain);

    const result = await getLatestDailyIntent("u1");

    expect(result).not.toBeNull();
    expect(result?.daily_intent).toBe("Focus on writing tests");
  });

  it("falls back to most recent intent when today's has no daily_intent", async () => {
    // Today's intent has no daily_intent
    const todayChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, daily_intent: null },
        error: null,
      }),
    };

    // Fallback query
    const fallbackChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, created_at: "2026-03-13T08:00:00Z" },
        error: null,
      }),
    };

    mockFrom.mockReturnValueOnce(todayChain).mockReturnValueOnce(fallbackChain);

    const result = await getLatestDailyIntent("u1");

    expect(result).not.toBeNull();
    expect(fallbackChain.not).toHaveBeenCalledWith("daily_intent", "is", null);
  });

  it("returns null when no intent found at all", async () => {
    const todayChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const fallbackChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom.mockReturnValueOnce(todayChain).mockReturnValueOnce(fallbackChain);

    const result = await getLatestDailyIntent("u1");

    expect(result).toBeNull();
  });

  it("extracts date from created_at for fallback intent", async () => {
    const todayChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const fallbackChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          ...MOCK_INTENT,
          created_at: "2026-03-12T14:30:00Z",
        },
        error: null,
      }),
    };

    mockFrom.mockReturnValueOnce(todayChain).mockReturnValueOnce(fallbackChain);

    const result = await getLatestDailyIntent("u1");

    expect(result?.date).toBe("2026-03-12");
  });
});

// ── hasTodayIntent ─────────────────────────────────────────────────────────────

describe("hasTodayIntent", () => {
  it("returns true when today has a non-empty daily_intent", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_INTENT, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await hasTodayIntent("u1");

    expect(result).toBe(true);
  });

  it("returns false when daily_intent is null", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, daily_intent: null },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await hasTodayIntent("u1");

    expect(result).toBe(false);
  });

  it("returns false when daily_intent is empty string", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, daily_intent: "" },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await hasTodayIntent("u1");

    expect(result).toBe(false);
  });

  it("returns false when daily_intent is whitespace only", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, daily_intent: "   " },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await hasTodayIntent("u1");

    expect(result).toBe(false);
  });

  it("returns false when no check-in found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await hasTodayIntent("u1");

    expect(result).toBe(false);
  });
});

// ── getTodayIntentForReflection ───────────────────────────────────────────────

describe("getTodayIntentForReflection", () => {
  it("returns intent data for reflection when today has intent", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_INTENT, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayIntentForReflection("u1");

    expect(result).toEqual({
      daily_intent: "Focus on writing tests",
      say_no_to: "Social media",
    });
  });

  it("returns null when today has no intent", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayIntentForReflection("u1");

    expect(result).toBeNull();
  });

  it("returns null when daily_intent is null", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, daily_intent: null },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayIntentForReflection("u1");

    expect(result).toBeNull();
  });

  it("does NOT fallback to older intents (only today)", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayIntentForReflection("u1");

    // Should NOT make a second query like getLatestDailyIntent does
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it("returns say_no_to as null when not set", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_INTENT, say_no_to: null },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTodayIntentForReflection("u1");

    expect(result).toEqual({
      daily_intent: "Focus on writing tests",
      say_no_to: null,
    });
  });
});