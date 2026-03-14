"use client";
import { usePathname } from "next/navigation";
import OnboardingFlow, { DEFAULT_ONBOARDING_STEPS } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";

interface OnboardingTriggerProps {
  children: React.ReactNode;
}

export default function OnboardingTrigger({ children }: OnboardingTriggerProps) {
  const { shouldShowOnboarding, skipOnboarding, isLoading } = useOnboarding();
  const pathname = usePathname();

  // Only show the onboarding modal on the dashboard, not on content pages
  // (avoids conflicting with project/task creation dialogs on other pages)
  const showModal = shouldShowOnboarding && pathname === "/dashboard";

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {showModal && (
        <OnboardingFlow
          isOpen={showModal}
          onClose={skipOnboarding}
          onComplete={skipOnboarding}
          steps={DEFAULT_ONBOARDING_STEPS}
        />
      )}
    </>
  );
}
