import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingFlow, {
  DEFAULT_ONBOARDING_STEPS,
} from "@/components/onboarding/OnboardingFlow";
import { Target } from "lucide-react";

// Minimal step set for most tests
const makeSteps = () => [
  {
    id: "step-1",
    title: "Step One",
    description: "First step description",
    icon: <Target className="w-8 h-8" />,
  },
  {
    id: "step-2",
    title: "Step Two",
    description: "Second step description",
    icon: <Target className="w-8 h-8" />,
    action: {
      label: "Do Action",
      onClick: vi.fn(),
    },
    skip: true,
  },
  {
    id: "step-3",
    title: "Step Three",
    description: "Third step description",
    icon: <Target className="w-8 h-8" />,
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingFlow", () => {
  describe("visibility", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <OnboardingFlow {...defaultProps} isOpen={false} steps={makeSteps()} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("renders the modal when isOpen is true", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.getByText("Step One")).toBeInTheDocument();
    });
  });

  describe("initial state", () => {
    it("shows the first step title and description", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.getByText("Step One")).toBeInTheDocument();
      expect(screen.getByText("First step description")).toBeInTheDocument();
    });

    it("shows 'Step 1 of N' progress label", () => {
      const steps = makeSteps();
      render(<OnboardingFlow {...defaultProps} steps={steps} />);
      expect(
        screen.getByText(`Step 1 of ${steps.length}`)
      ).toBeInTheDocument();
    });

    it("does not show Previous button on the first step", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("shows 'Next' button on the first step", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("advances to the next step when Next is clicked", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("Step Two")).toBeInTheDocument();
    });

    it("shows Previous button after advancing", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(
        screen.getByRole("button", { name: /previous/i })
      ).toBeInTheDocument();
    });

    it("goes back to the previous step when Previous is clicked", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /previous/i }));
      expect(screen.getByText("Step One")).toBeInTheDocument();
    });

    it("updates step counter as user advances", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    });
  });

  describe("step with action", () => {
    it("renders the action button label instead of Next", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(
        screen.getByRole("button", { name: /do action/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
    });

    it("calls action.onClick when the action button is clicked", async () => {
      const user = userEvent.setup();
      const steps = makeSteps();
      render(<OnboardingFlow {...defaultProps} steps={steps} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /do action/i }));
      expect(steps[1].action!.onClick).toHaveBeenCalledOnce();
    });

    it("advances to the next step after clicking the action button", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /do action/i }));
      expect(screen.getByText("Step Three")).toBeInTheDocument();
    });

    it("shows Skip button on steps that have skip: true", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    });

    it("advances without calling action when Skip is clicked", async () => {
      const user = userEvent.setup();
      const steps = makeSteps();
      render(<OnboardingFlow {...defaultProps} steps={steps} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(steps[1].action!.onClick).not.toHaveBeenCalled();
      expect(screen.getByText("Step Three")).toBeInTheDocument();
    });
  });

  describe("last step", () => {
    it("shows 'Get Started' on the last step instead of Next", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(
        screen.getByRole("button", { name: /get started/i })
      ).toBeInTheDocument();
    });

    it("calls onComplete when Get Started is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(
        <OnboardingFlow
          {...defaultProps}
          onComplete={onComplete}
          steps={makeSteps()}
        />
      );
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      await user.click(screen.getByRole("button", { name: /get started/i }));
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it("does not show Skip on the last step", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("calls onClose when the X button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <OnboardingFlow {...defaultProps} onClose={onClose} steps={makeSteps()} />
      );
      // The X button has no accessible name, find by its parent
      const closeButton = screen.getByRole("button", { name: "" });
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("DEFAULT_ONBOARDING_STEPS", () => {
    it("has 6 steps", () => {
      expect(DEFAULT_ONBOARDING_STEPS).toHaveLength(6);
    });

    it("starts with the welcome step", () => {
      expect(DEFAULT_ONBOARDING_STEPS[0].id).toBe("welcome");
    });

    it("ends with the complete step", () => {
      const last = DEFAULT_ONBOARDING_STEPS[DEFAULT_ONBOARDING_STEPS.length - 1];
      expect(last.id).toBe("complete");
    });

    it("projects step has an action that navigates to /projects?create=true", () => {
      const projectsStep = DEFAULT_ONBOARDING_STEPS.find(
        (s) => s.id === "projects"
      );
      expect(projectsStep?.action).toBeDefined();

      // Mock location
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "" },
      });
      projectsStep!.action!.onClick();
      expect(window.location.href).toBe("/projects?create=true");
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("all middle steps have skip: true", () => {
      const middleSteps = DEFAULT_ONBOARDING_STEPS.slice(1, -1);
      middleSteps.forEach((step) => {
        expect(step.skip).toBe(true);
      });
    });
  });
});
