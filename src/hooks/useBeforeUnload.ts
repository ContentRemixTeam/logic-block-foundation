import { useEffect, useCallback, useRef } from 'react';
import { emergencySave } from '@/lib/emergencySave';

interface BeforeUnloadConfig {
  hasUnsavedChanges: boolean;
  onFinalSave?: () => void;
  enabled?: boolean;
  // Emergency save config (Prompt 8)
  emergencyConfig?: {
    userId: string;
    pageType: string;
    pageId?: string;
    getData: () => any;
  };
}

/**
 * Hook that warns users before closing the tab/window when there are unsaved changes.
 * Also triggers a final save attempt before the warning is shown.
 * 
 * Now includes sendBeacon emergency save for guaranteed server-side backup (Prompt 8).
 * 
 * Works on Chrome, Firefox, Safari, and Edge.
 * Note: Modern browsers ignore custom messages and show a generic warning.
 */
export function useBeforeUnload({
  hasUnsavedChanges,
  onFinalSave,
  enabled = true,
  emergencyConfig,
}: BeforeUnloadConfig): void {
  const hasUnsavedRef = useRef(hasUnsavedChanges);
  const onFinalSaveRef = useRef(onFinalSave);
  const emergencyConfigRef = useRef(emergencyConfig);

  // Keep refs updated
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    onFinalSaveRef.current = onFinalSave;
  }, [onFinalSave]);

  useEffect(() => {
    emergencyConfigRef.current = emergencyConfig;
  }, [emergencyConfig]);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!hasUnsavedRef.current) return;

    // Attempt final save synchronously (localStorage)
    if (onFinalSaveRef.current) {
      try {
        onFinalSaveRef.current();
      } catch (error) {
        console.error('[useBeforeUnload] Final save failed:', error);
      }
    }

    // Emergency save via sendBeacon (Prompt 8)
    if (emergencyConfigRef.current) {
      const { userId, pageType, pageId, getData } = emergencyConfigRef.current;
      try {
        const data = getData();
        if (data && userId) {
          emergencySave(userId, pageType, data, 'beforeunload', pageId);
        }
      } catch (error) {
        console.error('[useBeforeUnload] Emergency save failed:', error);
      }
    }

    // Standard way to trigger browser warning
    e.preventDefault();
    // Required for some browsers (Chrome)
    e.returnValue = '';
    // Return value for older browsers
    return '';
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, handleBeforeUnload]);
}
