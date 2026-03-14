import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  getUserOnboarding, 
  createUserOnboarding, 
  updateOnboardingProgress,
  skipOnboarding,
  getNextOnboardingStep,
  getOnboardingProgress,
  UserOnboarding
} from '@/lib/onboarding';
import { OnboardingStep } from '@/lib/onboarding';

export function useOnboarding() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<UserOnboarding | null>(null);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);

  const loadOnboarding = async () => {
    if (!user) return;

    setIsLoading(true);
    
    let userOnboarding = await getUserOnboarding(user.id);
    
    if (!userOnboarding) {
      userOnboarding = await createUserOnboarding(user.id);
    }

    setOnboarding(userOnboarding);

    if (userOnboarding && !userOnboarding.is_completed) {
      const nextStep = getNextOnboardingStep(userOnboarding.completed_steps);
      setCurrentStep(nextStep);
      setShouldShowOnboarding(true);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    loadOnboarding();
  }, [user, loadOnboarding]);

  const completeStep = async (step: OnboardingStep) => {
    if (!user) return false;

    const isLastStep = step === 'complete';
    const updated = await updateOnboardingProgress(user.id, step, isLastStep);
    
    if (updated) {
      setOnboarding(updated);
      
      if (updated.is_completed) {
        setShouldShowOnboarding(false);
        setCurrentStep(null);
      } else {
        const nextStep = getNextOnboardingStep(updated.completed_steps);
        setCurrentStep(nextStep);
      }
    }

    return !!updated;
  };

  const skipOnboardingFlow = async () => {
    if (!user) return false;

    const success = await skipOnboarding(user.id);
    
    if (success) {
      setShouldShowOnboarding(false);
      setCurrentStep(null);
      await loadOnboarding();
    }

    return success;
  };

  const dismissOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  const progress = onboarding ? getOnboardingProgress(onboarding.completed_steps) : 0;

  return {
    isLoading,
    onboarding,
    shouldShowOnboarding,
    currentStep,
    progress,
    completeStep,
    skipOnboarding: skipOnboardingFlow,
    dismissOnboarding,
    refreshOnboarding: loadOnboarding,
  };
}
