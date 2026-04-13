import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCoreValues,
  addCoreValue,
  updateCoreValue,
  deleteCoreValue,
  reorderCoreValues,
  CORE_VALUE_PROMPTS,
  MAX_VALUES,
  MAX_VALUE_LENGTH,
} from "@/lib/core-values";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const MOCK_CORE_VALUE = {
  id: "cv1",
  user_id: "u1",
  value_text: "Integrity",
  value_order: 0,
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

const MOCK_CORE_VALUE_2 = {
  id: "cv2",
  user_id: "u1",
  value_text: "Growth",
  value_order: 1,
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

// ── getCoreValues ─────────────────────────────────────────────────────────────

describe("getCoreValues", () => {
  it("returns core values ordered by value_order", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [MOCK_CORE_VALUE, MOCK_CORE_VALUE_2],
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getCoreValues("u1");

    expect(result).toHaveLength(2);
    expect(result[0].value_text).toBe("Integrity");
    expect(result[1].value_text).toBe("Growth");
    expect(chain.order).toHaveBeenCalledWith("value_order", { ascending: true });
  });

  it("returns empty array when no values found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getCoreValues("u1");

    expect(result).toEqual([]);
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getCoreValues("u1");

    expect(result).toEqual([]);
  });
});

// ── addCoreValue ──────────────────────────────────────────────────────────────

describe("addCoreValue", () => {
  it("adds core value with valid text", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_CORE_VALUE, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await addCoreValue("u1", "Integrity", 0);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([MOCK_CORE_VALUE]);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        value_text: "Integrity",
        value_order: 0,
      })
    );
  });

  it("trims whitespace from value text", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_CORE_VALUE, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await addCoreValue("u1", "  Integrity  ", 0);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ value_text: "Integrity" })
    );
  });

  it("returns error when value is empty", async () => {
    const result = await addCoreValue("u1", "", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Value cannot be empty");
  });

  it("returns error when value is only whitespace", async () => {
    const result = await addCoreValue("u1", "   ", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Value cannot be empty");
  });

  it("returns error when value exceeds max length", async () => {
    const longValue = "a".repeat(MAX_VALUE_LENGTH + 1);
    const result = await addCoreValue("u1", longValue, 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Value must be ${MAX_VALUE_LENGTH} characters or less`);
  });

  it("returns error when max values reached", async () => {
    const result = await addCoreValue("u1", "Test", MAX_VALUES);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Maximum ${MAX_VALUES} values allowed`);
  });

  it("returns error on duplicate value (23505)", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await addCoreValue("u1", "Integrity", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("This value already exists");
  });

  it("returns generic error on other database errors", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "Database error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await addCoreValue("u1", "Test", 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to add value");
  });
});

// ── updateCoreValue ───────────────────────────────────────────────────────────

describe("updateCoreValue", () => {
  it("updates core value text", async () => {
    const updated = { ...MOCK_CORE_VALUE, value_text: "Honesty" };
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateCoreValue("u1", "cv1", "Honesty");

    expect(result.success).toBe(true);
    expect(result.data).toEqual([updated]);
  });

  it("trims whitespace from updated text", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_CORE_VALUE, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await updateCoreValue("u1", "cv1", "  Honesty  ");

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ value_text: "Honesty" })
    );
  });

  it("returns error when updated value is empty", async () => {
    const result = await updateCoreValue("u1", "cv1", "");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Value cannot be empty");
  });

  it("returns error when updated value exceeds max length", async () => {
    const longValue = "a".repeat(MAX_VALUE_LENGTH + 1);
    const result = await updateCoreValue("u1", "cv1", longValue);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Value must be ${MAX_VALUE_LENGTH} characters or less`);
  });

  it("returns error on duplicate value (23505)", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateCoreValue("u1", "cv1", "Duplicate");

    expect(result.success).toBe(false);
    expect(result.error).toBe("This value already exists");
  });

  it("verifies user_id matches during update", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_CORE_VALUE, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await updateCoreValue("u1", "cv1", "New Value");

    // Should have eq calls for both id and user_id
    expect(chain.eq).toHaveBeenCalledWith("id", "cv1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});

// ── deleteCoreValue ───────────────────────────────────────────────────────────

describe("deleteCoreValue", () => {
  it("returns success when delete succeeds", async () => {
    let eqCallCount = 0;
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve({ error: null });
        }
        return chain;
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteCoreValue("u1", "cv1");

    expect(result.success).toBe(true);
  });

  it("returns error when delete fails", async () => {
    let eqCallCount = 0;
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve({ error: { message: "Delete failed" } });
        }
        return chain;
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteCoreValue("u1", "cv1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to delete value");
  });

  it("verifies user_id matches during delete", async () => {
    let eqCallCount = 0;
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve({ error: null });
        }
        return chain;
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await deleteCoreValue("u1", "cv1");

    expect(chain.eq).toHaveBeenCalledWith("id", "cv1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});

// ── reorderCoreValues ─────────────────────────────────────────────────────────

describe("reorderCoreValues", () => {
  it("reorders values and returns updated list", async () => {
    // Mock for getCoreValues (called at end)
    const getChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { ...MOCK_CORE_VALUE_2, value_order: 0 },
          { ...MOCK_CORE_VALUE, value_order: 1 },
        ],
        error: null,
      }),
    };

    // Each update has two .eq() calls - chain returns itself for first, then resolves
    const createUpdateChain = () => {
      let callCount = 0;
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            return Promise.resolve({ error: null });
          }
          return chain;
        }),
      };
      return chain;
    };

    mockFrom
      .mockReturnValueOnce(createUpdateChain()) // First update
      .mockReturnValueOnce(createUpdateChain()) // Second update
      .mockReturnValueOnce(getChain); // getCoreValues

    const result = await reorderCoreValues("u1", ["cv2", "cv1"]);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("returns error when any update fails", async () => {
    let callCount = 0;
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({ error: { message: "Update failed" } });
        }
        return updateChain;
      }),
    };

    mockFrom.mockReturnValueOnce(updateChain);

    const result = await reorderCoreValues("u1", ["cv1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to reorder values");
  });

  it("sets correct order values based on array position", async () => {
    // Create update chain for first item
    let eqCallCount = 0;
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve({ error: null });
        }
        return updateChain;
      }),
    };
    
    const getChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(getChain);

    await reorderCoreValues("u1", ["cv1"]);

    expect(updateChain.update).toHaveBeenCalledWith({ value_order: 0 });
  });
});

// ── CORE_VALUE_PROMPTS ────────────────────────────────────────────────────────

describe("CORE_VALUE_PROMPTS", () => {
  it("is an array of strings", () => {
    expect(Array.isArray(CORE_VALUE_PROMPTS)).toBe(true);
    CORE_VALUE_PROMPTS.forEach((prompt) => {
      expect(typeof prompt).toBe("string");
    });
  });

  it("has at least 3 prompts", () => {
    expect(CORE_VALUE_PROMPTS.length).toBeGreaterThanOrEqual(3);
  });

  it("contains meaningful prompts", () => {
    expect(CORE_VALUE_PROMPTS).toContain("What principles guide your decisions?");
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe("Constants", () => {
  it("MAX_VALUES is 5", () => {
    expect(MAX_VALUES).toBe(5);
  });

  it("MAX_VALUE_LENGTH is 100", () => {
    expect(MAX_VALUE_LENGTH).toBe(100);
  });
});