import { supabase } from './supabase';
import type { CoreValue } from '@/types';

const MAX_VALUES = 5;
const MAX_VALUE_LENGTH = 100;

export interface CoreValueResult {
  success: boolean;
  data?: CoreValue[];
  error?: string;
}

/**
 * Get the current user's core values, ordered by value_order
 */
export async function getCoreValues(userId: string): Promise<CoreValue[]> {
  const { data, error } = await supabase
    .from('core_values')
    .select('*')
    .eq('user_id', userId)
    .order('value_order', { ascending: true });

  if (error) {
    console.error('Error fetching core values:', error);
    return [];
  }

  return data as CoreValue[];
}

/**
 * Add a new core value
 */
export async function addCoreValue(
  userId: string,
  valueText: string,
  existingCount: number = 0
): Promise<CoreValueResult> {
  // Validate
  const trimmed = valueText.trim();
  
  if (!trimmed) {
    return { success: false, error: 'Value cannot be empty' };
  }
  
  if (trimmed.length > MAX_VALUE_LENGTH) {
    return { 
      success: false, 
      error: `Value must be ${MAX_VALUE_LENGTH} characters or less` 
    };
  }

  if (existingCount >= MAX_VALUES) {
    return {
      success: false,
      error: `Maximum ${MAX_VALUES} values allowed`
    };
  }

  // Insert with next order value
  const { data, error } = await supabase
    .from('core_values')
    .insert({
      user_id: userId,
      value_text: trimmed,
      value_order: existingCount
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This value already exists' };
    }
    console.error('Error adding core value:', error);
    return { success: false, error: 'Failed to add value' };
  }

  return { success: true, data: [data as CoreValue] };
}

/**
 * Update a core value's text
 */
export async function updateCoreValue(
  userId: string,
  valueId: string,
  valueText: string
): Promise<CoreValueResult> {
  const trimmed = valueText.trim();
  
  if (!trimmed) {
    return { success: false, error: 'Value cannot be empty' };
  }
  
  if (trimmed.length > MAX_VALUE_LENGTH) {
    return { 
      success: false, 
      error: `Value must be ${MAX_VALUE_LENGTH} characters or less` 
    };
  }

  const { data, error } = await supabase
    .from('core_values')
    .update({ value_text: trimmed })
    .eq('id', valueId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This value already exists' };
    }
    console.error('Error updating core value:', error);
    return { success: false, error: 'Failed to update value' };
  }

  return { success: true, data: [data as CoreValue] };
}

/**
 * Delete a core value
 */
export async function deleteCoreValue(
  userId: string,
  valueId: string
): Promise<CoreValueResult> {
  const { error } = await supabase
    .from('core_values')
    .delete()
    .eq('id', valueId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting core value:', error);
    return { success: false, error: 'Failed to delete value' };
  }

  return { success: true };
}

/**
 * Reorder core values
 * Takes an array of value IDs in the new order
 */
export async function reorderCoreValues(
  userId: string,
  orderedIds: string[]
): Promise<CoreValueResult> {
  // Update each value's order
  const updates = orderedIds.map((id, index) => ({
    id,
    value_order: index
  }));

  // Use Promise.all to update all at once
  const results = await Promise.all(
    updates.map(update =>
      supabase
        .from('core_values')
        .update({ value_order: update.value_order })
        .eq('id', update.id)
        .eq('user_id', userId)
    )
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error reordering core values:', errors);
    return { success: false, error: 'Failed to reorder values' };
  }

  // Fetch and return updated values
  return { success: true, data: await getCoreValues(userId) };
}

// Inspirational prompts for core values
export const CORE_VALUE_PROMPTS = [
  "What principles guide your decisions?",
  "What would you never compromise on?",
  "What matters more than success?",
  "When you're at your best, what values are you living?",
  "What do you want to be known for?",
  "What gets you out of bed in the morning?",
  "What would you fight for?",
];

export { MAX_VALUES, MAX_VALUE_LENGTH };