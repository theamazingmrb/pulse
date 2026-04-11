import { supabase } from '@/lib/supabase';
import { WeeklyRhythm, TimeBlock, EnergyLevel, FocusMode, RhythmPreset } from '@/types';

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const TIME_BLOCKS: { value: TimeBlock; label: string; hours: string }[] = [
  { value: 'morning', label: 'Morning', hours: '6 AM - 12 PM' },
  { value: 'afternoon', label: 'Afternoon', hours: '12 PM - 6 PM' },
  { value: 'evening', label: 'Evening', hours: '6 PM - 10 PM' },
];

export const ENERGY_LEVELS: { value: EnergyLevel; label: string; color: string; description: string }[] = [
  { value: 'high', label: 'High', color: '#22C55E', description: 'Peak energy, ready for anything' },
  { value: 'medium', label: 'Medium', color: '#F59E0B', description: 'Steady, reliable focus' },
  { value: 'low', label: 'Low', color: '#EF4444', description: 'Tired, save for simple tasks' },
];

export const FOCUS_MODES: { value: FocusMode; label: string; color: string; description: string }[] = [
  { value: 'deep', label: 'Deep Focus', color: '#8B5CF6', description: 'Full creative attention, 1-2 hour blocks' },
  { value: 'quick', label: 'Quick Tasks', color: '#22C55E', description: 'Under 15 minutes, batch them' },
  { value: 'planning', label: 'Planning', color: '#3B82F6', description: 'Organizing & strategizing' },
  { value: 'admin', label: 'Admin', color: '#6B7280', description: 'Logistical, repetitive tasks' },
];

// Preset configurations for weekly rhythms
export const PRESET_CONFIGS: Record<RhythmPreset, WeeklyRhythm[]> = {
  makers_schedule: DAYS_OF_WEEK.flatMap(day => 
    TIME_BLOCKS.map((block, idx): WeeklyRhythm => ({
      id: '',
      created_at: '',
      updated_at: '',
      user_id: '',
      day_of_week: day.value,
      time_block: block.value,
      energy_level: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low',
      focus_mode: day.value >= 5 
        ? (idx === 0 ? 'planning' : idx === 1 ? 'quick' : 'quick')
        : (idx === 0 ? 'deep' : idx === 1 ? 'admin' : 'quick'),
      notes: null,
    }))
  ),
  night_owl: DAYS_OF_WEEK.flatMap(day =>
    TIME_BLOCKS.map((block, idx): WeeklyRhythm => ({
      id: '',
      created_at: '',
      updated_at: '',
      user_id: '',
      day_of_week: day.value,
      time_block: block.value,
      energy_level: idx === 2 ? 'high' : idx === 1 ? 'medium' : 'low',
      focus_mode: idx === 2 ? 'deep' : idx === 1 ? 'admin' : 'quick',
      notes: null,
    }))
  ),
  balanced: DAYS_OF_WEEK.flatMap(day =>
    TIME_BLOCKS.map((block, idx): WeeklyRhythm => ({
      id: '',
      created_at: '',
      updated_at: '',
      user_id: '',
      day_of_week: day.value,
      time_block: block.value,
      energy_level: day.value >= 1 && day.value <= 4 && idx === 0 ? 'high' : 'medium',
      focus_mode: idx === 0 ? (day.value === 0 || day.value === 5 ? 'planning' : 'deep') 
                 : idx === 1 ? 'quick' 
                 : 'admin',
      notes: null,
    }))
  ),
};

/**
 * Get weekly rhythms for a user
 */
export async function getWeeklyRhythms(userId: string): Promise<WeeklyRhythm[]> {
  const { data, error } = await supabase
    .from('weekly_rhythms')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true })
    .order('time_block', { ascending: true });

  if (error) {
    console.error('Error fetching weekly rhythms:', error);
    return [];
  }

  return data || [];
}

/**
 * Get rhythm for a specific day and time block
 */
export async function getRhythmForBlock(
  userId: string,
  dayOfWeek: number,
  timeBlock: TimeBlock
): Promise<WeeklyRhythm | null> {
  const { data, error } = await supabase
    .from('weekly_rhythms')
    .select('*')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .eq('time_block', timeBlock)
    .single();

  if (error) {
    console.error('Error fetching rhythm block:', error);
    return null;
  }

  return data;
}

/**
 * Get today's rhythm for each time block
 */
export async function getTodayRhythms(userId: string): Promise<WeeklyRhythm[]> {
  const today = new Date().getDay();
  return getRhythmsForDay(userId, today);
}

/**
 * Get rhythms for a specific day
 */
export async function getRhythmsForDay(userId: string, dayOfWeek: number): Promise<WeeklyRhythm[]> {
  const { data, error } = await supabase
    .from('weekly_rhythms')
    .select('*')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek);

  if (error) {
    console.error('Error fetching day rhythms:', error);
    return [];
  }

  return data || [];
}

/**
 * Upsert a weekly rhythm block
 */
export async function upsertRhythmBlock(
  userId: string,
  dayOfWeek: number,
  timeBlock: TimeBlock,
  energyLevel: EnergyLevel,
  focusMode: FocusMode,
  notes?: string
): Promise<WeeklyRhythm | null> {
  const { data, error } = await supabase
    .from('weekly_rhythms')
    .upsert(
      {
        user_id: userId,
        day_of_week: dayOfWeek,
        time_block: timeBlock,
        energy_level: energyLevel,
        focus_mode: focusMode,
        notes: notes || null,
      },
      { onConflict: 'user_id,day_of_week,time_block' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting rhythm block:', error);
    return null;
  }

  return data;
}

/**
 * Apply a preset to all weekly rhythms
 */
export async function applyRhythmPreset(
  userId: string,
  preset: RhythmPreset
): Promise<WeeklyRhythm[]> {
  // Delete existing rhythms first
  await supabase
    .from('weekly_rhythms')
    .delete()
    .eq('user_id', userId);

  const presetRhythms = PRESET_CONFIGS[preset];
  const insertData = presetRhythms.map(r => ({
    user_id: userId,
    day_of_week: r.day_of_week,
    time_block: r.time_block,
    energy_level: r.energy_level,
    focus_mode: r.focus_mode,
    notes: r.notes,
  }));

  const { data, error } = await supabase
    .from('weekly_rhythms')
    .insert(insertData)
    .select();

  if (error) {
    console.error('Error applying preset:', error);
    return [];
  }

  return data || [];
}

/**
 * Get current time block based on hour
 */
export function getCurrentTimeBlock(): TimeBlock {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Get time block for a specific hour
 */
export function getTimeBlockForHour(hour: number): TimeBlock {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Get rhythm summary for a day (for display)
 */
export function getRhythmSummaryForDay(rhythms: WeeklyRhythm[]): {
  highEnergyBlocks: TimeBlock[];
  lowEnergyBlocks: TimeBlock[];
  deepFocusBlocks: TimeBlock[];
  adminBlocks: TimeBlock[];
} {
  return {
    highEnergyBlocks: rhythms.filter(r => r.energy_level === 'high').map(r => r.time_block),
    lowEnergyBlocks: rhythms.filter(r => r.energy_level === 'low').map(r => r.time_block),
    deepFocusBlocks: rhythms.filter(r => r.focus_mode === 'deep').map(r => r.time_block),
    adminBlocks: rhythms.filter(r => r.focus_mode === 'admin').map(r => r.time_block),
  };
}

/**
 * Format energy level for display
 */
export function formatEnergyLevel(level: EnergyLevel): string {
  return ENERGY_LEVELS.find(e => e.value === level)?.label || level;
}

/**
 * Format time block for display
 */
export function formatTimeBlock(block: TimeBlock): string {
  return TIME_BLOCKS.find(t => t.value === block)?.label || block;
}

/**
 * Get rhythm suggestion for a task
 */
export function getRhythmSuggestion(
  rhythms: WeeklyRhythm[],
  focusMode: FocusMode,
  preferredDays?: number[]
): { dayOfWeek: number; timeBlock: TimeBlock; energyLevel: EnergyLevel } | null {
  // Filter by preferred days if provided
  const relevantRhythms = preferredDays
    ? rhythms.filter(r => preferredDays.includes(r.day_of_week))
    : rhythms;

  // Find blocks with matching focus mode, sorted by energy level
  const matchingBlocks = relevantRhythms
    .filter(r => r.focus_mode === focusMode)
    .sort((a, b) => {
      const energyOrder = { high: 0, medium: 1, low: 2 };
      return energyOrder[a.energy_level] - energyOrder[b.energy_level];
    });

  if (matchingBlocks.length > 0) {
    const best = matchingBlocks[0];
    return {
      dayOfWeek: best.day_of_week,
      timeBlock: best.time_block,
      energyLevel: best.energy_level,
    };
  }

  // Fallback: find high energy blocks for any focus mode
  const highEnergyBlocks = relevantRhythms
    .filter(r => r.energy_level === 'high')
    .sort((a, b) => a.day_of_week - b.day_of_week);

  if (highEnergyBlocks.length > 0) {
    const best = highEnergyBlocks[0];
    return {
      dayOfWeek: best.day_of_week,
      timeBlock: best.time_block,
      energyLevel: best.energy_level,
    };
  }

  return null;
}

/**
 * Get a human-readable suggestion message for a task
 */
export function getRhythmSuggestionMessage(
  rhythms: WeeklyRhythm[],
  focusMode: FocusMode | null
): string | null {
  if (!focusMode || rhythms.length === 0) return null;

  const suggestion = getRhythmSuggestion(rhythms, focusMode);
  
  if (!suggestion) return null;

  const dayName = DAYS_OF_WEEK.find(d => d.value === suggestion.dayOfWeek)?.label || 'that day';
  const timeBlockName = formatTimeBlock(suggestion.timeBlock);
  const energyLabel = formatEnergyLevel(suggestion.energyLevel);

  return `This is a ${FOCUS_MODES.find(m => m.value === focusMode)?.label || focusMode} task. Your ${energyLabel.toLowerCase()} energy block is ${dayName} ${timeBlockName.toLowerCase()}.`;
}