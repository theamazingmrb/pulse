/// <reference lib="webworker" />
// Priority Compass Service Worker for Push Notifications

const SNOOZE_DELAY_MINUTES = 10;

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;
  
  // Handle action buttons
  if (action === 'snooze') {
    // Schedule a new notification in 10 minutes
    console.log('Snooze requested for:', data.type);
    scheduleSnooze(data);
    return;
  }
  
  if (action === 'dismiss') {
    return;
  }
  
  // Default click: open or focus the app
  const urlToOpen = data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the relevant page and focus
            if (data.url) {
              client.navigate(data.url);
            }
            return client.focus();
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Schedule a snoozed notification
async function scheduleSnooze(data) {
  // For now, we'll use setTimeout to schedule locally
  // In production, this would be better handled server-side
  const title = data.title || 'Priority Compass';
  const options = {
    body: data.body || 'Reminder',
    icon: '/icon-192.svg',
    badge: '/badge-72.svg',
    tag: `snooze-${data.type}-${Date.now()}`,
    data: { ...data, snoozed: true },
    actions: getDefaultActions(data.type),
    requireInteraction: true,
  };
  
  // Store snooze intent for when the service worker wakes up
  // This is a simplified approach - production would use Background Sync API
  const snoozeTime = Date.now() + (SNOOZE_DELAY_MINUTES * 60 * 1000);
  
  try {
    // Store in IndexedDB or similar for persistence
    const cache = await caches.open('snoozed-notifications');
    await cache.put(
      new Request(`snooze:${snoozeTime}`),
      new Response(JSON.stringify({ ...options, title }))
    );
    
    // Schedule using setTimeout (limited but works while SW is active)
    setTimeout(() => {
      self.registration.showNotification(title, options);
    }, SNOOZE_DELAY_MINUTES * 60 * 1000);
  } catch (error) {
    console.error('Failed to schedule snooze:', error);
  }
}

// Background sync for offline notification queueing (future feature)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    console.log('Background sync triggered for notifications');
  }
});

// Push event handling
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, url, actions, type } = data;
    
    const options = {
      body,
      icon: icon || '/icon-192.svg',
      badge: badge || '/badge-72.svg',
      tag: tag || 'default',
      data: { url, ...data },
      actions: actions || getDefaultActions(type),
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

// Get default actions based on notification type
function getDefaultActions(type) {
  switch (type) {
    case 'morning_checkin':
    case 'midday_checkin':
    case 'evening_checkin':
      return [
        { action: 'open', title: 'Check In' },
        { action: 'snooze', title: 'In 10 min' },
      ];
    case 'task_start':
      return [
        { action: 'open', title: 'Start Task' },
        { action: 'snooze', title: 'Snooze 5 min' },
      ];
    case 'overdue_task':
      return [
        { action: 'open', title: 'View Tasks' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'reflection':
      return [
        { action: 'open', title: 'Reflect' },
        { action: 'snooze', title: 'Later' },
      ];
    default:
      return [{ action: 'open', title: 'Open' }];
  }
}

// Service worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});