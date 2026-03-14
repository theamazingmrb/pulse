import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReflectionReminderBanner from "@/components/reflection-reminder-banner";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUser = { id: "u1" };
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockGetPendingReminder = vi.fn();
vi.mock("@/lib/reflections", () => ({
  getPendingReminder: (...args: unknown[]) => mockGetPendingReminder(...args),
}));

// ── sessionStorage ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ReflectionReminderBanner", () => {
  it("renders nothing when no pending reminder", async () => {
    mockGetPendingReminder.mockResolvedValue(null);

    const { container } = render(<ReflectionReminderBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders banner when there is a pending daily reminder", async () => {
    mockGetPendingReminder.mockResolvedValue({
      type: "daily",
      periodStart: "2026-03-13",
      message: "Have you reflected on yesterday?",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Have you reflected on yesterday/)).toBeInTheDocument();
    });
  });

  it("renders banner with weekly reminder message", async () => {
    mockGetPendingReminder.mockResolvedValue({
      type: "weekly",
      periodStart: "2026-03-09",
      message: "New week, new start — complete last week's reflection.",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => {
      expect(screen.getByText(/New week, new start/)).toBeInTheDocument();
    });
  });

  it("renders banner with monthly reminder message", async () => {
    mockGetPendingReminder.mockResolvedValue({
      type: "monthly",
      periodStart: "2026-02-01",
      message: "It's a new month — time for your monthly self-reflection.",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => {
      expect(screen.getByText(/new month/)).toBeInTheDocument();
    });
  });

  it("shows 'Reflect Now' button", async () => {
    mockGetPendingReminder.mockResolvedValue({
      type: "daily",
      periodStart: "2026-03-13",
      message: "Have you reflected on yesterday?",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reflect Now/i })).toBeInTheDocument();
    });
  });

  it("navigates to reflection page when 'Reflect Now' clicked", async () => {
    const user = userEvent.setup();
    mockGetPendingReminder.mockResolvedValue({
      type: "daily",
      periodStart: "2026-03-13",
      message: "Have you reflected on yesterday?",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Reflect Now/i }));
    await user.click(screen.getByRole("button", { name: /Reflect Now/i }));

    expect(mockPush).toHaveBeenCalledWith("/reflections/new?type=daily");
  });

  it("navigates to correct type for weekly reminder", async () => {
    const user = userEvent.setup();
    mockGetPendingReminder.mockResolvedValue({
      type: "weekly",
      periodStart: "2026-03-09",
      message: "New week, new start",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Reflect Now/i }));
    await user.click(screen.getByRole("button", { name: /Reflect Now/i }));

    expect(mockPush).toHaveBeenCalledWith("/reflections/new?type=weekly");
  });

  it("dismisses banner when X button clicked", async () => {
    const user = userEvent.setup();
    mockGetPendingReminder.mockResolvedValue({
      type: "daily",
      periodStart: "2026-03-13",
      message: "Have you reflected on yesterday?",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Dismiss/i }));
    await user.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(screen.queryByText(/Have you reflected/)).not.toBeInTheDocument();
  });

  it("stores dismissal key in sessionStorage on dismiss", async () => {
    const user = userEvent.setup();
    mockGetPendingReminder.mockResolvedValue({
      type: "daily",
      periodStart: "2026-03-13",
      message: "Have you reflected on yesterday?",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Dismiss/i }));
    await user.click(screen.getByRole("button", { name: /Dismiss/i }));

    const key = `reflection_reminder_dismissed_daily_2026-03-13_u1`;
    expect(sessionStorage.getItem(key)).toBe("true");
  });

  it("does not show banner when already dismissed in this session", async () => {
    // Pre-set the dismissal key
    const key = `reflection_reminder_dismissed_daily_2026-03-13_u1`;
    sessionStorage.setItem(key, "true");

    mockGetPendingReminder.mockResolvedValue({
      type: "daily",
      periodStart: "2026-03-13",
      message: "Have you reflected on yesterday?",
      isEvening: false,
    });

    const { container } = render(<ReflectionReminderBanner />);

    await waitFor(() => {
      // After checking dismissal, should stay hidden
      expect(container.firstChild).toBeNull();
    });
  });

  it("dismisses banner when 'Reflect Now' is clicked (also stores key)", async () => {
    const user = userEvent.setup();
    mockGetPendingReminder.mockResolvedValue({
      type: "monthly",
      periodStart: "2026-02-01",
      message: "It's a new month",
      isEvening: false,
    });

    render(<ReflectionReminderBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Reflect Now/i }));
    await user.click(screen.getByRole("button", { name: /Reflect Now/i }));

    const key = `reflection_reminder_dismissed_monthly_2026-02-01_u1`;
    expect(sessionStorage.getItem(key)).toBe("true");
    expect(screen.queryByText(/new month/)).not.toBeInTheDocument();
  });
});
