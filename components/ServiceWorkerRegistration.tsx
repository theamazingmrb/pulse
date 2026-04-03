'use client';

import { useEffect } from 'react';

/**
 * Component to register service worker on client-side
 * This enables push notifications and offline capabilities
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, refresh to activate
                  console.log('New service worker available, please refresh.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
  
  return null;
}