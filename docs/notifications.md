# Push Notifications Setup Guide

This guide covers the complete setup for push notifications in Priority Compass.

## Overview

Push notifications are implemented using:
- **Web Push API** - Browser standard for push notifications
- **Service Worker** - Handles push events and notification clicks
- **Supabase Edge Functions** - Server-side scheduling and delivery
- **VAPID Keys** - Authentication for web push

## Prerequisites

1. VAPID keys generated
2. Supabase Edge Functions deployed
3. Cron jobs configured

## Quick Setup

### 1. Generate VAPID Keys

```bash
node scripts/generate-vapid-keys.js
```

Add the output to your `.env` file:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_SUBJECT=mailto:support@prioritycompass.app
CRON_SECRET=<random-secret>
```

### 2. Configure Supabase Environment

In your Supabase project dashboard:
1. Go to Settings → Edge Functions
2. Add the following secrets:
   - `VAPID_PUBLIC_KEY` - Your public VAPID key
   - `VAPID_PRIVATE_KEY` - Your private VAPID key
   - `CRON_SECRET` - Your cron authentication secret

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy send-notifications
```

### 4. Configure Cron Jobs

In Supabase dashboard:
1. Go to Database → Cron
2. Add the following cron jobs:

#### Morning Check-in (8:00 AM PT)
```sql
SELECT cron.schedule(
  'morning_checkin_notifications',
  '0 15 * * *', -- 15:00 UTC = 8:00 AM PT
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project>.supabase.co/functions/v1/send-notifications?type=morning_checkin',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

#### Midday Check-in (12:00 PM PT)
```sql
SELECT cron.schedule(
  'midday_checkin_notifications',
  '0 19 * * *', -- 19:00 UTC = 12:00 PM PT
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project>.supabase.co/functions/v1/send-notifications?type=midday_checkin',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

#### Evening Check-in (8:00 PM PT)
```sql
SELECT cron.schedule(
  'evening_checkin_notifications',
  '0 3 * * *', -- 3:00 UTC = 8:00 PM PT (previous day)
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project>.supabase.co/functions/v1/send-notifications?type=evening_checkin',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

#### Task Start Reminders (Every 15 minutes)
```sql
SELECT cron.schedule(
  'task_start_notifications',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project>.supabase.co/functions/v1/send-notifications?type=task_start',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

#### Overdue Task Warnings (9:00 AM PT)
```sql
SELECT cron.schedule(
  'overdue_task_notifications',
  '0 16 * * *', -- 16:00 UTC = 9:00 AM PT
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project>.supabase.co/functions/v1/send-notifications?type=overdue_task',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

#### Daily Reflection Reminder (9:00 PM PT)
```sql
SELECT cron.schedule(
  'reflection_notifications',
  '0 4 * * *', -- 4:00 UTC = 9:00 PM PT (previous day)
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project>.supabase.co/functions/v1/send-notifications?type=reflection',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## Notification Types

### Check-in Reminders
- **Morning**: Default 8:00 AM - "Start your day with intention"
- **Midday**: Default 12:00 PM - "Recalibrate at noon"
- **Evening**: Default 8:00 PM - "End your day with reflection"

### Task Notifications
- **Task Start**: Remind X minutes before scheduled task (configurable)
- **Overdue Tasks**: Daily digest of overdue tasks

### Reflection Reminder
- **Daily Reflection**: Default 9:00 PM - "Reflect on your day"

## User Preferences

Users can customize:
- Enable/disable notifications globally
- Toggle each notification type
- Set preferred times for check-ins
- Set lead time for task start reminders
- Manage registered devices

Settings are stored in `notification_preferences` table and managed via the Settings page.

## Testing

### Local Testing

1. Run the dev server:
```bash
npm run dev
```

2. Open the app and navigate to Settings
3. Enable notifications and grant permission
4. Click "Send Test Notification"

### Manual Edge Function Test

```bash
curl -X POST \
  'https://<your-project>.supabase.co/functions/v1/send-notifications?type=morning_checkin' \
  -H 'Authorization: Bearer <CRON_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Architecture

```
User Browser                    Supabase
    │                              │
    │ 1. Register SW & Subscribe   │
    │─────────────────────────────>│
    │                              │
    │ 2. Store subscription         │
    │    in push_subscriptions      │
    │                              │
    │                              │
[Cron Job triggers]               │
    │                              │
    │ 3. Edge Function             │
    │    sends push                 │
    │                              │
    │ 4. Push notification          │
    │<─────────────────────────────│
    │                              │
    │ 5. User clicks               │
    │    notification               │
    │                              │
    │ 6. SW handles click           │
    │    → Opens app to URL         │
    │                              │
```

## Troubleshooting

### Notifications not showing
1. Check browser permissions (Settings → Site settings → Notifications)
2. Verify VAPID keys are correct
3. Check service worker is registered (DevTools → Application → Service Workers)
4. Ensure push subscription exists in database

### Permission denied
- User blocked notifications in browser
- Guide user to browser settings to allow

### Service worker not registering
- Check `/public/sw.js` exists
- Verify manifest.json has correct permissions
- Clear browser cache and retry

### Edge function errors
- Check Supabase logs: Dashboard → Edge Functions → Logs
- Verify environment variables are set
- Ensure CRON_SECRET matches between cron and function

## Files

- `/lib/notifications.ts` - Client-side notification utilities
- `/hooks/useNotifications.ts` - React hook for notification state
- `/hooks/useServiceWorker.ts` - Service worker registration hook
- `/components/ServiceWorkerRegistration.tsx` - SW registration component
- `/components/notification-prompt.tsx` - Permission prompt UI
- `/app/settings/page.tsx` - Notification settings page
- `/public/sw.js` - Service worker for push handling
- `/supabase/functions/send-notifications/index.ts` - Edge function
- `/supabase/migrations/20260403000000_notification_settings.sql` - Database schema