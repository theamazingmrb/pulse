"use client";
import OnboardingFlow, { DEFAULT_ONBOARDING_STEPS } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";

interface OnboardingTriggerProps {
  children: React.ReactNode;
}

export default function OnboardingTrigger({ children }: OnboardingTriggerProps) {
  const { shouldShowOnboarding, skipOnboarding, isLoading } = useOnboarding();

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {shouldShowOnboarding && (
        <OnboardingFlow
          isOpen={shouldShowOnboarding}
          onClose={skipOnboarding}
          onComplete={skipOnboarding}
          steps={DEFAULT_ONBOARDING_STEPS}
        />
      )}
    </>
  );
}
