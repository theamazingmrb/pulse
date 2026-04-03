// Notification types
export type NotificationType = 
  | 'morning_checkin'
  | 'midday_checkin'
  | 'evening_checkin'
  | 'task_start'
  | 'overdue_task'
  | 'reflection';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Master toggle
  notifications_enabled: boolean;
  
  // Check-in reminders
  morning_checkin_enabled: boolean;
  morning_checkin_time: string; // HH:MM:SS
  
  midday_checkin_enabled: boolean;
  midday_checkin_time: string;
  
  evening_checkin_enabled: boolean;
  evening_checkin_time: string;
  
  // Task notifications
  task_start_enabled: boolean;
  task_start_minutes_before: number;
  
  overdue_task_enabled: boolean;
  overdue_task_check_time: string;
  
  // Reflection reminder
  reflection_enabled: boolean;
  reflection_time: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  created_at: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  device_name?: string;
}

// Frontend notification preference form
export interface NotificationPreferencesForm {
  notifications_enabled: boolean;
  
  morning_checkin_enabled: boolean;
  morning_checkin_time: string; // HH:MM format
  
  midday_checkin_enabled: boolean;
  midday_checkin_time: string;
  
  evening_checkin_enabled: boolean;
  evening_checkin_time: string;
  
  task_start_enabled: boolean;
  task_start_minutes_before: number;
  
  overdue_task_enabled: boolean;
  
  reflection_enabled: boolean;
  reflection_time: string;
}

// Default preferences for new users
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesForm = {
  notifications_enabled: false,
  
  morning_checkin_enabled: true,
  morning_checkin_time: '08:00',
  
  midday_checkin_enabled: true,
  midday_checkin_time: '12:00',
  
  evening_checkin_enabled: true,
  evening_checkin_time: '20:00',
  
  task_start_enabled: true,
  task_start_minutes_before: 15,
  
  overdue_task_enabled: true,
  
  reflection_enabled: true,
  reflection_time: '21:00',
};

// Time options for select dropdowns
export const TIME_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '06:30', label: '6:30 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' },
];