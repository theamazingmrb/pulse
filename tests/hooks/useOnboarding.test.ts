import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOnboarding } from "@/hooks/useOnboarding";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/onboarding", () => ({
  getUserOnboarding: vi.fn(),
  createUserOnboarding: vi.fn(),
  updateOnboardingProgress: vi.fn(),
  skipOnboarding: vi.fn(),
  getNextOnboardingStep: vi.fn(),
  getOnboardingProgress: vi.fn(),
  ONBOARDING_STEPS: ["welcome", "projects", "tasks", "journal", "playlist", "complete"],
}));

import { useAuth } from "@/lib/auth-context";
import {
  getUserOnboarding,
  createUserOnboarding,
  skipOnboarding,
  getNextOnboardingStep,
  getOnboardingProgress,
} from "@/lib/onboarding";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockGetUserOnboarding = getUserOnboarding as ReturnType<typeof vi.fn>;
const mockCreateUserOnboarding = createUserOnboarding as ReturnType<typeof vi.fn>;
const mockSkipOnboarding = skipOnboarding as ReturnType<typeof vi.fn>;
const mockGetNextOnboardingStep = getNextOnboardingStep as ReturnType<typeof vi.fn>;
const mockGetOnboardingProgress = getOnboardingProgress as ReturnType<typeof vi.fn>;

const MOCK_USER = { id: "user-123" };

const INCOMPLETE_ONBOARDING = {
  id: "o1",
  user_id: "user-123",
  completed_steps: [],
  is_completed: false,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

const COMPLETE_ONBOARDING = {
  ...INCOMPLETE_ONBOARDING,
  completed_steps: ["welcome", "projects", "tasks", "journal", "playlist", "complete"],
  is_completed: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: MOCK_USER });
  mockGetOnboardingProgress.mockReturnValue(0);
});

// ── Loading onboarding ────────────────────────────────────────────────────────

describe("loadOnboarding", () => {
  it("sets shouldShowOnboarding=true when is_completed is false", async () => {
    mockGetUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.shouldShowOnboarding).toBe(true);
    expect(result.current.currentStep).toBe("welcome");
  });

  it("sets shouldShowOnboarding=false when is_completed is true", async () => {
    mockGetUserOnboarding.mockResolvedValue(COMPLETE_ONBOARDING);

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.shouldShowOnboarding).toBe(false);
  });

  it("creates onboarding record when none exists, then shows modal", async () => {
    mockGetUserOnboarding.mockResolvedValue(null);
    mockCreateUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCreateUserOnboarding).toHaveBeenCalledWith("user-123");
    expect(result.current.shouldShowOnboarding).toBe(true);
  });

  it("does not show onboarding when there is no logged-in user", async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.shouldShowOnboarding).toBe(false);
    expect(mockGetUserOnboarding).not.toHaveBeenCalled();
  });
});

// ── skipOnboarding (the critical flow) ───────────────────────────────────────

describe("skipOnboarding", () => {
  it("dismisses modal immediately, before the DB call resolves", async () => {
    // DB call takes time — modal must hide before it resolves
    let resolveSkip!: (v: boolean) => void;
    mockGetUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");
    mockSkipOnboarding.mockReturnValue(new Promise((res) => { resolveSkip = res; }));

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldShowOnboarding).toBe(true);

    // Call skip — don't await the DB yet
    act(() => { result.current.skipOnboarding(); });

    // Modal should hide immediately, without waiting for DB
    expect(result.current.shouldShowOnboarding).toBe(false);

    // Let the DB call resolve
    resolveSkip(true);
  });

  it("dismisses modal even when the DB call fails", async () => {
    mockGetUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");
    mockSkipOnboarding.mockResolvedValue(false); // DB failure

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldShowOnboarding).toBe(true);

    await act(async () => { await result.current.skipOnboarding(); });

    // Modal must be gone even though DB returned false
    expect(result.current.shouldShowOnboarding).toBe(false);
  });

  it("stays dismissed after DB success and re-load confirms is_completed=true", async () => {
    mockGetUserOnboarding
      .mockResolvedValueOnce(INCOMPLETE_ONBOARDING) // initial load
      .mockResolvedValueOnce(COMPLETE_ONBOARDING);  // after skip re-load
    mockGetNextOnboardingStep.mockReturnValue("welcome");
    mockSkipOnboarding.mockResolvedValue(true);

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.skipOnboarding(); });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldShowOnboarding).toBe(false);
  });

  it("returns false (but still dismisses) when DB call fails", async () => {
    mockGetUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");
    mockSkipOnboarding.mockResolvedValue(false);

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.skipOnboarding();
    });

    expect(returnValue).toBe(false);
    expect(result.current.shouldShowOnboarding).toBe(false); // still dismissed
  });
});

// ── dismissOnboarding ─────────────────────────────────────────────────────────

describe("dismissOnboarding", () => {
  it("hides the modal without touching the DB", async () => {
    mockGetUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldShowOnboarding).toBe(true);

    act(() => { result.current.dismissOnboarding(); });

    expect(result.current.shouldShowOnboarding).toBe(false);
    expect(mockSkipOnboarding).not.toHaveBeenCalled();
  });
});

// ── Full beginning-to-end user journey ────────────────────────────────────────

describe("full onboarding journey", () => {
  it("new user: shows modal → user dismisses → modal is gone", async () => {
    mockGetUserOnboarding.mockResolvedValue(null);
    mockCreateUserOnboarding.mockResolvedValue(INCOMPLETE_ONBOARDING);
    mockGetNextOnboardingStep.mockReturnValue("welcome");
    mockSkipOnboarding.mockResolvedValue(true);
    mockGetUserOnboarding.mockResolvedValueOnce(null); // first call returns null
    mockGetUserOnboarding.mockResolvedValue(COMPLETE_ONBOARDING); // after skip

    const { result } = renderHook(() => useOnboarding());

    // 1. Loading
    expect(result.current.isLoading).toBe(true);

    // 2. Loaded — new user, modal shows
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldShowOnboarding).toBe(true);

    // 3. User completes/skips the onboarding
    await act(async () => { await result.current.skipOnboarding(); });

    // 4. Modal is gone — user can now use the app
    expect(result.current.shouldShowOnboarding).toBe(false);
  });

  it("returning user (already completed): modal never shows", async () => {
    mockGetUserOnboarding.mockResolvedValue(COMPLETE_ONBOARDING);

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.shouldShowOnboarding).toBe(false);
    expect(mockSkipOnboarding).not.toHaveBeenCalled();
  });
});
