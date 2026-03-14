import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserOnboarding,
  createUserOnboarding,
  updateOnboardingProgress,
  skipOnboarding,
  ONBOARDING_STEPS,
} from "@/lib/onboarding";

vi.mock("./supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolved: unknown) {
  const obj: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(resolved);
  ["select", "insert", "update", "upsert", "eq"].forEach((m) => {
    obj[m] = vi.fn(() => obj);
  });
  obj.single = terminal;
  return obj;
}

const MOCK_ONBOARDING = {
  id: "o1",
  user_id: "u1",
  completed_steps: [],
  is_completed: false,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

// ── getUserOnboarding ─────────────────────────────────────────────────────────

describe("getUserOnboarding", () => {
  it("returns onboarding record when found", async () => {
    const chain = makeChain({ data: MOCK_ONBOARDING, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getUserOnboarding("u1");

    expect(result?.user_id).toBe("u1");
    expect(result?.is_completed).toBe(false);
  });

  it("returns null when not found (PGRST116)", async () => {
    const chain = makeChain({ data: null, error: { code: "PGRST116" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getUserOnboarding("u1");

    expect(result).toBeNull();
  });

  it("returns null on other errors", async () => {
    const chain = makeChain({ data: null, error: { code: "42000", message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getUserOnboarding("u1");

    expect(result).toBeNull();
  });
});

// ── createUserOnboarding ──────────────────────────────────────────────────────

describe("createUserOnboarding", () => {
  it("creates new onboarding record with empty steps", async () => {
    const chain = makeChain({ data: MOCK_ONBOARDING, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createUserOnboarding("u1");

    expect(result?.completed_steps).toEqual([]);
    expect(result?.is_completed).toBe(false);
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "u1",
        completed_steps: [],
        is_completed: false,
      }),
    ]);
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createUserOnboarding("u1");

    expect(result).toBeNull();
  });
});

// ── updateOnboardingProgress ──────────────────────────────────────────────────

describe("updateOnboardingProgress", () => {
  it("adds step to completed_steps when isCompleted=true", async () => {
    const existing = { ...MOCK_ONBOARDING, completed_steps: ["welcome"] };
    const readChain = makeChain({ data: existing, error: null });
    const writeChain = makeChain({
      data: { ...MOCK_ONBOARDING, completed_steps: ["welcome", "projects"] },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(readChain)  // getUserOnboarding
      .mockReturnValueOnce(writeChain); // update

    const result = await updateOnboardingProgress("u1", "projects", true);

    expect(result?.completed_steps).toContain("projects");
  });

  it("does not add step when isCompleted=false", async () => {
    const existing = { ...MOCK_ONBOARDING, completed_steps: ["welcome"] };
    const readChain = makeChain({ data: existing, error: null });
    const writeChain = makeChain({
      data: { ...MOCK_ONBOARDING, completed_steps: ["welcome"] },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await updateOnboardingProgress("u1", "projects", false);

    expect(writeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_steps: ["welcome"] })
    );
  });

  it("sets is_completed=true only when step is 'complete'", async () => {
    const existing = {
      ...MOCK_ONBOARDING,
      completed_steps: ["welcome", "projects", "tasks", "journal", "playlist"],
    };
    const readChain = makeChain({ data: existing, error: null });
    const writeChain = makeChain({
      data: { ...existing, is_completed: true },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await updateOnboardingProgress("u1", "complete", true);

    expect(writeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_completed: true })
    );
  });

  it("does not set is_completed=true for non-complete steps", async () => {
    const existing = { ...MOCK_ONBOARDING, completed_steps: ["welcome"] };
    const readChain = makeChain({ data: existing, error: null });
    const writeChain = makeChain({
      data: { ...existing, completed_steps: ["welcome", "projects"] },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    await updateOnboardingProgress("u1", "projects", true);

    expect(writeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_completed: false })
    );
  });

  it("creates onboarding if none exists, then updates", async () => {
    // First call: not found
    const notFoundChain = makeChain({ data: null, error: { code: "PGRST116" } });
    // Second call: create
    const createChain = makeChain({ data: MOCK_ONBOARDING, error: null });
    // Third call: getUserOnboarding again (recursive call)
    const readChain2 = makeChain({ data: MOCK_ONBOARDING, error: null });
    // Fourth call: update
    const writeChain = makeChain({
      data: { ...MOCK_ONBOARDING, completed_steps: ["welcome"] },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(notFoundChain) // getUserOnboarding (not found)
      .mockReturnValueOnce(createChain)   // createUserOnboarding
      .mockReturnValueOnce(readChain2)    // getUserOnboarding (recursive)
      .mockReturnValueOnce(writeChain);   // update

    const result = await updateOnboardingProgress("u1", "welcome", true);

    expect(result).not.toBeNull();
  });

  it("returns null when update fails", async () => {
    const existing = { ...MOCK_ONBOARDING };
    const readChain = makeChain({ data: existing, error: null });
    const writeChain = makeChain({ data: null, error: { message: "fail" } });

    mockFrom
      .mockReturnValueOnce(readChain)
      .mockReturnValueOnce(writeChain);

    const result = await updateOnboardingProgress("u1", "welcome", true);

    expect(result).toBeNull();
  });
});

// ── skipOnboarding ────────────────────────────────────────────────────────────

describe("skipOnboarding", () => {
  it("returns true when upsert succeeds", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await skipOnboarding("u1");

    expect(result).toBe(true);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        is_completed: true,
        completed_steps: ONBOARDING_STEPS,
      }),
      expect.objectContaining({ onConflict: "user_id" })
    );
  });

  it("returns false on error", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await skipOnboarding("u1");

    expect(result).toBe(false);
  });
});
