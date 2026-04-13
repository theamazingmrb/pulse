// Supabase Edge Function: send-notifications
// Sends push notifications to users based on their preferences and schedule
// Run with: supabase functions serve

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Web Push libraries
import { webpush } from 'https://deno.land/x/webpush@1.0.0/mod.ts';

// Configure VAPID
webpush.setVapidDetails(
  'mailto:support@prioritycompass.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  VAPID_PRIVATE_KEY
);

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  status: string;
  user_id: string;
}

// Get current time in the user's timezone
function getCurrentHour(timezone: string = 'America/Los_Angeles'): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(now), 10);
}

// Get notification content based on type
function getNotificationContent(
  type: string,
  data?: Record<string, unknown>
): { title: string; body: string; url: string } {
  switch (type) {
    case 'morning_checkin':
      return {
        title: '🌅 Good morning!',
        body: 'Time for your morning check-in. Set your top priority for today.',
        url: '/checkin?time=morning',
      };
    case 'midday_checkin':
      return {
        title: '☀️ Midday check-in',
        body: "How's your day going? Take a moment to recalibrate.",
        url: '/checkin?time=midday',
      };
    case 'evening_checkin':
      return {
        title: '🌙 Evening reflection',
        body: "Time for your evening check-in. What did you accomplish today?",
        url: '/checkin?time=evening',
      };
    case 'task_start':
      return {
        title: `📋 Task starting: ${data?.taskTitle || 'Upcoming task'}`,
        body: data?.taskDescription
          ? `${data.taskDescription} starts in ${data?.minutes || 15} minutes.`
          : `Task starts in ${data?.minutes || 15} minutes.`,
        url: '/tasks',
      };
    case 'overdue_task':
      return {
        title: '⚠️ Overdue tasks',
        body: `You have ${data?.count || 1} overdue task${(data?.count as number) > 1 ? 's' : ''} that need${(data?.count as number) === 1 ? 's' : ''} attention.`,
        url: '/tasks?filter=overdue',
      };
    case 'reflection':
      return {
        title: '📝 Daily reflection',
        body: 'Take a moment to reflect on your day. What went well?',
        url: '/reflections/new',
      };
    default:
      return {
        title: 'Priority Compass',
        body: 'You have a notification.',
        url: '/',
      };
  }
}

// Send push notification to a subscription
async function sendPushNotification(
  subscription: PushSubscription,
  payload: object
): Promise<{ success: boolean; error?: string }> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Log notification attempt
async function logNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  sent: boolean,
  errorMessage?: string
): Promise<void> {
  await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: type,
    title,
    body,
    sent,
    error_message: errorMessage || null,
  });
}

// Send notifications to all enabled users for a specific type
async function sendNotificationsByType(
  type: string,
  usersWithSubs: { userId: string; subscriptions: PushSubscription[] }[]
): Promise<{ sent: number; failed: number }> {
  const content = getNotificationContent(type);
  let sent = 0;
  let failed = 0;

  for (const { userId, subscriptions } of usersWithSubs) {
    const payload = {
      ...content,
      type,
      timestamp: new Date().toISOString(),
    };

    for (const sub of subscriptions) {
      const result = await sendPushNotification(sub, payload);
      
      if (result.success) {
        sent++;
        await logNotification(userId, type, content.title, content.body, true);
      } else {
        failed++;
        await logNotification(userId, type, content.title, content.body, false, result.error);
      }
    }
  }

  return { sent, failed };
}

// Get users who should receive check-in notifications now
async function getUsersForCheckin(type: 'morning' | 'midday' | 'evening'): Promise<
  { userId: string; subscriptions: PushSubscription[] }[]
> {
  const timeField = `${type}_checkin_time`;
  const enabledField = `${type}_checkin_enabled`;

  // Get current hour in Pacific timezone
  const currentHour = getCurrentHour();

  // Get preferences for users who have this check-in enabled and time matches
  const { data: preferences, error: prefError } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('notifications_enabled', true)
    .eq(enabledField, true);

  if (prefError) {
    console.error('Error fetching preferences:', prefError);
    return [];
  }

  // Filter by time (stored as HH:MM:SS)
  const matchingUserIds = (preferences || [])
    .filter((pref) => {
      // Parse the time and compare hours
      const prefTime = pref[timeField] || (type === 'morning' ? '08:00:00' : type === 'midday' ? '12:00:00' : '20:00:00');
      const prefHour = parseInt(prefTime.split(':')[0], 10);
      return prefHour === currentHour;
    })
    .map((pref) => pref.user_id);

  if (matchingUserIds.length === 0) {
    return [];
  }

  // Get push subscriptions for these users
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh_key, auth_key')
    .in('user_id', matchingUserIds);

  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
    return [];
  }

  // Group subscriptions by user
  const userMap = new Map<string, PushSubscription[]>();
  for (const sub of subs || []) {
    const existing = userMap.get(sub.user_id) || [];
    existing.push({
      endpoint: sub.endpoint,
      p256dh_key: sub.p256dh_key,
      auth_key: sub.auth_key,
    });
    userMap.set(sub.user_id, existing);
  }

  return Array.from(userMap.entries()).map(([userId, subscriptions]) => ({
    userId,
    subscriptions,
  }));
}

// Get users who have tasks starting soon
async function getUsersForTaskStart(): Promise<
  { userId: string; subscriptions: PushSubscription[]; tasks: Task[] }[]
> {
  const now = new Date();
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

  // Get preferences for users with task start notifications enabled
  const { data: preferences, error: prefError } = await supabase
    .from('notification_preferences')
    .select('user_id, task_start_minutes_before')
    .eq('notifications_enabled', true)
    .eq('task_start_enabled', true);

  if (prefError) {
    console.error('Error fetching preferences:', prefError);
    return [];
  }

  const userMinutesMap = new Map<string, number>();
  for (const pref of preferences || []) {
    userMinutesMap.set(pref.user_id, pref.task_start_minutes_before || 15);
  }

  const userIds = Array.from(userMinutesMap.keys());

  // Get tasks starting soon for these users
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, description, start_time, status, user_id')
    .in('user_id', userIds)
    .eq('status', 'active')
    .not('start_time', 'is', null)
    .gte('start_time', now.toISOString())
    .lte('start_time', fifteenMinutesFromNow.toISOString());

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    return [];
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  // Get push subscriptions
  const taskUserIds = [...new Set(tasks.map((t) => t.user_id))];
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh_key, auth_key')
    .in('user_id', taskUserIds);

  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
    return [];
  }

  // Group by user
  const userSubsMap = new Map<string, PushSubscription[]>();
  for (const sub of subs || []) {
    const existing = userSubsMap.get(sub.user_id) || [];
    existing.push({
      endpoint: sub.endpoint,
      p256dh_key: sub.p256dh_key,
      auth_key: sub.auth_key,
    });
    userSubsMap.set(sub.user_id, existing);
  }

  const userTasksMap = new Map<string, Task[]>();
  for (const task of tasks) {
    const existing = userTasksMap.get(task.user_id) || [];
    existing.push(task);
    userTasksMap.set(task.user_id, existing);
  }

  return Array.from(userTasksMap.entries())
    .filter(([userId]) => userSubsMap.has(userId))
    .map(([userId, userTasks]) => ({
      userId,
      subscriptions: userSubsMap.get(userId) || [],
      tasks: userTasks,
    }));
}

// Get users with overdue tasks
async function getUsersWithOverdueTasks(): Promise<
  { userId: string; subscriptions: PushSubscription[]; count: number }[]
> {
  const now = new Date();
  const currentHour = getCurrentHour();

  // Get preferences for users with overdue notifications enabled
  const { data: preferences, error: prefError } = await supabase
    .from('notification_preferences')
    .select('user_id, overdue_task_check_time')
    .eq('notifications_enabled', true)
    .eq('overdue_task_enabled', true);

  if (prefError) {
    console.error('Error fetching preferences:', prefError);
    return [];
  }

  // Filter by check time
  const matchingUserIds = (preferences || [])
    .filter((pref) => {
      const prefTime = pref.overdue_task_check_time || '09:00:00';
      const prefHour = parseInt(prefTime.split(':')[0], 10);
      return prefHour === currentHour;
    })
    .map((pref) => pref.user_id);

  if (matchingUserIds.length === 0) {
    return [];
  }

  // Get overdue tasks count for these users
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('user_id')
    .in('user_id', matchingUserIds)
    .eq('status', 'active')
    .not('due_date', 'is', null)
    .lt('due_date', now.toISOString());

  if (tasksError) {
    console.error('Error fetching overdue tasks:', tasksError);
    return [];
  }

  // Count by user
  const userCountMap = new Map<string, number>();
  for (const task of tasks || []) {
    const count = userCountMap.get(task.user_id) || 0;
    userCountMap.set(task.user_id, count + 1);
  }

  // Only include users with overdue tasks
  const usersWithOverdue = Array.from(userCountMap.entries())
    .filter(([, count]) => count > 0)
    .map(([userId]) => userId);

  if (usersWithOverdue.length === 0) {
    return [];
  }

  // Get push subscriptions
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh_key, auth_key')
    .in('user_id', usersWithOverdue);

  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
    return [];
  }

  const userSubsMap = new Map<string, PushSubscription[]>();
  for (const sub of subs || []) {
    const existing = userSubsMap.get(sub.user_id) || [];
    existing.push({
      endpoint: sub.endpoint,
      p256dh_key: sub.p256dh_key,
      auth_key: sub.auth_key,
    });
    userSubsMap.set(sub.user_id, existing);
  }

  return Array.from(userCountMap.entries())
    .filter(([userId]) => userSubsMap.has(userId))
    .map(([userId, count]) => ({
      userId,
      subscriptions: userSubsMap.get(userId) || [],
      count,
    }));
}

// Main handler
serve(async (req: Request) => {
  // Verify this is a cron job or authorized request
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const notificationType = url.searchParams.get('type');

  try {
    let result: { sent: number; failed: number };

    switch (notificationType) {
      case 'morning_checkin': {
        const users = await getUsersForCheckin('morning');
        result = await sendNotificationsByType('morning_checkin', users);
        break;
      }
      case 'midday_checkin': {
        const users = await getUsersForCheckin('midday');
        result = await sendNotificationsByType('midday_checkin', users);
        break;
      }
      case 'evening_checkin': {
        const users = await getUsersForCheckin('evening');
        result = await sendNotificationsByType('evening_checkin', users);
        break;
      }
      case 'task_start': {
        const users = await getUsersForTaskStart();
        let sent = 0;
        let failed = 0;

        for (const { userId, subscriptions, tasks } of users) {
          for (const task of tasks) {
            const content = getNotificationContent('task_start', {
              taskTitle: task.title,
              taskDescription: task.description,
              taskId: task.id,
              minutes: 15,
            });

            const payload = {
              ...content,
              type: 'task_start',
              taskId: task.id,
              timestamp: new Date().toISOString(),
            };

            for (const sub of subscriptions) {
              const res = await sendPushNotification(sub, payload);
              if (res.success) {
                sent++;
                await logNotification(userId, 'task_start', content.title, content.body, true);
              } else {
                failed++;
                await logNotification(userId, 'task_start', content.title, content.body, false, res.error);
              }
            }
          }
        }

        result = { sent, failed };
        break;
      }
      case 'overdue_task': {
        const users = await getUsersWithOverdueTasks();
        let sent = 0;
        let failed = 0;

        for (const { userId, subscriptions, count } of users) {
          const content = getNotificationContent('overdue_task', { count });

          const payload = {
            ...content,
            type: 'overdue_task',
            timestamp: new Date().toISOString(),
          };

          for (const sub of subscriptions) {
            const res = await sendPushNotification(sub, payload);
            if (res.success) {
              sent++;
              await logNotification(userId, 'overdue_task', content.title, content.body, true);
            } else {
              failed++;
              await logNotification(userId, 'overdue_task', content.title, content.body, false, res.error);
            }
          }
        }

        result = { sent, failed };
        break;
      }
      case 'reflection': {
        // Get users who have reflection notifications enabled
        const { data: preferences, error: prefError } = await supabase
          .from('notification_preferences')
          .select('user_id, reflection_time')
          .eq('notifications_enabled', true)
          .eq('reflection_enabled', true);

        if (prefError) {
          throw prefError;
        }

        const currentHour = getCurrentHour();
        const matchingUserIds = (preferences || [])
          .filter((pref) => {
            const prefTime = pref.reflection_time || '21:00:00';
            const prefHour = parseInt(prefTime.split(':')[0], 10);
            return prefHour === currentHour;
          })
          .map((pref) => pref.user_id);

        if (matchingUserIds.length === 0) {
          result = { sent: 0, failed: 0 };
        } else {
          const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('user_id, endpoint, p256dh_key, auth_key')
            .in('user_id', matchingUserIds);

          if (subsError) {
            throw subsError;
          }

          const userMap = new Map<string, PushSubscription[]>();
          for (const sub of subs || []) {
            const existing = userMap.get(sub.user_id) || [];
            existing.push({
              endpoint: sub.endpoint,
              p256dh_key: sub.p256dh_key,
              auth_key: sub.auth_key,
            });
            userMap.set(sub.user_id, existing);
          }

          const users = Array.from(userMap.entries()).map(([userId, subscriptions]) => ({
            userId,
            subscriptions,
          }));

          result = await sendNotificationsByType('reflection', users);
        }
        break;
      }
      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
      success: true,
      type: notificationType,
      sent: result.sent,
      failed: result.failed,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});