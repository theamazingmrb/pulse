import { supabase } from '@/lib/supabase';
import { Project } from '@/types';

export const getProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data || [];
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data;
};

export const createProject = async (
  project: Omit<Project, 'id' | 'created_at' | 'updated_at'>
): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data;
};

export const updateProject = async (
  id: string,
  updates: Partial<Project>
): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return null;
  }

  return data;
};

export const deleteProject = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
};

export const getActiveProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active projects:', error);
    return [];
  }

  return data || [];
};

// Default project colors
export const PROJECT_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
] as const;
