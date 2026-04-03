import { supabase } from '@/lib/supabase';
import type { 
  NotificationPreferencesForm,
  NotificationType,
  PushSubscription 
} from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';

// VAPID public key - will be set via environment variable
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Check if push notifications are supported
export function areNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window;
}

// Check if notification permission is granted
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined') return null;
  
  if (!('Notification' in window)) return null;
  
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    return 'denied' as NotificationPermission;
  }
  
  const permission = await Notification.requestPermission();
  return permission;
}

// Convert time string (HH:MM) to database format (HH:MM:SS)
export function timeToDbFormat(time: string): string {
  if (time.includes(':') && time.split(':').length === 2) {
    return `${time}:00`;
  }
  return time;
}

// Convert database time (HH:MM:SS) to form format (HH:MM)
export function timeFromDbFormat(time: string): string {
  if (!time) return '08:00';
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

// Get notification preferences for current user
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferencesForm | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences exist, return defaults
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    console.error('Error fetching notification preferences:', error);
    return null;
  }
  
  // Transform database format to form format
  return {
    notifications_enabled: data.notifications_enabled,
    morning_checkin_enabled: data.morning_checkin_enabled,
    morning_checkin_time: timeFromDbFormat(data.morning_checkin_time),
    midday_checkin_enabled: data.midday_checkin_enabled,
    midday_checkin_time: timeFromDbFormat(data.midday_checkin_time),
    evening_checkin_enabled: data.evening_checkin_enabled,
    evening_checkin_time: timeFromDbFormat(data.evening_checkin_time),
    task_start_enabled: data.task_start_enabled,
    task_start_minutes_before: data.task_start_minutes_before,
    overdue_task_enabled: data.overdue_task_enabled,
    reflection_enabled: data.reflection_enabled,
    reflection_time: timeFromDbFormat(data.reflection_time),
  };
}

// Save notification preferences
export async function saveNotificationPreferences(
  userId: string, 
  preferences: NotificationPreferencesForm
): Promise<{ success: boolean; error?: string }> {
  // Convert form format to database format
  const dbPreferences = {
    user_id: userId,
    notifications_enabled: preferences.notifications_enabled,
    morning_checkin_enabled: preferences.morning_checkin_enabled,
    morning_checkin_time: timeToDbFormat(preferences.morning_checkin_time),
    midday_checkin_enabled: preferences.midday_checkin_enabled,
    midday_checkin_time: timeToDbFormat(preferences.midday_checkin_time),
    evening_checkin_enabled: preferences.evening_checkin_enabled,
    evening_checkin_time: timeToDbFormat(preferences.evening_checkin_time),
    task_start_enabled: preferences.task_start_enabled,
    task_start_minutes_before: preferences.task_start_minutes_before,
    overdue_task_enabled: preferences.overdue_task_enabled,
    reflection_enabled: preferences.reflection_enabled,
    reflection_time: timeToDbFormat(preferences.reflection_time),
  };
  
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(dbPreferences, { onConflict: 'user_id' });
  
  if (error) {
    console.error('Error saving notification preferences:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  userId: string,
  registration: ServiceWorkerRegistration
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'Push notifications not configured (missing VAPID key)' };
  }
  
  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    
    // Extract keys from subscription
    const subscriptionJSON = subscription.toJSON();
    const p256dh = subscriptionJSON.keys?.p256dh;
    const auth = subscriptionJSON.keys?.auth;
    
    if (!p256dh || !auth) {
      return { success: false, error: 'Failed to get subscription keys' };
    }
    
    // Store subscription in database
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        user_agent: navigator.userAgent,
        device_name: getDeviceName(),
      }, { onConflict: 'endpoint' });
    
    if (dbError) {
      console.error('Error storing push subscription:', dbError);
      return { success: false, error: dbError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(
  userId: string,
  registration: ServiceWorkerRegistration
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Get endpoint before unsubscribing
      const endpoint = subscription.endpoint;
      
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Remove from database
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);
      
      if (dbError) {
        console.error('Error removing push subscription:', dbError);
        return { success: false, error: dbError.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Get all push subscriptions for a user
export async function getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching push subscriptions:', error);
    return [];
  }
  
  return data || [];
}

// Delete a specific push subscription
export async function deletePushSubscription(
  userId: string, 
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting push subscription:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// Helper: Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray as unknown as Uint8Array<ArrayBuffer>;
}

// Helper: Get device name from user agent
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'iOS Device';
  }
  if (/Android/.test(ua)) {
    return 'Android Device';
  }
  if (/Windows/.test(ua)) {
    return 'Windows PC';
  }
  if (/Mac/.test(ua)) {
    return 'Mac';
  }
  if (/Linux/.test(ua)) {
    return 'Linux PC';
  }
  
  return 'Unknown Device';
}

// Test notification (for testing in development)
export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    new Notification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/badge-72.svg',
    });
    return true;
  } catch {
    return false;
  }
}

// Schedule notification content based on type
export function getNotificationContent(type: NotificationType, data?: Record<string, unknown>): {
  title: string;
  body: string;
  tag: string;
  url: string;
} {
  switch (type) {
    case 'morning_checkin':
      return {
        title: '🌅 Good morning!',
        body: 'Time for your morning check-in. Set your top priority for today.',
        tag: 'morning-checkin',
        url: '/checkin?time=morning',
      };
    case 'midday_checkin':
      return {
        title: '☀️ Midday check-in',
        body: 'How\'s your day going? Take a moment to recalibrate.',
        tag: 'midday-checkin',
        url: '/checkin?time=midday',
      };
    case 'evening_checkin':
      return {
        title: '🌙 Evening reflection',
        body: 'Time for your evening check-in. What did you accomplish today?',
        tag: 'evening-checkin',
        url: '/checkin?time=evening',
      };
    case 'task_start':
      return {
        title: `📋 Task starting: ${data?.taskTitle || 'Upcoming task'}`,
        body: data?.taskDescription 
          ? `${data.taskDescription} starts in ${data?.minutes || 15} minutes.`
          : `Task starts in ${data?.minutes || 15} minutes.`,
        tag: `task-${data?.taskId || 'start'}`,
        url: '/tasks',
      };
    case 'overdue_task':
      return {
        title: '⚠️ Overdue tasks',
        body: `You have ${data?.count || 1} overdue task${(data?.count as number) > 1 ? 's' : ''} that need${(data?.count as number) === 1 ? 's' : ''} attention.`,
        tag: 'overdue-tasks',
        url: '/tasks?filter=overdue',
      };
    case 'reflection':
      return {
        title: '📝 Daily reflection',
        body: 'Take a moment to reflect on your day. What went well?',
        tag: 'daily-reflection',
        url: '/reflections/new',
      };
    default:
      return {
        title: 'Priority Compass',
        body: 'You have a notification.',
        tag: 'default',
        url: '/',
      };
  }
}