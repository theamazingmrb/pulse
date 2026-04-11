import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "@/app/api/core-values/route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock("@/lib/core-values", () => ({
  getCoreValues: vi.fn(),
  addCoreValue: vi.fn(),
  updateCoreValue: vi.fn(),
  deleteCoreValue: vi.fn(),
  reorderCoreValues: vi.fn(),
}));

import { supabase } from "@/lib/supabase";
import {
  getCoreValues,
  addCoreValue,
  updateCoreValue,
  deleteCoreValue,
  reorderCoreValues,
} from "@/lib/core-values";

const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>;
const mockGetCoreValues = getCoreValues as ReturnType<typeof vi.fn>;
const mockAddCoreValue = addCoreValue as ReturnType<typeof vi.fn>;
const mockUpdateCoreValue = updateCoreValue as ReturnType<typeof vi.fn>;
const mockDeleteCoreValue = deleteCoreValue as ReturnType<typeof vi.fn>;
const mockReorderCoreValues = reorderCoreValues as ReturnType<typeof vi.fn>;

const MOCK_USER = { id: "u1", email: "test@example.com" };
const MOCK_CORE_VALUE = {
  id: "cv1",
  user_id: "u1",
  value_text: "Integrity",
  value_order: 0,
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

function createRequest(options: {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  url?: string;
}): NextRequest {
  const { method, body, headers = {}, url } = options;

  const req = {
    method,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] || null,
    },
    json: async () => body,
    url: url || "http://localhost/api/core-values",
  } as unknown as NextRequest;

  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/core-values", () => {
  it("returns core values when authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetCoreValues.mockResolvedValueOnce([MOCK_CORE_VALUE]);

    const req = createRequest({
      method: "GET",
      headers: { authorization: "Bearer token123" },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.values).toHaveLength(1);
    expect(mockGetCoreValues).toHaveBeenCalledWith("u1");
  });

  it("returns empty array when no values exist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetCoreValues.mockResolvedValueOnce([]);

    const req = createRequest({
      method: "GET",
      headers: { authorization: "Bearer token123" },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.values).toEqual([]);
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "GET",
      headers: {},
    });

    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("returns 401 when invalid token", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const req = createRequest({
      method: "GET",
      headers: { authorization: "Bearer invalid" },
    });

    const response = await GET(req);

    expect(response.status).toBe(401);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/core-values", () => {
  it("adds a new core value", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetCoreValues.mockResolvedValueOnce([MOCK_CORE_VALUE]);
    mockAddCoreValue.mockResolvedValueOnce({
      success: true,
      data: [MOCK_CORE_VALUE],
    });

    const req = createRequest({
      method: "POST",
      body: { valueText: "Integrity" },
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.values).toEqual([MOCK_CORE_VALUE]);
  });

  it("uses existingCount from request if provided", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockAddCoreValue.mockResolvedValueOnce({
      success: true,
      data: [MOCK_CORE_VALUE],
    });

    const req = createRequest({
      method: "POST",
      body: { valueText: "Integrity", existingCount: 3 },
      headers: { authorization: "Bearer token123" },
    });

    await POST(req);

    expect(mockAddCoreValue).toHaveBeenCalledWith("u1", "Integrity", 3);
  });

  it("fetches existing count if not provided", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetCoreValues.mockResolvedValueOnce([MOCK_CORE_VALUE]);
    mockAddCoreValue.mockResolvedValueOnce({
      success: true,
      data: [MOCK_CORE_VALUE],
    });

    const req = createRequest({
      method: "POST",
      body: { valueText: "Growth" },
      headers: { authorization: "Bearer token123" },
    });

    await POST(req);

    expect(mockGetCoreValues).toHaveBeenCalledWith("u1");
    expect(mockAddCoreValue).toHaveBeenCalledWith("u1", "Growth", 1);
  });

  it("returns 400 when valueText is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

    const req = createRequest({
      method: "POST",
      body: {},
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when addCoreValue fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetCoreValues.mockResolvedValueOnce([]);
    mockAddCoreValue.mockResolvedValueOnce({
      success: false,
      error: "Maximum 5 values allowed",
    });

    const req = createRequest({
      method: "POST",
      body: { valueText: "Test" },
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "POST",
      body: { valueText: "Test" },
      headers: {},
    });

    const response = await POST(req);

    expect(response.status).toBe(401);
  });
});

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/core-values", () => {
  it("updates a core value", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockUpdateCoreValue.mockResolvedValueOnce({
      success: true,
      data: [{ ...MOCK_CORE_VALUE, value_text: "Honesty" }],
    });

    const req = createRequest({
      method: "PATCH",
      body: { valueId: "cv1", valueText: "Honesty" },
      headers: { authorization: "Bearer token123" },
    });

    const response = await PATCH(req);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateCoreValue).toHaveBeenCalledWith("u1", "cv1", "Honesty");
  });

  it("reorders core values", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockReorderCoreValues.mockResolvedValueOnce({
      success: true,
      data: [MOCK_CORE_VALUE],
    });

    const req = createRequest({
      method: "PATCH",
      body: { orderedIds: ["cv2", "cv1"] },
      headers: { authorization: "Bearer token123" },
    });

    const response = await PATCH(req);

    expect(response.status).toBe(200);
    expect(mockReorderCoreValues).toHaveBeenCalledWith("u1", ["cv2", "cv1"]);
  });

  it("returns 400 for invalid request body", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

    const req = createRequest({
      method: "PATCH",
      body: {},
      headers: { authorization: "Bearer token123" },
    });

    const response = await PATCH(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when updateCoreValue fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockUpdateCoreValue.mockResolvedValueOnce({
      success: false,
      error: "Value cannot be empty",
    });

    const req = createRequest({
      method: "PATCH",
      body: { valueId: "cv1", valueText: "" },
      headers: { authorization: "Bearer token123" },
    });

    const response = await PATCH(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when reorderCoreValues fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockReorderCoreValues.mockResolvedValueOnce({
      success: false,
      error: "Failed to reorder",
    });

    const req = createRequest({
      method: "PATCH",
      body: { orderedIds: ["cv1"] },
      headers: { authorization: "Bearer token123" },
    });

    const response = await PATCH(req);

    expect(response.status).toBe(400);
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "PATCH",
      body: { valueId: "cv1", valueText: "Test" },
      headers: {},
    });

    const response = await PATCH(req);

    expect(response.status).toBe(401);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/core-values", () => {
  it("deletes a core value", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockDeleteCoreValue.mockResolvedValueOnce({ success: true });

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token123" },
      url: "http://localhost/api/core-values?id=cv1",
    });

    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteCoreValue).toHaveBeenCalledWith("u1", "cv1");
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token123" },
      url: "http://localhost/api/core-values",
    });

    const response = await DELETE(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when deleteCoreValue fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockDeleteCoreValue.mockResolvedValueOnce({
      success: false,
      error: "Failed to delete",
    });

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token123" },
      url: "http://localhost/api/core-values?id=cv1",
    });

    const response = await DELETE(req);

    expect(response.status).toBe(400);
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "DELETE",
      headers: {},
      url: "http://localhost/api/core-values?id=cv1",
    });

    const response = await DELETE(req);

    expect(response.status).toBe(401);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Unexpected error"));

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token" },
      url: "http://localhost/api/core-values?id=cv1",
    });

    const response = await DELETE(req);

    expect(response.status).toBe(500);
  });
});