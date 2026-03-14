import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWarMapCategories,
  createWarMapCategory,
  updateWarMapCategory,
  deleteWarMapCategory,
  createWarMapItem,
  updateWarMapItem,
  deleteWarMapItem,
  linkTaskToWarMapItem,
  unlinkTaskFromWarMapItem,
  getWarMapItemsForTask,
  getAllWarMapItems,
} from "@/lib/warmap";

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolved: unknown) {
  const obj: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(resolved);
  ["select", "insert", "update", "delete", "upsert", "eq", "order"].forEach((m) => {
    obj[m] = vi.fn(() => obj);
  });
  obj.single = terminal;
  obj.maybeSingle = terminal;
  return obj;
}

beforeEach(() => vi.clearAllMocks());

// ── getWarMapCategories ───────────────────────────────────────────────────────

describe("getWarMapCategories", () => {
  it("returns categories with items", async () => {
    const mockData = [
      { id: "c1", name: "Health", items: [{ id: "i1", title: "Run 5k" }] },
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWarMapCategories("u1");

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWarMapCategories("u1");

    expect(result).toEqual([]);
  });
});

// ── createWarMapCategory ──────────────────────────────────────────────────────

describe("createWarMapCategory", () => {
  it("inserts and returns the new category", async () => {
    const category = { id: "c1", user_id: "u1", name: "Career" };
    const chain = makeChain({ data: category, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createWarMapCategory("u1", { name: "Career" });

    expect(result?.name).toBe("Career");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", name: "Career" })
    );
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createWarMapCategory("u1", { name: "Career" });

    expect(result).toBeNull();
  });
});

// ── updateWarMapCategory ──────────────────────────────────────────────────────

describe("updateWarMapCategory", () => {
  it("updates and returns category", async () => {
    const chain = makeChain({ data: { id: "c1", name: "Updated" }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateWarMapCategory("c1", { name: "Updated" });

    expect(result?.name).toBe("Updated");
    expect(chain.update).toHaveBeenCalledWith({ name: "Updated" });
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateWarMapCategory("c1", { name: "x" });

    expect(result).toBeNull();
  });
});

// ── deleteWarMapCategory ──────────────────────────────────────────────────────

describe("deleteWarMapCategory", () => {
  it("returns true on success", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteWarMapCategory("c1");

    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteWarMapCategory("c1");

    expect(result).toBe(false);
  });
});

// ── createWarMapItem ──────────────────────────────────────────────────────────

describe("createWarMapItem", () => {
  it("inserts with user_id and category_id", async () => {
    const item = { id: "i1", title: "Run 5k", category_id: "c1" };
    const chain = makeChain({ data: item, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createWarMapItem("u1", "c1", { title: "Run 5k" });

    expect(result?.title).toBe("Run 5k");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", category_id: "c1", title: "Run 5k" })
    );
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createWarMapItem("u1", "c1", { title: "x" });

    expect(result).toBeNull();
  });
});

// ── updateWarMapItem ──────────────────────────────────────────────────────────

describe("updateWarMapItem", () => {
  it("updates and returns item", async () => {
    const chain = makeChain({ data: { id: "i1", title: "Updated" }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateWarMapItem("i1", { title: "Updated" });

    expect(result?.title).toBe("Updated");
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateWarMapItem("i1", { title: "x" });

    expect(result).toBeNull();
  });
});

// ── deleteWarMapItem ──────────────────────────────────────────────────────────

describe("deleteWarMapItem", () => {
  it("returns true on success", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await deleteWarMapItem("i1")).toBe(true);
  });

  it("returns false on error", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await deleteWarMapItem("i1")).toBe(false);
  });
});

// ── linkTaskToWarMapItem ──────────────────────────────────────────────────────

describe("linkTaskToWarMapItem", () => {
  it("returns true on successful link", async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await linkTaskToWarMapItem("t1", "i1")).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith({ task_id: "t1", warmap_item_id: "i1" });
  });

  it("returns true on unique constraint violation (already linked)", async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: { code: "23505", message: "dup" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await linkTaskToWarMapItem("t1", "i1")).toBe(true);
  });

  it("returns false on other errors", async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: { code: "42000", message: "other error" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    expect(await linkTaskToWarMapItem("t1", "i1")).toBe(false);
  });
});

// ── unlinkTaskFromWarMapItem ──────────────────────────────────────────────────

describe("unlinkTaskFromWarMapItem", () => {
  it("returns true on success", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Second eq resolves
    let eqCount = 0;
    chain.eq = vi.fn().mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: null });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    expect(await unlinkTaskFromWarMapItem("t1", "i1")).toBe(true);
  });

  it("returns false on error", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    let eqCount = 0;
    chain.eq = vi.fn().mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: { message: "fail" } });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    expect(await unlinkTaskFromWarMapItem("t1", "i1")).toBe(false);
  });
});

// ── getWarMapItemsForTask ─────────────────────────────────────────────────────

describe("getWarMapItemsForTask", () => {
  it("returns warmap items for a task", async () => {
    const mockData = [{ warmap_items: { id: "i1", title: "Goal" } }];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWarMapItemsForTask("t1");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Goal");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getWarMapItemsForTask("t1");

    expect(result).toEqual([]);
  });
});

// ── getAllWarMapItems ─────────────────────────────────────────────────────────

describe("getAllWarMapItems", () => {
  it("returns active warmap items with categories", async () => {
    const mockData = [
      { id: "i1", title: "Goal", status: "active", category: { id: "c1", name: "Health" } },
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getAllWarMapItems("u1");

    expect(result).toHaveLength(1);
    expect(result[0].category.name).toBe("Health");
  });

  it("filters by status=active", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getAllWarMapItems("u1");

    expect(chain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getAllWarMapItems("u1");

    expect(result).toEqual([]);
  });
});
