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
        title: "Back Online",
        description: "Your connection has been restored. You can now sync your data.",
        duration: 4000,
      });
    };

    const handleOffline = () => {
      isFirstRender.current = false;
      
      toast({
        title: "Connection Lost",
        description: "You're offline. Your work is saved locally. Please reconnect to sync to the cloud.",
        variant: "destructive", 
        duration: 15000,
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
