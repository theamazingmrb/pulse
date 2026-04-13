'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

interface NotificationPromptProps {
  onDismiss?: () => void;
  showOnFirstCheckin?: boolean;
}

export function NotificationPrompt({ 
  onDismiss,
  showOnFirstCheckin = false 
}: NotificationPromptProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    requestPermission,
    enableNotifications,
    isLoading,
  } = useNotifications();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [hasBeenAsked, setHasBeenAsked] = useState(false);

  useEffect(() => {
    // Check if user has been asked before
    if (typeof window !== 'undefined') {
      const asked = localStorage.getItem('notification_prompt_asked');
      setHasBeenAsked(asked === 'true');
    }
  }, []);

  useEffect(() => {
    // Show prompt if:
    // 1. Notifications are supported
    // 2. Permission is default (not granted or denied)
    // 3. User hasn't been asked before
    // 4. User is logged in
    const shouldShow = isSupported && 
      permission === 'default' && 
      !hasBeenAsked && 
      user &&
      !isLoading;
    
    setIsVisible(Boolean(shouldShow && showOnFirstCheckin));
  }, [isSupported, permission, hasBeenAsked, user, isLoading, showOnFirstCheckin]);

  const handleEnable = async () => {
    if (!user) return;
    
    setIsEnabling(true);
    try {
      const perm = await requestPermission();
      
      if (perm === 'granted') {
        const result = await enableNotifications();
        if (result.success) {
          setIsVisible(false);
        }
      }
      
      // Mark as asked regardless of outcome
      localStorage.setItem('notification_prompt_asked', 'true');
      setHasBeenAsked(true);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_asked', 'true');
    setHasBeenAsked(true);
    setIsVisible(false);
    onDismiss?.();
  };

  const handleSettings = () => {
    router.push('/settings');
    handleDismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Stay on track</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Get reminders for check-ins, tasks, and daily reflections.
          </p>
          
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSettings}
            >
              Customize
            </Button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-muted rounded"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// Permission banner for when permission was denied
export function NotificationPermissionBanner() {
  const { isSupported, permission, isLoading } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if permission was explicitly denied
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('notification_banner_dismissed');
      setIsVisible(isSupported && permission === 'denied' && dismissed !== 'true');
    }
  }, [isSupported, permission, isLoading]);

  const handleDismiss = () => {
    localStorage.setItem('notification_banner_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Notifications are blocked. Enable them in your browser settings to receive reminders.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-yellow-600 dark:text-yellow-400 hover:opacity-80"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}