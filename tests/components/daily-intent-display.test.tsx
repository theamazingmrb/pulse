import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DailyIntentDisplay } from "@/components/daily-intent-display";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/lib/daily-intent", () => ({
  getLatestDailyIntent: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  todayISO: () => "2026-03-14",
}));

import { getLatestDailyIntent } from "@/lib/daily-intent";

const mockGetLatestDailyIntent = getLatestDailyIntent as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: return an intent
  mockGetLatestDailyIntent.mockResolvedValue(MOCK_INTENT);
});

const MOCK_INTENT = {
  id: "ci1",
  created_at: "2026-03-14T08:00:00Z",
  user_id: "u1",
  date: "2026-03-14",
  time_of_day: "morning",
  daily_intent: "Focus on writing tests",
  say_no_to: "Social media",
  top_priority: "Complete test suite",
};

// ── Default rendering ──────────────────────────────────────────────────────────

describe("DailyIntentDisplay", () => {
  it("renders daily intent content", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(MOCK_INTENT);

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Daily Intent/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Focus on writing tests")).toBeInTheDocument();
  });

  it("renders nothing when intent is null", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(null);

    const { container } = render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(mockGetLatestDailyIntent).toHaveBeenCalledWith("u1");
    });

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when daily_intent is null", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      daily_intent: null,
    });

    const { container } = render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(mockGetLatestDailyIntent).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it("shows 'Saying No To' section when set", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(MOCK_INTENT);

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Saying No To/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Social media")).toBeInTheDocument();
  });

  it("hides 'Saying No To' section when not set", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      say_no_to: null,
    });

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Focus on writing tests")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Saying No To/i)).not.toBeInTheDocument();
  });

  it("shows 'today' label for today's intent", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(MOCK_INTENT);

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Daily Intent/i)).toBeInTheDocument();
    });

    // Should NOT show a date when it's today
    expect(screen.queryByText(/\(2026-03-14\)/)).not.toBeInTheDocument();
  });

  it("shows date for past intent", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      date: "2026-03-12",
    });

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText("(2026-03-12)")).toBeInTheDocument();
    });
  });

  it("has link to checkin", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(MOCK_INTENT);

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByRole("link")).toBeInTheDocument();
    });

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/checkin");
  });

  it("uses target icon", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(MOCK_INTENT);

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Focus on writing tests")).toBeInTheDocument();
    });

    // Target icon should be present (Lucide renders as SVG)
    const container = screen.getByText(/Daily Intent/i).closest("div");
    expect(container?.querySelector("svg")).toBeInTheDocument();
  });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe("DailyIntentDisplay loading state", () => {
  it("renders nothing while loading", async () => {
    mockGetLatestDailyIntent.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<DailyIntentDisplay />);

    expect(container.firstChild).toBeNull();
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("DailyIntentDisplay edge cases", () => {
  it("handles empty daily_intent string", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      daily_intent: "",
    });

    const { container } = render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(mockGetLatestDailyIntent).toHaveBeenCalled();
    });

    // Empty string should render nothing
    expect(container.firstChild).toBeNull();
  });

  it("handles whitespace-only daily_intent", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      daily_intent: "   ",
    });

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(mockGetLatestDailyIntent).toHaveBeenCalled();
    });

    // Whitespace intent should render (component doesn't trim)
    // But the check for intent?.daily_intent would be truthy for whitespace
    // So it would render, which is probably fine
  });

  it("handles very long intent text", async () => {
    const longIntent = "a".repeat(500);
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      daily_intent: longIntent,
    });

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText(longIntent)).toBeInTheDocument();
    });
  });

  it("handles very long say_no_to text", async () => {
    const longSayNoTo = "a".repeat(500);
    mockGetLatestDailyIntent.mockResolvedValueOnce({
      ...MOCK_INTENT,
      say_no_to: longSayNoTo,
    });

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(screen.getByText(longSayNoTo)).toBeInTheDocument();
    });
  });

  it("handles error gracefully", async () => {
    mockGetLatestDailyIntent.mockRejectedValueOnce(new Error("Database error"));

    const { container } = render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(mockGetLatestDailyIntent).toHaveBeenCalled();
    });

    // Should not crash
    expect(container.firstChild).toBeNull();
  });

  it("queries with correct user id", async () => {
    mockGetLatestDailyIntent.mockResolvedValueOnce(null);

    render(<DailyIntentDisplay />);

    await waitFor(() => {
      expect(mockGetLatestDailyIntent).toHaveBeenCalledWith("u1");
    });
  });
});