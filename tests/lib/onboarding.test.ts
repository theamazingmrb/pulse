import { describe, it, expect } from "vitest";
import {
  getNextOnboardingStep,
  getOnboardingProgress,
  ONBOARDING_STEPS,
} from "@/lib/onboarding";

describe("ONBOARDING_STEPS", () => {
  it("has 7 steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(7);
  });

  it("starts with 'welcome'", () => {
    expect(ONBOARDING_STEPS[0]).toBe("welcome");
  });

  it("ends with 'complete'", () => {
    expect(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]).toBe("complete");
  });

  it("contains 'north-star', 'projects', 'tasks', 'journal', 'playlist' in order", () => {
    const steps = [...ONBOARDING_STEPS];
    expect(steps.indexOf("north-star")).toBeLessThan(steps.indexOf("projects"));
    expect(steps.indexOf("projects")).toBeLessThan(steps.indexOf("tasks"));
    expect(steps.indexOf("tasks")).toBeLessThan(steps.indexOf("journal"));
    expect(steps.indexOf("journal")).toBeLessThan(steps.indexOf("playlist"));
    expect(steps.indexOf("playlist")).toBeLessThan(steps.indexOf("complete"));
  });
});

describe("getNextOnboardingStep", () => {
  it("returns 'welcome' when nothing is completed", () => {
    expect(getNextOnboardingStep([])).toBe("welcome");
  });

  it("returns the next step after welcome", () => {
    expect(getNextOnboardingStep(["welcome"])).toBe("north-star");
  });

  it("skips all completed steps and returns the first incomplete one", () => {
    expect(
      getNextOnboardingStep(["welcome", "north-star", "projects", "tasks"])
    ).toBe("journal");
  });

  it("returns 'complete' when only the last step is missing", () => {
    expect(
      getNextOnboardingStep(["welcome", "north-star", "projects", "tasks", "journal", "playlist"])
    ).toBe("complete");
  });

  it("returns null when all steps are completed", () => {
    expect(getNextOnboardingStep([...ONBOARDING_STEPS])).toBeNull();
  });

  it("respects step order even if completed steps are out of order", () => {
    // 'north-star' not done, 'tasks' done — should return 'north-star'
    expect(getNextOnboardingStep(["welcome", "tasks", "journal"])).toBe(
      "north-star"
    );
  });
});

describe("getOnboardingProgress", () => {
  it("returns 0 when no steps are completed", () => {
    expect(getOnboardingProgress([])).toBe(0);
  });

  it("returns 100 when all steps are completed", () => {
    expect(getOnboardingProgress([...ONBOARDING_STEPS])).toBe(100);
  });

  it("returns ~14.29 for 1 of 7 steps", () => {
    expect(getOnboardingProgress(["welcome"])).toBeCloseTo(100 / 7, 1);
  });

  it("returns ~42.86 for 3 of 7 steps", () => {
    expect(getOnboardingProgress(["welcome", "north-star", "projects"])).toBeCloseTo(
      (3 / 7) * 100,
      1
    );
  });

  it("returns ~71.43 for 5 of 7 steps", () => {
    expect(
      getOnboardingProgress(["welcome", "north-star", "projects", "tasks", "journal"])
    ).toBeCloseTo((5 / 7) * 100, 1);
  });
});