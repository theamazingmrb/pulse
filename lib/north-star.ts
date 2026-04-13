import { supabase } from './supabase';
import type { NorthStar } from '@/types';

const MAX_CONTENT_LENGTH = 500;

export interface NorthStarResult {
  success: boolean;
  data?: NorthStar;
  error?: string;
}

/**
 * Get the current user's North Star
 */
export async function getNorthStar(userId: string): Promise<NorthStar | null> {
  const { data, error } = await supabase
    .from('north_star')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // PGRST116 means no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching north star:', error);
    return null;
  }

  return data as NorthStar;
}

/**
 * Create or update the user's North Star
 */
export async function upsertNorthStar(
  userId: string,
  content: string
): Promise<NorthStarResult> {
  // Validate content
  const trimmed = content.trim();
  
  if (!trimmed) {
    return { success: false, error: 'Content cannot be empty' };
  }
  
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return { 
      success: false, 
      error: `Content must be ${MAX_CONTENT_LENGTH} characters or less` 
    };
  }

  const { data, error } = await supabase
    .from('north_star')
    .upsert(
      { 
        user_id: userId, 
        content: trimmed 
      },
      { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting north star:', error);
    return { success: false, error: 'Failed to save North Star' };
  }

  return { success: true, data: data as NorthStar };
}

/**
 * Delete the user's North Star
 */
export async function deleteNorthStar(userId: string): Promise<NorthStarResult> {
  const { error } = await supabase
    .from('north_star')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting north star:', error);
    return { success: false, error: 'Failed to delete North Star' };
  }

  return { success: true };
}

/**
 * Truncate North Star content for display
 */
export function truncateNorthStar(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  
  // Find the last space before maxLength to avoid cutting words
  const lastSpace = content.lastIndexOf(' ', maxLength);
  const truncateAt = lastSpace > 0 ? lastSpace : maxLength;
  
  return content.slice(0, truncateAt).trim() + '...';
}

export const NORTH_STAR_PROMPTS = [
  "What does success look like for you in 5 years?",
  "If you could only accomplish one thing this year, what would it be?",
  "What impact do you want to have on the people around you?",
  "When you look back on your life, what do you want to be remembered for?",
  "What would you do if you knew you could not fail?",
];

export { MAX_CONTENT_LENGTH };