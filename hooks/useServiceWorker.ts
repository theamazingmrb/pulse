'use client';

import { useEffect } from 'react';

/**
 * Hook to register service worker on client-side
 * Call this in your root layout or _app.tsx
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
}

/**
 * Initialize service worker for push notifications
 * Call this once when the app loads
 */
export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker ready:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker not ready:', error);
    return null;
  }
}