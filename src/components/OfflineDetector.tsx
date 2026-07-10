import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function OfflineDetector() {
  const { toast } = useToast();
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handleOnline = () => {
      // Don't show on initial page load if already online
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      
      toast({
        title: "Back online",
        description: "Your connection is back. We'll sync any changes you made.",
        duration: 4000,
      });
    };

    const handleOffline = () => {
      isFirstRender.current = false;

      toast({
        title: "Connection dropped",
        description: "Your work is protected on this device and will sync when you're back online.",
        duration: 8000,
      });
    };


    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Mark as not first render after mount
    isFirstRender.current = false;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return null; // This component only handles side effects
}
