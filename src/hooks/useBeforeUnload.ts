import { useEffect, useCallback, useRef } from 'react';

interface BeforeUnloadConfig {
  hasUnsavedChanges: boolean;
  onFinalSave?: () => void;
  enabled?: boolean;
}

/**
 * Hook that warns users before closing the tab/window when there are unsaved changes.
 * Also triggers a final save attempt before the warning is shown.
 * 
 * Works on Chrome, Firefox, Safari, and Edge.
 * Note: Modern browsers ignore custom messages and show a generic warning.
 */
export function useBeforeUnload({
  hasUnsavedChanges,
  onFinalSave,
  enabled = true,
}: BeforeUnloadConfig): void {
  const hasUnsavedRef = useRef(hasUnsavedChanges);
  const onFinalSaveRef = useRef(onFinalSave);

  // Keep refs updated
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    onFinalSaveRef.current = onFinalSave;
  }, [onFinalSave]);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!hasUnsavedRef.current) return;

    // Attempt final save synchronously
    if (onFinalSaveRef.current) {
      try {
        onFinalSaveRef.current();
      } catch (error) {
        console.error('[useBeforeUnload] Final save failed:', error);
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
