import { useEffect, useRef } from 'react';

export function OfflineDetector() {
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handleOnline = () => {
      // Don't show on initial page load if already online
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      
      // User-visible status is consolidated into OfflineIndicator.
    };

    const handleOffline = () => {
      isFirstRender.current = false;
      // User-visible status is consolidated into OfflineIndicator.
    };


    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Mark as not first render after mount
    isFirstRender.current = false;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // This component only handles side effects
}
