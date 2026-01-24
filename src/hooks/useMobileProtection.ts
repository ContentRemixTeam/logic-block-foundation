import { useEffect, useRef, useCallback } from 'react';

interface MobileProtectionConfig<T> {
  getData: () => T | null;
  onSave: (data: T) => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Hook for mobile-specific data protection.
 * Saves data when the tab is backgrounded or the page is about to be hidden.
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
}: MobileProtectionConfig<T>): void {
  const getDataRef = useRef(getData);
  const onSaveRef = useRef(onSave);
  const isUnmountingRef = useRef(false);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    getDataRef.current = getData;
  }, [getData]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const performSave = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (!enabled) return;

    /**
     * Handles tab being backgrounded.
     * This is the primary trigger for saving on mobile.
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        performSave();
      }
    };

    /**
     * Handles page being hidden (more reliable on iOS).
     * The `persisted` property indicates if page will be cached (bfcache).
     */
    const handlePageHide = (e: PageTransitionEvent) => {
      // Always save, regardless of whether page is cached
      performSave();
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
