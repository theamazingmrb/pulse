import { supabase } from '@/lib/supabase';
import { Task } from '@/types';
import { SchedulingService, PRIORITY_CONFIG } from './scheduling';
import { 
  getNextOccurrence, 
  createTaskInstanceFromTemplate
} from './recurrence';

export { PRIORITY_CONFIG };

export const getTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('user_id', userId)
    .order('priority_level', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return (data || []).map(task => ({
    ...task,
    project: task.projects || null
  }));
};

export const getTask = async (taskId: string): Promise<Task | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('Error fetching task:', error);
    return null;
  }

  return data ? { ...data, project: data.projects || null } : null;
};

export const createTask = async (
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): Promise<Task | null> => {
  const taskData = {
    user_id: task.user_id,
    title: task.title,
    description: task.description || null,
    status: task.status || 'active',
    project_id: task.project_id || null,
    notes: task.notes || null,
    due_date: task.due_date || null,
    priority_level: task.priority_level || 1,
    scheduling_mode: task.scheduling_mode || 'manual',
    estimated_duration: task.estimated_duration || 30,
    start_time: task.start_time || null,
    end_time: task.end_time || null,
    locked: task.locked || false,
    focus_mode: task.focus_mode || null,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  const newTask = data ? { ...data, project: data.projects || null } : null;

  // Auto-schedule if mode is auto and no times set
  if (newTask && newTask.scheduling_mode === 'auto' && !newTask.start_time) {
    const scheduled = await autoScheduleTask(newTask.id, newTask.user_id);
    if (scheduled) {
      return scheduled;
    }
  }

  return newTask;
};

export const updateTask = async (
  id: string,
  updates: Partial<Task>
): Promise<Task | null> => {
  // Remove nested project object if present
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { project, ...cleanUpdates } = updates;

  const { data, error } = await supabase
    .from('tasks')
    .update(cleanUpdates)
    .eq('id', id)
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data ? { ...data, project: data.projects || null } : null;
};

export const deleteTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
};

export const completeTask = async (id: string): Promise<Task | null> => {
  // Get the task to check if it's a recurring task
  const task = await getTask(id);
  if (!task) return null;

  // Update status to done
  const updatedTask = await updateTask(id, { status: 'done' });
  
  // If this is a recurrence template, create the next instance
  if (task.is_recurrence_template && task.recurrence_type) {
    const nextDate = getNextOccurrence({
      type: task.recurrence_type,
      interval: task.recurrence_interval || 1,
      endDate: task.recurrence_end_date,
      weekdays: task.recurrence_weekdays,
    });

    if (nextDate) {
      // Create the next instance
      const newInstance = createTaskInstanceFromTemplate(task, nextDate);
      await createTask(newInstance as Parameters<typeof createTask>[0]);
    }
  }

  // If this is an instance of a recurring task, create the next instance
  if (task.parent_task_id && task.recurrence_type) {
    // Get the parent template
    const parentTask = await getTask(task.parent_task_id);
    
    if (parentTask && parentTask.is_recurrence_template) {
      // Find the next occurrence date based on current instance's scheduled time
      const currentStartTime = task.start_time ? new Date(task.start_time) : new Date();
      const nextDate = getNextOccurrence({
        type: task.recurrence_type,
        interval: task.recurrence_interval || 1,
        endDate: parentTask.recurrence_end_date,
        weekdays: task.recurrence_weekdays,
      }, currentStartTime);

      if (nextDate) {
        // Create the next instance using parent as template
        const newInstance = createTaskInstanceFromTemplate(parentTask, nextDate);
        await createTask(newInstance as Parameters<typeof createTask>[0]);
      }
    }
  }

  return updatedTask;
};

export const uncompleteTask = async (id: string): Promise<Task | null> => {
  return updateTask(id, { status: 'active' });
};

export const lockTask = async (id: string): Promise<Task | null> => {
  return updateTask(id, { locked: true });
};

export const unlockTask = async (id: string): Promise<Task | null> => {
  return updateTask(id, { locked: false });
};

export const updateTaskPriority = async (
  id: string,
  priorityLevel: number
): Promise<Task | null> => {
  return updateTask(id, { priority_level: priorityLevel });
};

export const autoScheduleTask = async (
  taskId: string,
  userId: string
): Promise<Task | null> => {
  const task = await getTask(taskId);
  if (!task) return null;

  const existingTasks = await getTasks(userId);
  
  const scheduling = await SchedulingService.autoScheduleTask(
    task,
    existingTasks
  );

  if (scheduling) {
    return updateTask(taskId, {
      start_time: scheduling.start_time.toISOString(),
      end_time: scheduling.end_time.toISOString(),
      scheduling_mode: 'auto',
    });
  }

  return task;
};

export const rescheduleOverdueTasks = async (userId: string): Promise<Task[]> => {
  const allTasks = await getTasks(userId);
  const now = new Date();

  // Find overdue, incomplete, unlocked tasks
  const overdueTasks = allTasks.filter(task =>
    task.end_time &&
    task.status !== 'done' &&
    !task.locked &&
    new Date(task.end_time) < now
  );

  if (overdueTasks.length === 0) {
    return [];
  }

  const rescheduledTasks: Task[] = [];

  for (const overdueTask of overdueTasks) {
    const nonOverdueTasks = allTasks.filter(t => !overdueTasks.some(o => o.id === t.id));
    
    const scheduling = await SchedulingService.autoScheduleTask(
      overdueTask,
      [...nonOverdueTasks, ...rescheduledTasks]
    );

    if (scheduling) {
      const updated = await updateTask(overdueTask.id, {
        start_time: scheduling.start_time.toISOString(),
        end_time: scheduling.end_time.toISOString(),
      });

      if (updated) {
        rescheduledTasks.push(updated);
      }
    }
  }

  return rescheduledTasks;
};

export const getTasksByStatus = async (
  userId: string,
  status: string
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('status', status)
    .order('priority_level', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks by status:', error);
    return [];
  }

  return (data || []).map(task => ({
    ...task,
    project: task.projects || null
  }));
};

export const getTasksByPriority = async (
  userId: string,
  priorityLevel: number
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('priority_level', priorityLevel)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks by priority:', error);
    return [];
  }

  return (data || []).map(task => ({
    ...task,
    project: task.projects || null
  }));
};

export const getScheduledTasksForDay = async (
  userId: string,
  date: Date
): Promise<Task[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('user_id', userId)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled tasks:', error);
    return [];
  }

  return (data || []).map(task => ({
    ...task,
    project: task.projects || null
  }));
};

/**
 * Get all recurring task templates
 */
export const getRecurringTaskTemplates = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('is_recurrence_template', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recurring task templates:', error);
    return [];
  }

  return (data || []).map(task => ({
    ...task,
    project: task.projects || null
  }));
};

/**
 * Get instances of a recurring task
 */
export const getRecurringTaskInstances = async (
  userId: string,
  parentTaskId: string
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        color,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('parent_task_id', parentTaskId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching recurring task instances:', error);
    return [];
  }

  return (data || []).map(task => ({
    ...task,
    project: task.projects || null
  }));
};

/**
 * Skip a specific instance of a recurring task
 */
export const skipRecurringInstance = async (
  taskId: string,
  skipDate: Date
): Promise<Task | null> => {
  const task = await getTask(taskId);
  if (!task) return null;

  const skipDateStr = skipDate.toISOString().split('T')[0];
  const skippedDates = task.skipped_dates || [];
  
  if (skippedDates.includes(skipDateStr)) {
    return task; // Already skipped
  }

  const updated = await updateTask(taskId, {
    skipped_dates: [...skippedDates, skipDateStr]
  });

  return updated;
};

/**
 * Unskip a specific instance of a recurring task
 */
export const unskipRecurringInstance = async (
  taskId: string,
  skipDate: Date
): Promise<Task | null> => {
  const task = await getTask(taskId);
  if (!task) return null;

  const skipDateStr = skipDate.toISOString().split('T')[0];
  const skippedDates = task.skipped_dates || [];
  
  const updated = await updateTask(taskId, {
    skipped_dates: skippedDates.filter(d => d !== skipDateStr)
  });

  return updated;
};
