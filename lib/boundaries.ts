import { supabase } from '@/lib/supabase';

export interface Boundary {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  boundary_text: string;
  boundary_order: number;
  description: string | null;
}

export const MAX_BOUNDARIES = 10;

export const BOUNDARY_PROMPTS = [
  "What requests do you always regret saying yes to?",
  "What drains your energy without giving anything back?",
  "What activities pull you away from your priorities?",
  "What would you say no to if you had more courage?",
  "What boundaries have you let slip?",
];

/**
 * Get all boundaries for a user
 */
export async function getBoundaries(userId: string): Promise<Boundary[]> {
  const { data, error } = await supabase
    .from('boundaries')
    .select('*')
    .eq('user_id', userId)
    .order('boundary_order', { ascending: true });

  if (error) {
    console.error('Error fetching boundaries:', error);
    return [];
  }

  return data || [];
}

/**
 * Add a new boundary
 */
export async function addBoundary(
  userId: string,
  text: string,
  order: number = 0,
  description?: string
): Promise<{ success: boolean; data?: Boundary[]; error?: string }> {
  const { error } = await supabase
    .from('boundaries')
    .insert({
      user_id: userId,
      boundary_text: text,
      boundary_order: order,
      description: description || null,
    })
    .select();

  if (error) {
    console.error('Error adding boundary:', error);
    return { success: false, error: error.message };
  }

  // Fetch all boundaries to return updated list
  const boundaries = await getBoundaries(userId);
  return { success: true, data: boundaries };
}

/**
 * Update a boundary
 */
export async function updateBoundary(
  userId: string,
  id: string,
  text: string,
  description?: string
): Promise<{ success: boolean; data?: Boundary[]; error?: string }> {
  const { error } = await supabase
    .from('boundaries')
    .update({
      boundary_text: text,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating boundary:', error);
    return { success: false, error: error.message };
  }

  const boundaries = await getBoundaries(userId);
  return { success: true, data: boundaries };
}

/**
 * Delete a boundary
 */
export async function deleteBoundary(
  userId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('boundaries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting boundary:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder boundaries
 */
export async function reorderBoundaries(
  userId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // Update each boundary's order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('boundaries')
      .update({ boundary_order: index })
      .eq('id', id)
      .eq('user_id', userId)
  );

  try {
    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    console.error('Error reordering boundaries:', error);
    return { success: false, error: 'Failed to reorder boundaries' };
  }
}