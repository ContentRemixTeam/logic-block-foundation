import { useState, useEffect } from 'react';

/**
 * Tracks online/offline state. The user-visible surface for this is the
 * single compact OfflineIndicator in the top bar (see Layout.tsx) — this
 * hook intentionally does NOT fire its own toasts to avoid stacking 3+
 * "you're offline" messages from different subsystems.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

