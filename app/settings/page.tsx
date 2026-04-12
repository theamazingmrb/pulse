'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/auth-guard';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import { TIME_OPTIONS } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Clock, ListTodo, Moon, Sun, Trash2, Loader2, Compass, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getNorthStar } from '@/lib/north-star';
import { getCoreValues } from '@/lib/core-values';

function SettingsPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    isSupported,
    permission,
    isLoading,
    isSubscribed,
    preferences,
    subscriptions,
    requestPermission,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    removeSubscription,
    sendTest,
  } = useNotifications();

  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Intention & Values
  const [northStar, setNorthStar] = useState<string | null>(null);
  const [coreValuesCount, setCoreValuesCount] = useState(0);

  // Sync local prefs with hook prefs
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);
  
  // Load Intention data
  useEffect(() => {
    if (user) {
      loadIntentionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  async function loadIntentionData() {
    if (!user) return;
    const [ns, cv] = await Promise.all([
      getNorthStar(user.id),
      getCoreValues(user.id),
    ]);
    setNorthStar(ns?.content || null);
    setCoreValuesCount(cv.length);
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  // Handle notification toggle
  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (localPrefs.notifications_enabled) {
        // Currently enabled, disable it
        const result = await disableNotifications();
        if (!result.success) {
          toast.error(result.error || 'Failed to disable notifications');
        } else {
          toast.success('Notifications disabled');
        }
      } else {
        // Currently disabled, enable it
        if (!isSupported) {
          toast.error('Push notifications are not supported in this browser');
          return;
        }
        
        if (permission !== 'granted') {
          const perm = await requestPermission();
          if (perm !== 'granted') {
            toast.error('Notification permission denied. Please allow notifications in your browser settings.');
            return;
          }
        }
        
        const result = await enableNotifications();
        if (!result.success) {
          toast.error(result.error || 'Failed to enable notifications');
        } else {
          toast.success('Notifications enabled! You\'ll receive reminders based on your preferences.');
        }
      }
    } finally {
      setIsToggling(false);
    }
  };

  // Handle preference change
  const handlePrefChange = async (
    key: keyof typeof localPrefs, 
    value: boolean | string | number
  ) => {
    const newPrefs = { ...localPrefs, [key]: value };
    setLocalPrefs(newPrefs);
    
    setIsSaving(true);
    try {
      const result = await updatePreferences({ [key]: value });
      if (!result.success) {
        toast.error(result.error || 'Failed to save preference');
        // Revert on error
        setLocalPrefs(localPrefs);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle test notification
  const handleTestNotification = async () => {
    const success = await sendTest(
      'Test Notification',
      'If you see this, notifications are working!'
    );
    
    if (success) {
      toast.success('Test notification sent!');
    } else {
      toast.error('Failed to send test notification. Check browser permissions.');
    }
  };

  // Handle remove subscription
  const handleRemoveSubscription = async (id: string) => {
    const result = await removeSubscription(id);
    if (result.success) {
      toast.success('Device removed');
    } else {
      toast.error(result.error || 'Failed to remove device');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your notification preferences and account settings.
        </p>
      </div>

      {/* Intention & Values */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" />
            Intention & Values
          </CardTitle>
          <CardDescription>
            Your North Star and Core Values guide your decisions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/intention"
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Compass size={16} className="text-amber-500" />
                <Sparkles size={16} className="text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {northStar ? 'View & Edit' : 'Set Your Intentions'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {northStar 
                    ? `${coreValuesCount} value${coreValuesCount !== 1 ? 's' : ''} set` 
                    : 'Define your guiding principles'}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Notification Support Warning */}
      {!isSupported && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Your browser doesn&apos;t support push notifications. 
              Try Chrome, Firefox, Edge, or Safari for the full experience.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Notifications Toggle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {localPrefs.notifications_enabled ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get reminders for check-ins, tasks, and reflections throughout your day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications-toggle">
                {localPrefs.notifications_enabled ? 'Enabled' : 'Disabled'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied' 
                  ? 'Permission blocked. Allow notifications in your browser settings.'
                  : permission === 'default'
                    ? 'Click to enable and grant permission'
                    : isSubscribed 
                      ? 'You\'re receiving notifications on this device'
                      : 'Enable to start receiving notifications'
                }
              </p>
            </div>
            <Switch
              id="notifications-toggle"
              checked={localPrefs.notifications_enabled && isSubscribed}
              disabled={isToggling || !isSupported}
              onCheckedChange={handleToggle}
            />
          </div>
          
          {/* Test Notification Button */}
          {localPrefs.notifications_enabled && permission === 'granted' && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
              >
                Send Test Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Reminders */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Check-in Reminders
          </CardTitle>
          <CardDescription>
            Get reminded to check in throughout your day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning Check-in */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-yellow-500" />
              <div>
                <Label>Morning Check-in</Label>
                <p className="text-xs text-muted-foreground">Start your day with intention</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={localPrefs.morning_checkin_time}
                onValueChange={(value) => handlePrefChange('morning_checkin_time', value)}
                disabled={!localPrefs.morning_checkin_enabled || isSaving}
              >
                <SelectTrigger className="w-20 sm:w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter(t => t.value >= '06:00' && t.value <= '10:00').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Switch
                checked={localPrefs.morning_checkin_enabled}
                onCheckedChange={(checked) => handlePrefChange('morning_checkin_enabled', checked)}
                disabled={!localPrefs.notifications_enabled}
              />
            </div>
          </div>

          {/* Midday Check-in */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-orange-500" />
              <div>
                <Label>Midday Check-in</Label>
                <p className="text-xs text-muted-foreground">Recalibrate at noon</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={localPrefs.midday_checkin_time}
                onValueChange={(value) => handlePrefChange('midday_checkin_time', value)}
                disabled={!localPrefs.midday_checkin_enabled || isSaving}
              >
                <SelectTrigger className="w-20 sm:w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter(t => t.value >= '11:00' && t.value <= '14:00').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Switch
                checked={localPrefs.midday_checkin_enabled}
                onCheckedChange={(checked) => handlePrefChange('midday_checkin_enabled', checked)}
                disabled={!localPrefs.notifications_enabled}
              />
            </div>
          </div>

          {/* Evening Check-in */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-blue-500" />
              <div>
                <Label>Evening Check-in</Label>
                <p className="text-xs text-muted-foreground">End your day with reflection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={localPrefs.evening_checkin_time}
                onValueChange={(value) => handlePrefChange('evening_checkin_time', value)}
                disabled={!localPrefs.evening_checkin_enabled || isSaving}
              >
                <SelectTrigger className="w-20 sm:w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter(t => t.value >= '18:00' && t.value <= '22:00').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Switch
                checked={localPrefs.evening_checkin_enabled}
                onCheckedChange={(checked) => handlePrefChange('evening_checkin_enabled', checked)}
                disabled={!localPrefs.notifications_enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Task Notifications
          </CardTitle>
          <CardDescription>
            Stay on top of your scheduled tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Task Start Reminder */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Task Start Reminder</Label>
              <p className="text-xs text-muted-foreground">
                Get notified before a task starts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(localPrefs.task_start_minutes_before)}
                onValueChange={(value) => handlePrefChange('task_start_minutes_before', parseInt(value))}
                disabled={!localPrefs.task_start_enabled || isSaving}
              >
                <SelectTrigger className="w-28 sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 min before</SelectItem>
                  <SelectItem value="10">10 min before</SelectItem>
                  <SelectItem value="15">15 min before</SelectItem>
                  <SelectItem value="30">30 min before</SelectItem>
                </SelectContent>
              </Select>
              <Switch
                checked={localPrefs.task_start_enabled}
                onCheckedChange={(checked) => handlePrefChange('task_start_enabled', checked)}
                disabled={!localPrefs.notifications_enabled}
              />
            </div>
          </div>

          {/* Overdue Task Warning */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Overdue Task Warnings</Label>
              <p className="text-xs text-muted-foreground">
                Daily reminder for overdue tasks
              </p>
            </div>
            <Switch
              checked={localPrefs.overdue_task_enabled}
              onCheckedChange={(checked) => handlePrefChange('overdue_task_enabled', checked)}
              disabled={!localPrefs.notifications_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reflection Reminder */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Reflection Reminder
          </CardTitle>
          <CardDescription>
            Evening prompt for daily reflection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Daily Reflection</Label>
              <p className="text-xs text-muted-foreground">
                Remind yourself to reflect on your day
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={localPrefs.reflection_time}
                onValueChange={(value) => handlePrefChange('reflection_time', value)}
                disabled={!localPrefs.reflection_enabled || isSaving}
              >
                <SelectTrigger className="w-20 sm:w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter(t => t.value >= '19:00' && t.value <= '23:00').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Switch
                checked={localPrefs.reflection_enabled}
                onCheckedChange={(checked) => handlePrefChange('reflection_enabled', checked)}
                disabled={!localPrefs.notifications_enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Devices */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Registered Devices
            </CardTitle>
            <CardDescription>
              Devices that will receive your notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div 
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{sub.device_name || 'Unknown Device'}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSubscription(sub.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsPageContent />
    </AuthGuard>
  );
}