import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getActiveProjects,
  PROJECT_COLORS,
} from "@/lib/projects";

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolved: unknown) {
  const obj: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(resolved);
  ["select", "insert", "update", "delete", "eq", "order"].forEach((m) => {
    obj[m] = vi.fn(() => obj);
  });
  obj.single = terminal;
  return obj;
}

const MOCK_PROJECT = {
  id: "p1",
  user_id: "u1",
  name: "My Project",
  description: null,
  color: "#3B82F6",
  status: "active",
  image_url: null,
  banner_url: null,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

// ── getProjects ───────────────────────────────────────────────────────────────

describe("getProjects", () => {
  it("returns projects for user", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [MOCK_PROJECT], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getProjects("u1");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Project");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await getProjects("u1")).toEqual([]);
  });

  it("queries by user_id", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getProjects("u1");

    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});

// ── getProject ────────────────────────────────────────────────────────────────

describe("getProject", () => {
  it("returns project when found", async () => {
    const chain = makeChain({ data: MOCK_PROJECT, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getProject("p1");

    expect(result?.id).toBe("p1");
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getProject("nonexistent");

    expect(result).toBeNull();
  });
});

// ── createProject ─────────────────────────────────────────────────────────────

describe("createProject", () => {
  it("inserts and returns project", async () => {
    const chain = makeChain({ data: MOCK_PROJECT, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createProject({
      user_id: "u1",
      name: "My Project",
      description: null,
      color: "#3B82F6",
      status: "active",
      image_url: null,
      banner_url: null,
    });

    expect(result?.name).toBe("My Project");
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ name: "My Project" }),
    ]);
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createProject({
      user_id: "u1",
      name: "x",
      description: null,
      color: "#fff",
      status: "active",
      image_url: null,
      banner_url: null,
    });

    expect(result).toBeNull();
  });
});

// ── updateProject ─────────────────────────────────────────────────────────────

describe("updateProject", () => {
  it("updates and returns project", async () => {
    const updated = { ...MOCK_PROJECT, name: "Updated Project" };
    const chain = makeChain({ data: updated, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateProject("p1", { name: "Updated Project" });

    expect(result?.name).toBe("Updated Project");
    expect(chain.update).toHaveBeenCalledWith({ name: "Updated Project" });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    expect(await updateProject("p1", { name: "x" })).toBeNull();
  });
});

// ── deleteProject ─────────────────────────────────────────────────────────────

describe("deleteProject", () => {
  it("returns true on success", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await deleteProject("p1")).toBe(true);
  });

  it("returns false on error", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await deleteProject("p1")).toBe(false);
  });
});

// ── getActiveProjects ─────────────────────────────────────────────────────────

describe("getActiveProjects", () => {
  it("filters by status=active", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [MOCK_PROJECT], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getActiveProjects("u1");

    expect(chain.eq).toHaveBeenCalledWith("status", "active");
    expect(result).toHaveLength(1);
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await getActiveProjects("u1")).toEqual([]);
  });
});

// ── PROJECT_COLORS ────────────────────────────────────────────────────────────

describe("PROJECT_COLORS", () => {
  it("has at least 6 colors", () => {
    expect(PROJECT_COLORS.length).toBeGreaterThanOrEqual(6);
  });

  it("all values are valid hex colors", () => {
    for (const color of PROJECT_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
