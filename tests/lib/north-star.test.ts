import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNorthStar,
  upsertNorthStar,
  deleteNorthStar,
  truncateNorthStar,
  NORTH_STAR_PROMPTS,
  MAX_CONTENT_LENGTH,
} from "@/lib/north-star";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const MOCK_NORTH_STAR = {
  id: "ns1",
  user_id: "u1",
  content: "Build meaningful products that improve people's lives",
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

// ── getNorthStar ──────────────────────────────────────────────────────────────

describe("getNorthStar", () => {
  it("returns north star when found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_NORTH_STAR, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getNorthStar("u1");

    expect(result).toEqual(MOCK_NORTH_STAR);
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("returns null when no north star found (PGRST116)", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getNorthStar("u1");

    expect(result).toBeNull();
  });

  it("returns null on other errors", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "Database error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getNorthStar("u1");

    expect(result).toBeNull();
  });
});

// ── upsertNorthStar ───────────────────────────────────────────────────────────

describe("upsertNorthStar", () => {
  it("creates north star with valid content", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_NORTH_STAR, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await upsertNorthStar("u1", "Build meaningful products");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(MOCK_NORTH_STAR);
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: "u1", content: "Build meaningful products" },
      { onConflict: "user_id", ignoreDuplicates: false }
    );
  });

  it("trims whitespace from content", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_NORTH_STAR, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await upsertNorthStar("u1", "  Build meaningful products  ");

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Build meaningful products" }),
      expect.any(Object)
    );
  });

  it("returns error when content is empty", async () => {
    const result = await upsertNorthStar("u1", "");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Content cannot be empty");
  });

  it("returns error when content is only whitespace", async () => {
    const result = await upsertNorthStar("u1", "   ");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Content cannot be empty");
  });

  it("returns error when content exceeds max length", async () => {
    const longContent = "a".repeat(MAX_CONTENT_LENGTH + 1);
    const result = await upsertNorthStar("u1", longContent);

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
  });

  it("accepts content at exactly max length", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_NORTH_STAR, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const maxContent = "a".repeat(MAX_CONTENT_LENGTH);
    const result = await upsertNorthStar("u1", maxContent);

    expect(result.success).toBe(true);
  });

  it("returns error on database error", async () => {
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await upsertNorthStar("u1", "Valid content");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to save North Star");
  });
});

// ── deleteNorthStar ───────────────────────────────────────────────────────────

describe("deleteNorthStar", () => {
  it("returns success when delete succeeds", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteNorthStar("u1");

    expect(result.success).toBe(true);
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("returns error when delete fails", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteNorthStar("u1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to delete North Star");
  });
});

// ── truncateNorthStar ─────────────────────────────────────────────────────────

describe("truncateNorthStar", () => {
  it("returns content as-is when shorter than max length", () => {
    const content = "Short content";
    expect(truncateNorthStar(content, 100)).toBe(content);
  });

  it("returns content as-is when exactly max length", () => {
    const content = "a".repeat(100);
    expect(truncateNorthStar(content, 100)).toBe(content);
  });

  it("truncates and adds ellipsis when longer than max length", () => {
    const content = "Build meaningful products that improve people's lives";
    const result = truncateNorthStar(content, 20);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(23); // 20 + "..."
  });

  it("truncates at word boundary when possible", () => {
    const content = "Build meaningful products";
    const result = truncateNorthStar(content, 10);
    // Should truncate at last space before position 10
    expect(result).toBe("Build...");
  });

  it("hard truncates when no space before max length", () => {
    const content = "abcdefghijklmnopqrstuvwxyz";
    const result = truncateNorthStar(content, 10);
    expect(result).toBe("abcdefghij...");
  });

  it("uses default max length of 100", () => {
    const content = "a".repeat(150);
    const result = truncateNorthStar(content);
    expect(result.length).toBe(103); // 100 + "..."
  });
});

// ── NORTH_STAR_PROMPTS ────────────────────────────────────────────────────────

describe("NORTH_STAR_PROMPTS", () => {
  it("is an array of strings", () => {
    expect(Array.isArray(NORTH_STAR_PROMPTS)).toBe(true);
    NORTH_STAR_PROMPTS.forEach((prompt) => {
      expect(typeof prompt).toBe("string");
    });
  });

  it("has at least 3 prompts", () => {
    expect(NORTH_STAR_PROMPTS.length).toBeGreaterThanOrEqual(3);
  });

  it("contains meaningful prompts", () => {
    expect(NORTH_STAR_PROMPTS).toContain(
      "What does success look like for you in 5 years?"
    );
  });
});