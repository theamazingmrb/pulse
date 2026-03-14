import { supabase } from './supabase';

export interface UserOnboarding {
  id: string;
  user_id: string;
  completed_steps: string[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const ONBOARDING_STEPS = [
  'welcome',
  'projects',
  'tasks', 
  'journal',
  'playlist',
  'complete'
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

export async function getUserOnboarding(userId: string): Promise<UserOnboarding | null> {
  const { data, error } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching onboarding:', error);
    return null;
  }

  return data;
}

export async function createUserOnboarding(userId: string): Promise<UserOnboarding | null> {
  const { data, error } = await supabase
    .from('user_onboarding')
    .insert([{
      user_id: userId,
      completed_steps: [],
      is_completed: false,
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating onboarding:', error);
    return null;
  }

  return data;
}

export async function updateOnboardingProgress(
  userId: string,
  step: OnboardingStep,
  isCompleted: boolean = false
): Promise<UserOnboarding | null> {
  const existing = await getUserOnboarding(userId);
  
  if (!existing) {
    const created = await createUserOnboarding(userId);
    if (!created) return null;
    return updateOnboardingProgress(userId, step, isCompleted);
  }

  const completedSteps = new Set(existing.completed_steps);
  if (isCompleted) {
    completedSteps.add(step);
  }

  const { data, error } = await supabase
    .from('user_onboarding')
    .update({
      completed_steps: Array.from(completedSteps),
      is_completed: isCompleted && step === 'complete',
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating onboarding:', error);
    return null;
  }

  return data;
}

export async function skipOnboarding(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_onboarding')
    .upsert({
      user_id: userId,
      completed_steps: ONBOARDING_STEPS,
      is_completed: true,
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error skipping onboarding:', error);
    return false;
  }

  return true;
}

export function getNextOnboardingStep(completedSteps: string[]): OnboardingStep | null {
  for (const step of ONBOARDING_STEPS) {
    if (!completedSteps.includes(step)) {
      return step;
    }
  }
  return null;
}

export function getOnboardingProgress(completedSteps: string[]): number {
  return (completedSteps.length / ONBOARDING_STEPS.length) * 100;
}
