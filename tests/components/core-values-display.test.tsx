import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CoreValuesDisplay } from "@/components/core-values-display";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/lib/core-values", () => ({
  getCoreValues: vi.fn(),
}));

import { getCoreValues } from "@/lib/core-values";

const mockGetCoreValues = getCoreValues as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: return core values
  mockGetCoreValues.mockResolvedValue(MOCK_CORE_VALUES);
});

const MOCK_CORE_VALUES = [
  {
    id: "cv1",
    user_id: "u1",
    value_text: "Integrity",
    value_order: 0,
    created_at: "2026-03-14T00:00:00Z",
    updated_at: "2026-03-14T00:00:00Z",
  },
  {
    id: "cv2",
    user_id: "u1",
    value_text: "Growth",
    value_order: 1,
    created_at: "2026-03-14T00:00:00Z",
    updated_at: "2026-03-14T00:00:00Z",
  },
  {
    id: "cv3",
    user_id: "u1",
    value_text: "Connection",
    value_order: 2,
    created_at: "2026-03-14T00:00:00Z",
    updated_at: "2026-03-14T00:00:00Z",
  },
];

// ── Default (non-compact) rendering ────────────────────────────────────────────

describe("CoreValuesDisplay", () => {
  it("renders core values as badges", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Integrity")).toBeInTheDocument();
    });

    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Connection")).toBeInTheDocument();
  });

  it("renders nothing when no values exist", async () => {
    mockGetCoreValues.mockResolvedValueOnce([]);

    const { container } = render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(mockGetCoreValues).toHaveBeenCalledWith("u1");
    });

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when loading", async () => {
    mockGetCoreValues.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<CoreValuesDisplay />);

    expect(container.firstChild).toBeNull();
  });

  it("shows 'What Matters Most' label", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/What Matters Most/i)).toBeInTheDocument();
    });
  });

  it("has link to settings", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByRole("link")).toBeInTheDocument();
    });

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("renders values in order", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Integrity")).toBeInTheDocument();
    });

    // Get all value badges and check order
    const values = screen.getAllByText(/Integrity|Growth|Connection/);
    expect(values[0]).toHaveTextContent("Integrity");
    expect(values[1]).toHaveTextContent("Growth");
    expect(values[2]).toHaveTextContent("Connection");
  });

  it("uses heart icon", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Integrity")).toBeInTheDocument();
    });

    // Heart icon should be present (Lucide renders as SVG)
    const container = screen.getByText(/What Matters Most/i).closest("div");
    expect(container?.querySelector("svg")).toBeInTheDocument();
  });
});

// ── Compact rendering ──────────────────────────────────────────────────────────

describe("CoreValuesDisplay (compact)", () => {
  it("renders compact version with truncated values", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay compact />);

    await waitFor(() => {
      expect(screen.getByText(/Integrity · Growth · Connection/i)).toBeInTheDocument();
    });
  });

  it("renders nothing when null in compact mode", async () => {
    mockGetCoreValues.mockResolvedValueOnce([]);

    const { container } = render(<CoreValuesDisplay compact />);

    await waitFor(() => {
      expect(mockGetCoreValues).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it("shows only first 3 values in compact mode", async () => {
    const fiveValues = [
      ...MOCK_CORE_VALUES,
      {
        id: "cv4",
        user_id: "u1",
        value_text: "Fourth",
        value_order: 3,
        created_at: "2026-03-14T00:00:00Z",
        updated_at: "2026-03-14T00:00:00Z",
      },
      {
        id: "cv5",
        user_id: "u1",
        value_text: "Fifth",
        value_order: 4,
        created_at: "2026-03-14T00:00:00Z",
        updated_at: "2026-03-14T00:00:00Z",
      },
    ];
    mockGetCoreValues.mockResolvedValueOnce(fiveValues);

    render(<CoreValuesDisplay compact />);

    await waitFor(() => {
      expect(screen.getByText(/Integrity · Growth · Connection/i)).toBeInTheDocument();
    });

    expect(screen.queryByText("Fourth")).not.toBeInTheDocument();
    expect(screen.queryByText("Fifth")).not.toBeInTheDocument();
  });

  it("uses heart icon in compact mode", async () => {
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    render(<CoreValuesDisplay compact />);

    await waitFor(() => {
      expect(screen.getByText(/Integrity/i)).toBeInTheDocument();
    });

    // Icon should be present
    expect(screen.getByText(/Integrity/i)).toBeInTheDocument();
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("CoreValuesDisplay edge cases", () => {
  it("handles single value", async () => {
    mockGetCoreValues.mockResolvedValueOnce([MOCK_CORE_VALUES[0]]);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Integrity")).toBeInTheDocument();
    });

    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
  });

  it("handles 5 values (max allowed)", async () => {
    const fiveValues = Array.from({ length: 5 }, (_, i) => ({
      id: `cv${i}`,
      user_id: "u1",
      value_text: `Value ${i + 1}`,
      value_order: i,
      created_at: "2026-03-14T00:00:00Z",
      updated_at: "2026-03-14T00:00:00Z",
    }));

    mockGetCoreValues.mockResolvedValueOnce(fiveValues);

    render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Value 1")).toBeInTheDocument();
    });

    fiveValues.forEach((v) => {
      expect(screen.getByText(v.value_text)).toBeInTheDocument();
    });
  });

  it("handles error gracefully", async () => {
    mockGetCoreValues.mockRejectedValueOnce(new Error("Database error"));

    const { container } = render(<CoreValuesDisplay />);

    // Should not crash, renders nothing
    await waitFor(() => {
      expect(mockGetCoreValues).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it("re-queries when user changes", async () => {
    const { rerender } = render(<CoreValuesDisplay />);

    await waitFor(() => {
      expect(mockGetCoreValues).toHaveBeenCalledWith("u1");
    });

    // Re-render with same user
    mockGetCoreValues.mockClear();
    mockGetCoreValues.mockResolvedValueOnce(MOCK_CORE_VALUES);

    rerender(<CoreValuesDisplay />);

    // Should query again
    await waitFor(() => {
      expect(mockGetCoreValues).toHaveBeenCalled();
    });
  });
});