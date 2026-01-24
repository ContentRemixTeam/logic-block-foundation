import { useEffect, useRef, useCallback } from 'react';
import { emergencySave } from '@/lib/emergencySave';

interface MobileProtectionConfig<T> {
  getData: () => T | null;
  onSave: (data: T) => void | Promise<void>;
  enabled?: boolean;
  // Emergency save config (Prompt 8)
  emergencyConfig?: {
    userId: string;
    pageType: string;
    pageId?: string;
  };
}

/**
 * Hook for mobile-specific data protection.
 * Saves data when the tab is backgrounded or the page is about to be hidden.
 * 
 * Now includes sendBeacon emergency save for guaranteed server-side backup (Prompt 8).
 * 
 * Listens to:
 * - `visibilitychange` - Fires when tab is backgrounded/foregrounded
 * - `pagehide` - More reliable on iOS Safari (fires before page is cached)
 * 
 * Works on iOS Safari, Android Chrome, and all desktop browsers.
 */
export function useMobileProtection<T>({
  getData,
  onSave,
  enabled = true,
  emergencyConfig,
}: MobileProtectionConfig<T>): void {
  const getDataRef = useRef(getData);
  const onSaveRef = useRef(onSave);
  const emergencyConfigRef = useRef(emergencyConfig);
  const isUnmountingRef = useRef(false);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    getDataRef.current = getData;
  }, [getData]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    emergencyConfigRef.current = emergencyConfig;
  }, [emergencyConfig]);

  const performSave = useCallback((source: 'visibilitychange' | 'pagehide') => {
    if (isUnmountingRef.current) return;
    
    const data = getDataRef.current();
    if (!data) return;

    try {
      // Call onSave - if it returns a Promise, we fire-and-forget
      // since we can't reliably await in visibilitychange/pagehide
      const result = onSaveRef.current(data);
      
      // If it's a Promise, catch any errors silently
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('[useMobileProtection] Async save failed:', error);
        });
      }
    } catch (error) {
      console.error('[useMobileProtection] Save failed:', error);
    }

    // Emergency save via sendBeacon (Prompt 8)
    if (emergencyConfigRef.current) {
      const { userId, pageType, pageId } = emergencyConfigRef.current;
      if (userId) {
        emergencySave(userId, pageType, data as any, source, pageId);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    /**
     * Handles tab being backgrounded.
     * This is the primary trigger for saving on mobile.
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        performSave('visibilitychange');
      }
    };

    /**
     * Handles page being hidden (more reliable on iOS).
     * The `persisted` property indicates if page will be cached (bfcache).
     */
    const handlePageHide = (e: PageTransitionEvent) => {
      // Always save, regardless of whether page is cached
      performSave('pagehide');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isUnmountingRef.current = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, performSave]);
}
