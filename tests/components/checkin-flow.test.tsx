import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckinFlow from "@/components/checkin-flow";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/lib/utils", () => ({
  getTimeOfDay: () => "morning",
  getGreeting: () => "Good morning",
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockGetTasks = vi.fn().mockResolvedValue([]);
const mockGetAllWarMapItems = vi.fn().mockResolvedValue([]);
const mockLinkTaskToWarMapItem = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/tasks", () => ({
  getTasks: (...args: unknown[]) => mockGetTasks(...args),
  PRIORITY_CONFIG: {
    1: { label: "Hot", color: "#EF4444" },
    2: { label: "Warm", color: "#F59E0B" },
    3: { label: "Cool", color: "#3B82F6" },
    4: { label: "Cold", color: "#6B7280" },
  },
}));

vi.mock("@/lib/warmap", () => ({
  getAllWarMapItems: (...args: unknown[]) => mockGetAllWarMapItems(...args),
  linkTaskToWarMapItem: (...args: unknown[]) => mockLinkTaskToWarMapItem(...args),
}));

const mockSupabaseInsert = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      insert: mockSupabaseInsert,
    }),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTasks.mockResolvedValue([]);
  mockGetAllWarMapItems.mockResolvedValue([]);
  mockSupabaseInsert.mockResolvedValue({ error: null });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CheckinFlow — start step", () => {
  it("renders greeting and headline on start step", async () => {
    render(<CheckinFlow />);

    await waitFor(() => {
      expect(screen.getByText(/Good morning/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Morning check-in/)).toBeInTheDocument();
  });

  it("shows 'Let's go' button", () => {
    render(<CheckinFlow />);

    expect(screen.getByRole("button", { name: /Let's go/i })).toBeInTheDocument();
  });

  it("advances to priority step when 'Let's go' clicked", async () => {
    const user = userEvent.setup();
    render(<CheckinFlow />);

    await user.click(screen.getByRole("button", { name: /Let's go/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/What's the single most important thing you'll do today/i)
      ).toBeInTheDocument();
    });
  });

  it("advances to priority step when 'Recalibrate' clicked", async () => {
    const user = userEvent.setup();
    render(<CheckinFlow />);

    await user.click(screen.getByRole("button", { name: /Recalibrate/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/What's the single most important thing you'll do today/i)
      ).toBeInTheDocument();
    });
  });
});

describe("CheckinFlow — priority step", () => {
  async function goToPriorityStep() {
    const user = userEvent.setup();
    render(<CheckinFlow />);
    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() =>
      screen.getByText(/What's the single most important thing/)
    );
    return user;
  }

  it("shows priority question", async () => {
    await goToPriorityStep();

    expect(
      screen.getByText(/What's the single most important thing you'll do today/i)
    ).toBeInTheDocument();
  });

  it("Next button is disabled when top priority is empty", async () => {
    await goToPriorityStep();

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).toBeDisabled();
  });

  it("Next button is enabled after entering priority text", async () => {
    const user = await goToPriorityStep();

    const textarea = screen.getByPlaceholderText(/Be specific/i);
    await user.type(textarea, "Finish the report");

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it("skips warmap step when no warmap items exist", async () => {
    const user = await goToPriorityStep();
    mockGetAllWarMapItems.mockResolvedValue([]);

    const textarea = screen.getByPlaceholderText(/Be specific/i);
    await user.type(textarea, "Finish report");
    await user.click(screen.getByRole("button", { name: /Next/i }));

    await waitFor(() => {
      // Should go to context step (not warmap)
      expect(screen.getByPlaceholderText(/Optional — what's on your mind/i)).toBeInTheDocument();
    });
  });

  it("shows warmap step when warmap items exist", async () => {
    mockGetAllWarMapItems.mockResolvedValue([
      {
        id: "i1",
        title: "Build fitness habit",
        status: "active",
        category: { id: "c1", name: "Health", color: "#10B981", icon: "💪" },
      },
    ]);

    const user = userEvent.setup();
    render(<CheckinFlow />);
    await waitFor(() => {}); // wait for data to load

    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByPlaceholderText(/Be specific/i));

    const textarea = screen.getByPlaceholderText(/Be specific/i);
    await user.type(textarea, "Work out");
    await user.click(screen.getByRole("button", { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Link to your WarMap/i)).toBeInTheDocument();
    });
  });

  it("shows active tasks picker when tasks exist", async () => {
    mockGetTasks.mockResolvedValue([
      {
        id: "t1",
        title: "Write tests",
        status: "active",
        priority_level: 2,
        project: null,
        scheduling_mode: "manual",
        estimated_duration: 30,
        start_time: null,
        end_time: null,
        locked: false,
        user_id: "u1",
        created_at: "",
        updated_at: "",
        description: null,
        project_id: null,
        notes: null,
        due_date: null,
        image_url: null,
      },
    ]);

    const user = userEvent.setup();
    render(<CheckinFlow />);
    await waitFor(() => {}); // wait for tasks to load

    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByText(/pick from your 1 active task/i));

    expect(screen.getByText(/pick from your 1 active task/i)).toBeInTheDocument();
  });

  it("selecting a task from picker populates top priority", async () => {
    mockGetTasks.mockResolvedValue([
      {
        id: "t1",
        title: "Write tests",
        status: "active",
        priority_level: 2,
        project: null,
        scheduling_mode: "manual",
        estimated_duration: 30,
        start_time: null,
        end_time: null,
        locked: false,
        user_id: "u1",
        created_at: "",
        updated_at: "",
        description: null,
        project_id: null,
        notes: null,
        due_date: null,
        image_url: null,
      },
    ]);

    const user = userEvent.setup();
    render(<CheckinFlow />);
    await waitFor(() => {}); // wait for data

    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByText(/pick from your 1 active task/i));

    await user.click(screen.getByText(/pick from your 1 active task/i));
    await waitFor(() => screen.getByText("Write tests"));
    await user.click(screen.getByText("Write tests"));

    // Task chip should appear
    await waitFor(() => {
      expect(screen.getByText("Write tests")).toBeInTheDocument();
    });
    // Next button should be enabled
    expect(screen.getByRole("button", { name: /Next/i })).not.toBeDisabled();
  });
});

describe("CheckinFlow — context step", () => {
  async function goToContextStep() {
    const user = userEvent.setup();
    render(<CheckinFlow />);
    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByPlaceholderText(/Be specific/i));
    await user.type(screen.getByPlaceholderText(/Be specific/i), "Top priority");
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByPlaceholderText(/Optional — what's on your mind/i));
    return user;
  }

  it("shows context question", async () => {
    await goToContextStep();

    expect(screen.getByText(/Anything that might get in the way/i)).toBeInTheDocument();
  });

  it("has Back button that returns to priority step", async () => {
    const user = await goToContextStep();

    await user.click(screen.getByRole("button", { name: /Back/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Be specific/i)).toBeInTheDocument();
    });
  });

  it("advances to energy step", async () => {
    const user = await goToContextStep();

    await user.click(screen.getByRole("button", { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Energy level right now/i)).toBeInTheDocument();
    });
  });
});

describe("CheckinFlow — energy step", () => {
  async function goToEnergyStep() {
    const user = userEvent.setup();
    render(<CheckinFlow />);
    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByPlaceholderText(/Be specific/i));
    await user.type(screen.getByPlaceholderText(/Be specific/i), "Top priority");
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByPlaceholderText(/Optional/i));
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByText(/Energy level right now/i));
    return user;
  }

  it("shows energy buttons 1-5", async () => {
    await goToEnergyStep();

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole("button", { name: String(i) })).toBeInTheDocument();
    }
  });

  it("shows 'Save check-in' button", async () => {
    await goToEnergyStep();

    expect(screen.getByRole("button", { name: /Save check-in/i })).toBeInTheDocument();
  });

  it("saves check-in and shows done step", async () => {
    mockSupabaseInsert.mockResolvedValue({ error: null });
    const user = await goToEnergyStep();

    await user.click(screen.getByRole("button", { name: /Save check-in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Locked in/i)).toBeInTheDocument();
    });
  });

  it("shows error toast when save fails", async () => {
    mockSupabaseInsert.mockResolvedValue({ error: { message: "fail" } });
    const { toast } = await import("sonner");
    const user = await goToEnergyStep();

    await user.click(screen.getByRole("button", { name: /Save check-in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save check-in");
    });
  });
});

describe("CheckinFlow — done step", () => {
  async function goToDoneStep() {
    mockSupabaseInsert.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<CheckinFlow />);
    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByPlaceholderText(/Be specific/i));
    await user.type(screen.getByPlaceholderText(/Be specific/i), "Finish the report");
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByPlaceholderText(/Optional/i));
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByText(/Energy level/i));
    await user.click(screen.getByRole("button", { name: /Save check-in/i }));
    await waitFor(() => screen.getByText(/Locked in/i));
    return user;
  }

  it("shows the saved top priority", async () => {
    await goToDoneStep();

    expect(screen.getByText("Finish the report")).toBeInTheDocument();
  });

  it("has 'Write a journal entry' button", async () => {
    await goToDoneStep();

    expect(screen.getByRole("button", { name: /Write a journal entry/i })).toBeInTheDocument();
  });

  it("has 'Check in again' button that resets flow", async () => {
    const user = await goToDoneStep();

    await user.click(screen.getByRole("button", { name: /Check in again/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Let's go/i })).toBeInTheDocument();
    });
  });

  it("calls onComplete callback after saving", async () => {
    mockSupabaseInsert.mockResolvedValue({ error: null });
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<CheckinFlow onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: /Let's go/i }));
    await waitFor(() => screen.getByPlaceholderText(/Be specific/i));
    await user.type(screen.getByPlaceholderText(/Be specific/i), "My priority");
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByPlaceholderText(/Optional/i));
    await user.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByText(/Energy level/i));
    await user.click(screen.getByRole("button", { name: /Save check-in/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});
