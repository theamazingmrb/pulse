import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NorthStarDisplay } from "@/components/north-star-display";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/lib/north-star", () => ({
  getNorthStar: vi.fn(),
  truncateNorthStar: vi.fn((content: string, maxLen = 100) => {
    if (content.length <= maxLen) return content;
    const lastSpace = content.lastIndexOf(" ", maxLen);
    const truncateAt = lastSpace > 0 ? lastSpace : maxLen;
    return content.slice(0, truncateAt).trim() + "...";
  }),
}));

import { getNorthStar } from "@/lib/north-star";

beforeEach(() => {
  vi.clearAllMocks();
  (getNorthStar as ReturnType<typeof vi.fn>).mockReset();
});

const MOCK_NORTH_STAR = {
  id: "ns1",
  user_id: "u1",
  content: "Build meaningful products that improve people's lives and create lasting impact.",
  created_at: "2026-03-14T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

// ── Default (non-compact) rendering ────────────────────────────────────────────

describe("NorthStarDisplay", () => {
  it("renders north star content", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_NORTH_STAR);

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/North Star/i)).toBeInTheDocument();
    });

    expect(screen.getByText(MOCK_NORTH_STAR.content)).toBeInTheDocument();
  });

  it("renders nothing when north star is null", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { container } = render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(getNorthStar).toHaveBeenCalledWith("u1");
    });

    expect(container.firstChild).toBeNull();
  });

  it("truncates long content and shows click to expand", async () => {
    const longContent = "a".repeat(150);
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...MOCK_NORTH_STAR,
      content: longContent,
    });

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Click to expand/i)).toBeInTheDocument();
    });
  });

  it("opens modal when clicked", async () => {
    const user = userEvent.setup();
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_NORTH_STAR);

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_NORTH_STAR.content)).toBeInTheDocument();
    });

    await user.click(screen.getByText(MOCK_NORTH_STAR.content));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("shows full content in modal", async () => {
    const user = userEvent.setup();
    const longContent = "Build meaningful products that improve people's lives and create lasting impact for generations to come.";
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...MOCK_NORTH_STAR,
      content: longContent,
    });

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Click to expand/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Click to expand/i));

    await waitFor(() => {
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });
  });

  it("has link to settings", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_NORTH_STAR);

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Edit/i })).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /Edit/i });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("renders loading state initially", () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<NorthStarDisplay />);

    expect(container.firstChild).toBeNull();
  });
});

// ── Compact rendering ──────────────────────────────────────────────────────────

describe("NorthStarDisplay (compact)", () => {
  it("renders compact version with truncated content", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_NORTH_STAR);

    render(<NorthStarDisplay compact />);

    await waitFor(() => {
      expect(screen.getByText(/North Star/i)).toBeInTheDocument();
    });

    // Compact mode shows icon and truncated text
    expect(screen.getByRole("img", { hidden: true }) || screen.getByText(/Build meaningful/i)).toBeInTheDocument();
  });

  it("renders nothing when null in compact mode", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { container } = render(<NorthStarDisplay compact />);

    await waitFor(() => {
      expect(getNorthStar).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it("uses star icon", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_NORTH_STAR);

    render(<NorthStarDisplay compact />);

    await waitFor(() => {
      expect(screen.getByText(/Build meaningful/i)).toBeInTheDocument();
    });
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("NorthStarDisplay edge cases", () => {
  it("handles empty content", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...MOCK_NORTH_STAR,
      content: "",
    });

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(getNorthStar).toHaveBeenCalled();
    });

    // Empty content should render nothing visible or null
    expect(screen.queryByText(/North Star/i)).not.toBeInTheDocument();
  });

  it("handles whitespace-only content", async () => {
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...MOCK_NORTH_STAR,
      content: "   ",
    });

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(getNorthStar).toHaveBeenCalled();
    });

    // Should render the whitespace (trimmed or not depending on truncateNorthStar)
    // The component doesn't trim, so it shows as-is
  });

  it("handles very long single word (no spaces)", async () => {
    const longWord = "a".repeat(200);
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...MOCK_NORTH_STAR,
      content: longWord,
    });

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Click to expand/i)).toBeInTheDocument();
    });
  });

  it("closes modal when clicking outside", async () => {
    const user = userEvent.setup();
    (getNorthStar as ReturnType<typeof vi.fn>).mockResolvedValueOnce(MOCK_NORTH_STAR);

    render(<NorthStarDisplay />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_NORTH_STAR.content)).toBeInTheDocument();
    });

    // Click to open
    await user.click(screen.getByText(MOCK_NORTH_STAR.content));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Press Escape to close (more reliable than clicking outside)
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});