import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/north-star/route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock("@/lib/north-star", () => ({
  getNorthStar: vi.fn(),
  upsertNorthStar: vi.fn(),
  deleteNorthStar: vi.fn(),
}));

import { supabase } from "@/lib/supabase";
import {
  getNorthStar,
  upsertNorthStar,
  deleteNorthStar,
} from "@/lib/north-star";

const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>;
const mockGetNorthStar = getNorthStar as ReturnType<typeof vi.fn>;
const mockUpsertNorthStar = upsertNorthStar as ReturnType<typeof vi.fn>;
const mockDeleteNorthStar = deleteNorthStar as ReturnType<typeof vi.fn>;

const MOCK_USER = { id: "u1", email: "test@example.com" };
const MOCK_NORTH_STAR = {
  id: "ns1",
  user_id: "u1",
  content: "Build meaningful products",
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

function createRequest(options: {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
}): NextRequest {
  const { method, body, headers = {} } = options;

  const req = {
    method,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] || null,
    },
    json: async () => body,
    url: "http://localhost/api/north-star",
  } as unknown as NextRequest;

  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/north-star", () => {
  it("returns north star when authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetNorthStar.mockResolvedValueOnce(MOCK_NORTH_STAR);

    const req = createRequest({
      method: "GET",
      headers: { authorization: "Bearer token123" },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.northStar).toEqual(MOCK_NORTH_STAR);
    expect(mockGetNorthStar).toHaveBeenCalledWith("u1");
  });

  it("returns null north star when none exists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockGetNorthStar.mockResolvedValueOnce(null);

    const req = createRequest({
      method: "GET",
      headers: { authorization: "Bearer token123" },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.northStar).toBeNull();
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "GET",
      headers: {},
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when auth header doesn't start with Bearer", async () => {
    const req = createRequest({
      method: "GET",
      headers: { authorization: "Basic token123" },
    });

    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("returns 401 when auth error", async () => {
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

  it("returns 500 on unexpected error", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Database error"));

    const req = createRequest({
      method: "GET",
      headers: { authorization: "Bearer token" },
    });

    const response = await GET(req);

    expect(response.status).toBe(500);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/north-star", () => {
  it("creates north star with valid content", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockUpsertNorthStar.mockResolvedValueOnce({
      success: true,
      data: MOCK_NORTH_STAR,
    });

    const req = createRequest({
      method: "POST",
      body: { content: "Build meaningful products" },
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.northStar).toEqual(MOCK_NORTH_STAR);
  });

  it("returns 400 when content is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

    const req = createRequest({
      method: "POST",
      body: {},
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Content is required");
  });

  it("returns 400 when content is not a string", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

    const req = createRequest({
      method: "POST",
      body: { content: 123 },
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when upsertNorthStar fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockUpsertNorthStar.mockResolvedValueOnce({
      success: false,
      error: "Content cannot be empty",
    });

    const req = createRequest({
      method: "POST",
      body: { content: "" },
      headers: { authorization: "Bearer token123" },
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "POST",
      body: { content: "Test" },
      headers: {},
    });

    const response = await POST(req);

    expect(response.status).toBe(401);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/north-star", () => {
  it("deletes north star successfully", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockDeleteNorthStar.mockResolvedValueOnce({ success: true });

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token123" },
    });

    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteNorthStar).toHaveBeenCalledWith("u1");
  });

  it("returns 400 when delete fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
    mockDeleteNorthStar.mockResolvedValueOnce({
      success: false,
      error: "Failed to delete",
    });

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token123" },
    });

    const response = await DELETE(req);

    expect(response.status).toBe(400);
  });

  it("returns 401 when no auth header", async () => {
    const req = createRequest({
      method: "DELETE",
      headers: {},
    });

    const response = await DELETE(req);

    expect(response.status).toBe(401);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Unexpected error"));

    const req = createRequest({
      method: "DELETE",
      headers: { authorization: "Bearer token" },
    });

    const response = await DELETE(req);

    expect(response.status).toBe(500);
  });
});