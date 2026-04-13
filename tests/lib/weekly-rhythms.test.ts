import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getWeeklyRhythms,
  getRhythmForBlock,
  getTodayRhythms,
  getRhythmsForDay,
  upsertRhythmBlock,
  applyRhythmPreset,
  getCurrentTimeBlock,
  getTimeBlockForHour,
  getRhythmSummaryForDay,
  formatEnergyLevel,
  formatTimeBlock,
  getRhythmSuggestion,
  getRhythmSuggestionMessage,
  DAYS_OF_WEEK,
  TIME_BLOCKS,
  ENERGY_LEVELS,
  FOCUS_MODES,
  PRESET_CONFIGS,
} from "@/lib/weekly-rhythms";
import type { WeeklyRhythm, TimeBlock, EnergyLevel } from "@/types";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const MOCK_RHYTHM: WeeklyRhythm = {
  id: "r1",
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
  user_id: "u1",
  day_of_week: 1, // Monday
  time_block: "morning",
  energy_level: "high",
  focus_mode: "deep",
  notes: null,
};

const MOCK_RHYTHM_2: WeeklyRhythm = {
  ...MOCK_RHYTHM,
  id: "r2",
  time_block: "afternoon",
  energy_level: "medium",
  focus_mode: "admin",
};

beforeEach(() => vi.clearAllMocks());

// ── Constants ─────────────────────────────────────────────────────────────────

describe("DAYS_OF_WEEK", () => {
  it("has 7 days", () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it("starts with Sunday (0)", () => {
    expect(DAYS_OF_WEEK[0]).toEqual({ value: 0, label: "Sunday" });
  });

  it("ends with Saturday (6)", () => {
    expect(DAYS_OF_WEEK[6]).toEqual({ value: 6, label: "Saturday" });
  });
});

describe("TIME_BLOCKS", () => {
  it("has 3 time blocks", () => {
    expect(TIME_BLOCKS).toHaveLength(3);
  });

  it("contains morning, afternoon, evening", () => {
    const values = TIME_BLOCKS.map((t) => t.value);
    expect(values).toContain("morning");
    expect(values).toContain("afternoon");
    expect(values).toContain("evening");
  });

  it("has correct hours for morning (6 AM - 12 PM)", () => {
    const morning = TIME_BLOCKS.find((t) => t.value === "morning");
    expect(morning?.hours).toBe("6 AM - 12 PM");
  });
});

describe("ENERGY_LEVELS", () => {
  it("has 3 energy levels", () => {
    expect(ENERGY_LEVELS).toHaveLength(3);
  });

  it("has correct colors", () => {
    const high = ENERGY_LEVELS.find((e) => e.value === "high");
    const medium = ENERGY_LEVELS.find((e) => e.value === "medium");
    const low = ENERGY_LEVELS.find((e) => e.value === "low");

    expect(high?.color).toBe("#22C55E");
    expect(medium?.color).toBe("#F59E0B");
    expect(low?.color).toBe("#EF4444");
  });
});

describe("FOCUS_MODES", () => {
  it("has 4 focus modes", () => {
    expect(FOCUS_MODES).toHaveLength(4);
  });

  it("contains all expected modes", () => {
    const values = FOCUS_MODES.map((m) => m.value);
    expect(values).toContain("deep");
    expect(values).toContain("quick");
    expect(values).toContain("planning");
    expect(values).toContain("admin");
  });
});

describe("PRESET_CONFIGS", () => {
  it("has 3 presets", () => {
    expect(Object.keys(PRESET_CONFIGS)).toHaveLength(3);
  });

  it("each preset has 21 rhythms (7 days × 3 blocks)", () => {
    expect(PRESET_CONFIGS.makers_schedule).toHaveLength(21);
    expect(PRESET_CONFIGS.night_owl).toHaveLength(21);
    expect(PRESET_CONFIGS.balanced).toHaveLength(21);
  });

  it("maker's schedule has high energy in mornings", () => {
    const mondayMorning = PRESET_CONFIGS.makers_schedule.find(
      (r) => r.day_of_week === 1 && r.time_block === "morning"
    );
    expect(mondayMorning?.energy_level).toBe("high");
    expect(mondayMorning?.focus_mode).toBe("deep");
  });

  it("night owl has high energy in evening", () => {
    const mondayEvening = PRESET_CONFIGS.night_owl.find(
      (r) => r.day_of_week === 1 && r.time_block === "evening"
    );
    expect(mondayEvening?.energy_level).toBe("high");
  });
});

// ── getWeeklyRhythms ──────────────────────────────────────────────────────────

describe("getWeeklyRhythms", () => {
  it("returns rhythms ordered by day and time", async () => {
    // Create chain that handles two consecutive .order() calls
    const orderResult = {
      data: [MOCK_RHYTHM, MOCK_RHYTHM_2],
      error: null,
    };
    
    let orderCallCount = 0;
    const orderMock = vi.fn().mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 2) {
        return Promise.resolve(orderResult);
      }
      return chain; // Return chain for first call
    });

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };
    
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWeeklyRhythms("u1");

    expect(result).toHaveLength(2);
    expect(chain.order).toHaveBeenCalledWith("day_of_week", { ascending: true });
  });

  it("returns empty array on error", async () => {
    const orderResult = {
      data: null,
      error: { message: "Database error" },
    };
    
    let orderCallCount = 0;
    const orderMock = vi.fn().mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 2) {
        return Promise.resolve(orderResult);
      }
      return chain;
    });

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };
    
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWeeklyRhythms("u1");

    expect(result).toEqual([]);
  });

  it("returns empty array when no rhythms found", async () => {
    const orderResult = {
      data: [],
      error: null,
    };
    
    let orderCallCount = 0;
    const orderMock = vi.fn().mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 2) {
        return Promise.resolve(orderResult);
      }
      return chain;
    });

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };
    
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWeeklyRhythms("u1");

    expect(result).toEqual([]);
  });
});

// ── getRhythmForBlock ─────────────────────────────────────────────────────────

describe("getRhythmForBlock", () => {
  it("returns rhythm for specific day and block", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_RHYTHM, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getRhythmForBlock("u1", 1, "morning");

    expect(result).toEqual(MOCK_RHYTHM);
  });

  it("returns null on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getRhythmForBlock("u1", 1, "morning");

    expect(result).toBeNull();
  });

  it("queries with correct filters", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getRhythmForBlock("u1", 2, "afternoon");

    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(chain.eq).toHaveBeenCalledWith("day_of_week", 2);
    expect(chain.eq).toHaveBeenCalledWith("time_block", "afternoon");
  });
});

// ── getTodayRhythms ───────────────────────────────────────────────────────────

describe("getTodayRhythms", () => {
  it("uses current day of week", async () => {
    const realDate = new Date();
    const expectedDay = realDate.getDay();

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getTodayRhythms("u1");

    expect(chain.eq).toHaveBeenCalledWith("day_of_week", expectedDay);
  });
});

// ── getRhythmsForDay ──────────────────────────────────────────────────────────

describe("getRhythmsForDay", () => {
  it("returns rhythms for specific day", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [MOCK_RHYTHM, MOCK_RHYTHM_2],
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getRhythmsForDay("u1", 1);

    expect(chain.eq).toHaveBeenCalledWith("day_of_week", 1);
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getRhythmsForDay("u1", 1);

    expect(result).toEqual([]);
  });
});

// ── upsertRhythmBlock ─────────────────────────────────────────────────────────

describe("upsertRhythmBlock", () => {
  it("upserts rhythm block with correct data", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_RHYTHM, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await upsertRhythmBlock(
      "u1",
      1,
      "morning",
      "high",
      "deep",
      "Focus time"
    );

    expect(result).toEqual(MOCK_RHYTHM);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        day_of_week: 1,
        time_block: "morning",
        energy_level: "high",
        focus_mode: "deep",
        notes: "Focus time",
      }),
      { onConflict: "user_id,day_of_week,time_block" }
    );
  });

  it("handles null notes", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_RHYTHM, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await upsertRhythmBlock("u1", 1, "morning", "high", "deep");

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null }),
      expect.any(Object)
    );
  });

  it("returns null on error", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await upsertRhythmBlock("u1", 1, "morning", "high", "deep");

    expect(result).toBeNull();
  });
});

// ── applyRhythmPreset ──────────────────────────────────────────────────────────

describe("applyRhythmPreset", () => {
  it("deletes existing rhythms and inserts preset", async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: PRESET_CONFIGS.makers_schedule,
        error: null,
      }),
    };

    mockFrom.mockReturnValueOnce(deleteChain).mockReturnValueOnce(insertChain);

    const result = await applyRhythmPreset("u1", "makers_schedule");

    expect(result).toHaveLength(21);
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(insertChain.insert).toHaveBeenCalled();
  });

  it("returns empty array on insert error", async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Error" },
      }),
    };

    mockFrom.mockReturnValueOnce(deleteChain).mockReturnValueOnce(insertChain);

    const result = await applyRhythmPreset("u1", "makers_schedule");

    expect(result).toEqual([]);
  });
});

// ── getCurrentTimeBlock ───────────────────────────────────────────────────────

describe("getCurrentTimeBlock", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns 'morning' at 6 AM", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 6, 0, 0));
    expect(getCurrentTimeBlock()).toBe("morning");
  });

  it("returns 'morning' at 11:59 AM", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 11, 59, 0));
    expect(getCurrentTimeBlock()).toBe("morning");
  });

  it("returns 'afternoon' at 12 PM", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 12, 0, 0));
    expect(getCurrentTimeBlock()).toBe("afternoon");
  });

  it("returns 'afternoon' at 5:59 PM", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 17, 59, 0));
    expect(getCurrentTimeBlock()).toBe("afternoon");
  });

  it("returns 'evening' at 6 PM", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 18, 0, 0));
    expect(getCurrentTimeBlock()).toBe("evening");
  });

  it("returns 'evening' at midnight (0 hours)", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 0, 0, 0));
    expect(getCurrentTimeBlock()).toBe("evening");
  });

  it("returns 'evening' at 5 AM", () => {
    vi.setSystemTime(new Date(2026, 2, 14, 5, 0, 0));
    expect(getCurrentTimeBlock()).toBe("evening");
  });
});

// ── getTimeBlockForHour ───────────────────────────────────────────────────────

describe("getTimeBlockForHour", () => {
  it("returns 'morning' for hours 6-11", () => {
    expect(getTimeBlockForHour(6)).toBe("morning");
    expect(getTimeBlockForHour(8)).toBe("morning");
    expect(getTimeBlockForHour(11)).toBe("morning");
  });

  it("returns 'afternoon' for hours 12-17", () => {
    expect(getTimeBlockForHour(12)).toBe("afternoon");
    expect(getTimeBlockForHour(15)).toBe("afternoon");
    expect(getTimeBlockForHour(17)).toBe("afternoon");
  });

  it("returns 'evening' for hours 18-23 and 0-5", () => {
    expect(getTimeBlockForHour(18)).toBe("evening");
    expect(getTimeBlockForHour(23)).toBe("evening");
    expect(getTimeBlockForHour(0)).toBe("evening");
    expect(getTimeBlockForHour(5)).toBe("evening");
  });
});

// ── getRhythmSummaryForDay ────────────────────────────────────────────────────

describe("getRhythmSummaryForDay", () => {
  it("categorizes rhythms by energy and focus mode", () => {
    const rhythms: WeeklyRhythm[] = [
      { ...MOCK_RHYTHM, energy_level: "high", focus_mode: "deep", time_block: "morning" },
      { ...MOCK_RHYTHM, energy_level: "low", focus_mode: "admin", time_block: "afternoon" },
      { ...MOCK_RHYTHM, energy_level: "high", focus_mode: "planning", time_block: "evening" },
    ];

    const summary = getRhythmSummaryForDay(rhythms);

    expect(summary.highEnergyBlocks).toContain("morning");
    expect(summary.highEnergyBlocks).toContain("evening");
    expect(summary.lowEnergyBlocks).toContain("afternoon");
    expect(summary.deepFocusBlocks).toContain("morning");
    expect(summary.adminBlocks).toContain("afternoon");
  });

  it("returns empty arrays for empty rhythms", () => {
    const summary = getRhythmSummaryForDay([]);

    expect(summary.highEnergyBlocks).toEqual([]);
    expect(summary.lowEnergyBlocks).toEqual([]);
    expect(summary.deepFocusBlocks).toEqual([]);
    expect(summary.adminBlocks).toEqual([]);
  });
});

// ── formatEnergyLevel ─────────────────────────────────────────────────────────

describe("formatEnergyLevel", () => {
  it("returns capitalized label", () => {
    expect(formatEnergyLevel("high")).toBe("High");
    expect(formatEnergyLevel("medium")).toBe("Medium");
    expect(formatEnergyLevel("low")).toBe("Low");
  });

  it("returns the value itself if not found", () => {
    expect(formatEnergyLevel("unknown" as EnergyLevel)).toBe("unknown");
  });
});

// ── formatTimeBlock ────────────────────────────────────────────────────────────

describe("formatTimeBlock", () => {
  it("returns capitalized label", () => {
    expect(formatTimeBlock("morning")).toBe("Morning");
    expect(formatTimeBlock("afternoon")).toBe("Afternoon");
    expect(formatTimeBlock("evening")).toBe("Evening");
  });

  it("returns the value itself if not found", () => {
    expect(formatTimeBlock("unknown" as TimeBlock)).toBe("unknown");
  });
});

// ── getRhythmSuggestion ───────────────────────────────────────────────────────

describe("getRhythmSuggestion", () => {
  const rhythms: WeeklyRhythm[] = [
    { ...MOCK_RHYTHM, day_of_week: 1, time_block: "morning", energy_level: "high", focus_mode: "deep" },
    { ...MOCK_RHYTHM, day_of_week: 1, time_block: "afternoon", energy_level: "medium", focus_mode: "admin" },
    { ...MOCK_RHYTHM, day_of_week: 2, time_block: "morning", energy_level: "medium", focus_mode: "deep" },
  ];

  it("returns best block for matching focus mode", () => {
    const suggestion = getRhythmSuggestion(rhythms, "deep");

    expect(suggestion).not.toBeNull();
    // getRhythmSuggestion returns { dayOfWeek, timeBlock, energyLevel }
    expect(suggestion?.timeBlock).toBe("morning");
    // Should prefer high energy
    expect(suggestion?.energyLevel).toBe("high");
  });

  it("filters by preferred days when provided", () => {
    const suggestion = getRhythmSuggestion(rhythms, "deep", [2]);

    expect(suggestion?.dayOfWeek).toBe(2);
  });

  it("fallbacks to high energy block when no focus mode match", () => {
    const suggestion = getRhythmSuggestion(rhythms, "quick");

    // No quick blocks, should fallback to high energy
    expect(suggestion?.energyLevel).toBe("high");
  });

  it("returns null when no rhythms", () => {
    const suggestion = getRhythmSuggestion([], "deep");

    expect(suggestion).toBeNull();
  });

  it("returns null when preferred days have no rhythms", () => {
    const suggestion = getRhythmSuggestion(rhythms, "deep", [6]); // Saturday

    expect(suggestion).toBeNull();
  });
});

// ── getRhythmSuggestionMessage ─────────────────────────────────────────────────

describe("getRhythmSuggestionMessage", () => {
  const rhythms: WeeklyRhythm[] = [
    { ...MOCK_RHYTHM, day_of_week: 1, time_block: "morning", energy_level: "high", focus_mode: "deep" },
  ];

  it("returns human-readable message", () => {
    const message = getRhythmSuggestionMessage(rhythms, "deep");

    expect(message).toContain("Deep Focus");
    expect(message).toContain("Monday");
    expect(message).toContain("morning");
  });

  it("returns null when focus mode is null", () => {
    const message = getRhythmSuggestionMessage(rhythms, null);

    expect(message).toBeNull();
  });

  it("returns null when no rhythms", () => {
    const message = getRhythmSuggestionMessage([], "deep");

    expect(message).toBeNull();
  });
});