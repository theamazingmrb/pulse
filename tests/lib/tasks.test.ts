import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  lockTask,
  unlockTask,
  updateTaskPriority,
  getTasksByStatus,
  getTasksByPriority,
  getScheduledTasksForDay,
} from "@/lib/tasks";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

// Mock SchedulingService to avoid actual scheduling logic in task tests
vi.mock("@/lib/scheduling", () => ({
  SchedulingService: {
    autoScheduleTask: vi.fn().mockResolvedValue(null),
  },
  PRIORITY_CONFIG: {
    1: { label: "Hot", color: "#EF4444", description: "Urgent" },
    2: { label: "Warm", color: "#F59E0B", description: "Important" },
    3: { label: "Cool", color: "#3B82F6", description: "Can wait" },
    4: { label: "Cold", color: "#6B7280", description: "Backlog" },
  },
}));

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolvedValue: unknown) {
  const obj: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(resolvedValue);
  ["select", "insert", "update", "delete", "eq", "gte", "lte", "order"].forEach((m) => {
    obj[m] = vi.fn(() => obj);
  });
  obj.single = terminal;
  obj.maybeSingle = terminal;
  return obj;
}

const MOCK_TASK = {
  id: "t1",
  user_id: "u1",
  title: "Test Task",
  description: null,
  status: "active",
  project_id: null,
  projects: null,
  notes: null,
  due_date: null,
  image_url: null,
  priority_level: 2,
  scheduling_mode: "manual",
  estimated_duration: 30,
  start_time: null,
  end_time: null,
  locked: false,
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

// ── getTasks ──────────────────────────────────────────────────────────────────

describe("getTasks", () => {
  it("returns tasks mapped with project field", async () => {
    const mockData = [
      { ...MOCK_TASK, projects: { id: "p1", name: "Project A", color: "#fff", status: "active" } },
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    // Second order call resolves
    let orderCallCount = 0;
    chain.order = vi.fn().mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount >= 2) return Promise.resolve({ data: mockData, error: null });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTasks("u1");

    expect(result[0].project?.name).toBe("Project A");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    let orderCallCount = 0;
    chain.order = vi.fn().mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount >= 2) return Promise.resolve({ data: null, error: { message: "fail" } });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTasks("u1");

    expect(result).toEqual([]);
  });
});

// ── getTask ───────────────────────────────────────────────────────────────────

describe("getTask", () => {
  it("returns task with project field", async () => {
    const mockData = { ...MOCK_TASK, projects: null };
    const chain = makeChain({ data: mockData, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTask("t1");

    expect(result?.id).toBe("t1");
    expect(result?.project).toBeNull();
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTask("nonexistent");

    expect(result).toBeNull();
  });
});

// ── createTask ────────────────────────────────────────────────────────────────

describe("createTask", () => {
  it("creates task and returns it", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createTask({
      user_id: "u1",
      title: "Test Task",
      description: null,
      status: "active",
      project_id: null,
      notes: null,
      due_date: null,
      image_url: null,
      priority_level: 2,
      scheduling_mode: "manual",
      estimated_duration: 30,
      start_time: null,
      end_time: null,
      locked: false,
    });

    expect(result?.title).toBe("Test Task");
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await createTask({
      user_id: "u1",
      title: "Test",
      description: null,
      status: "active",
      project_id: null,
      notes: null,
      due_date: null,
      image_url: null,
      priority_level: 1,
      scheduling_mode: "manual",
      estimated_duration: 30,
      start_time: null,
      end_time: null,
      locked: false,
    });

    expect(result).toBeNull();
  });

  it("applies default values for optional fields", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    // Pass minimal task — status/priority_level/etc should default
    await createTask({
      user_id: "u1",
      title: "Minimal",
      description: null,
      status: "active",
      project_id: null,
      notes: null,
      due_date: null,
      image_url: null,
      priority_level: 1,
      scheduling_mode: "manual",
      estimated_duration: 30,
      start_time: null,
      end_time: null,
      locked: false,
    });

    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        status: "active",
        priority_level: 1,
        scheduling_mode: "manual",
        estimated_duration: 30,
        locked: false,
      }),
    ]);
  });
});

// ── updateTask ────────────────────────────────────────────────────────────────

describe("updateTask", () => {
  it("updates task and returns it", async () => {
    const updated = { ...MOCK_TASK, title: "Updated", projects: null };
    const chain = makeChain({ data: updated, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateTask("t1", { title: "Updated" });

    expect(result?.title).toBe("Updated");
  });

  it("strips nested project object from updates", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    await updateTask("t1", {
      title: "New title",
      project: { id: "p1", name: "P", color: "#fff", status: "active", created_at: "", updated_at: "", user_id: "u1", description: null, image_url: null, banner_url: null },
    });

    // The update chain should NOT include the project key
    expect(chain.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ project: expect.anything() })
    );
  });

  it("returns null on error", async () => {
    const chain = makeChain({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValueOnce(chain);

    const result = await updateTask("t1", { title: "x" });

    expect(result).toBeNull();
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("returns true on success", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteTask("t1");

    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await deleteTask("t1");

    expect(result).toBe(false);
  });
});

// ── Convenience wrappers ──────────────────────────────────────────────────────

describe("completeTask / uncompleteTask", () => {
  it("completeTask sets status to done", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, status: "done", projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await completeTask("t1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "done" }));
    expect(result?.status).toBe("done");
  });

  it("uncompleteTask sets status to active", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, status: "active", projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await uncompleteTask("t1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
    expect(result?.status).toBe("active");
  });
});

describe("lockTask / unlockTask", () => {
  it("lockTask sets locked to true", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, locked: true, projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    await lockTask("t1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ locked: true }));
  });

  it("unlockTask sets locked to false", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, locked: false, projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    await unlockTask("t1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ locked: false }));
  });
});

describe("updateTaskPriority", () => {
  it("sets priority_level", async () => {
    const chain = makeChain({ data: { ...MOCK_TASK, priority_level: 1, projects: null }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    await updateTaskPriority("t1", 1);

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ priority_level: 1 }));
  });
});

// ── getTasksByStatus ──────────────────────────────────────────────────────────

describe("getTasksByStatus", () => {
  it("returns tasks filtered by status", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    let orderCount = 0;
    chain.order = vi.fn().mockImplementation(() => {
      orderCount++;
      if (orderCount >= 2) return Promise.resolve({ data: [MOCK_TASK], error: null });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTasksByStatus("u1", "done");

    expect(chain.eq).toHaveBeenCalledWith("status", "done");
    expect(result).toHaveLength(1);
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    let orderCount = 0;
    chain.order = vi.fn().mockImplementation(() => {
      orderCount++;
      if (orderCount >= 2) return Promise.resolve({ data: null, error: { message: "fail" } });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    const result = await getTasksByStatus("u1", "done");

    expect(result).toEqual([]);
  });
});

// ── getTasksByPriority ────────────────────────────────────────────────────────

describe("getTasksByPriority", () => {
  it("queries with correct priority_level", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    await getTasksByPriority("u1", 1);

    expect(chain.eq).toHaveBeenCalledWith("priority_level", 1);
  });
});

// ── getScheduledTasksForDay ───────────────────────────────────────────────────

describe("getScheduledTasksForDay", () => {
  it("queries with start/end of the given day", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const testDate = new Date(2026, 2, 14);
    await getScheduledTasksForDay("u1", testDate);

    expect(chain.gte).toHaveBeenCalled();
    expect(chain.lte).toHaveBeenCalled();
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    mockFrom.mockReturnValueOnce(chain);

    const result = await getScheduledTasksForDay("u1", new Date());

    expect(result).toEqual([]);
  });
});
