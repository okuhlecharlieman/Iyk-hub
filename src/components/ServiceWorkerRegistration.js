'use client';
/**
 * ServiceWorkerRegistration component.
 */
import { useEffect } from 'react';

/** ServiceWorkerRegistration React component. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'activated' &&
                  navigator.serviceWorker.controller
                ) {
                  // New SW activated; content updated
                }
              });
            }
          });
        })
        .catch(() => {
          // SW registration failed
        });
    }
  }, []);

  return null;
}
