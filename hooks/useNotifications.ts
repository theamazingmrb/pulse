'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getNotificationPreferences,
  saveNotificationPreferences,
  getUserPushSubscriptions,
  deletePushSubscription,
  sendTestNotification,
} from '@/lib/notifications';
import type { NotificationPreferencesForm, PushSubscription } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';

export interface UseNotificationsReturn {
  // State
  isSupported: boolean;
  permission: NotificationPermission | null;
  isLoading: boolean;
  isSubscribed: boolean;
  preferences: NotificationPreferencesForm;
  subscriptions: PushSubscription[];
  swRegistration: ServiceWorkerRegistration | null;
  
  // Actions
  requestPermission: () => Promise<NotificationPermission>;
  enableNotifications: () => Promise<{ success: boolean; error?: string }>;
  disableNotifications: () => Promise<{ success: boolean; error?: string }>;
  updatePreferences: (prefs: Partial<NotificationPreferencesForm>) => Promise<{ success: boolean; error?: string }>;
  refreshSubscriptions: () => Promise<void>;
  removeSubscription: (id: string) => Promise<{ success: boolean; error?: string }>;
  sendTest: (title: string, body: string) => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  
  // State
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferencesForm>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const supported = areNotificationsSupported();
      setIsSupported(supported);
      
      if (supported) {
        const perm = getNotificationPermission();
        setPermission(perm);
        
        // Register service worker
        const registration = await registerServiceWorker();
        setSwRegistration(registration);
        
        if (registration) {
          // Check if already subscribed
          const existingSub = await registration.pushManager.getSubscription();
          setIsSubscribed(!!existingSub);
        }
      }
      
      setIsLoading(false);
    };
    
    init();
  }, []);
  
  // Load preferences and subscriptions when user changes
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setSubscriptions([]);
      return;
    }
    
    const loadUserData = async () => {
      setIsLoading(true);
      
      // Load preferences
      const prefs = await getNotificationPreferences(user.id);
      if (prefs) {
        setPreferences(prefs);
      }
      
      // Load subscriptions
      const subs = await getUserPushSubscriptions(user.id);
      setSubscriptions(subs);
      
      setIsLoading(false);
    };
    
    loadUserData();
  }, [user]);
  
  // Request permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    return perm;
  }, []);
  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to enable notifications' };
    }
    
    if (!isSupported) {
      return { success: false, error: 'Push notifications are not supported in this browser' };
    }
    
    if (!swRegistration) {
      return { success: false, error: 'Service worker not registered' };
    }
    
    try {
      // Request permission if needed
      let perm = permission;
      if (perm !== 'granted') {
        perm = await requestPermission();
      }
      
      if (perm !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }
      
      // Subscribe to push
      const result = await subscribeToPushNotifications(user.id, swRegistration);
      
      if (result.success) {
        setIsSubscribed(true);
        
        // Update preferences
        await saveNotificationPreferences(user.id, {
          ...preferences,
          notifications_enabled: true,
        });
        
        setPreferences(prev => ({ ...prev, notifications_enabled: true }));
        
        // Refresh subscriptions list
        const subs = await getUserPushSubscriptions(user.id);
        setSubscriptions(subs);
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSupported, swRegistration, permission, preferences]);
  
  // Disable notifications
  const disableNotifications = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to disable notifications' };
    }
    
    if (!swRegistration) {
      return { success: false, error: 'Service worker not registered' };
    }
    
    try {
      // Unsubscribe from push
      const result = await unsubscribeFromPushNotifications(user.id, swRegistration);
      
      if (result.success) {
        setIsSubscribed(false);
        
        // Update preferences
        await saveNotificationPreferences(user.id, {
          ...preferences,
          notifications_enabled: false,
        });
        
        setPreferences(prev => ({ ...prev, notifications_enabled: false }));
        
        // Refresh subscriptions list
        const subs = await getUserPushSubscriptions(user.id);
        setSubscriptions(subs);
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [user, swRegistration, preferences]);
  
  // Update preferences
  const updatePreferences = useCallback(async (
    prefs: Partial<NotificationPreferencesForm>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to update preferences' };
    }
    
    const newPrefs = { ...preferences, ...prefs };
    
    const result = await saveNotificationPreferences(user.id, newPrefs);
    
    if (result.success) {
      setPreferences(newPrefs);
    }
    
    return result;
  }, [user, preferences]);
  
  // Refresh subscriptions
  const refreshSubscriptions = useCallback(async () => {
    if (!user) return;
    
    const subs = await getUserPushSubscriptions(user.id);
    setSubscriptions(subs);
  }, [user]);
  
  // Remove subscription
  const removeSubscription = useCallback(async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to remove subscriptions' };
    }
    
    const result = await deletePushSubscription(user.id, id);
    
    if (result.success) {
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    }
    
    return result;
  }, [user]);
  
  // Send test notification
  const sendTest = useCallback(async (title: string, body: string): Promise<boolean> => {
    return sendTestNotification(title, body);
  }, []);
  
  return {
    isSupported,
    permission,
    isLoading,
    isSubscribed,
    preferences,
    subscriptions,
    swRegistration,
    requestPermission,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    refreshSubscriptions,
    removeSubscription,
    sendTest,
  };
}