/**
 * Lightweight hook for protecting modal/dialog form drafts
 * Uses bulletproof storage with multi-layer fallback
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getStorageItem, 
  setStorageItem, 
  removeStorageItem,
  emergencyBackupToIDB,
  restoreFromIDB,
  clearEmergencyBackup,
  isStorageLimited
} from '@/lib/storage';

interface DraftProtectionConfig {
  localStorageKey: string;
  enabled?: boolean;
  maxAge?: number; // Max age in ms, defaults to 24 hours
}

interface DraftData<T> {
  data: T;
  timestamp: string;
}

export function useFormDraftProtection<T extends Record<string, any>>({
  localStorageKey,
  enabled = true,
  maxAge = 24 * 60 * 60 * 1000, // 24 hours
}: DraftProtectionConfig) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const dataRef = useRef<T | null>(null);
  const hasUnsavedRef = useRef(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;
    
    const checkDraft = async () => {
      try {
        // Try regular storage first
        let stored = getStorageItem(localStorageKey);
        let parsed: DraftData<T> | null = null;
        
        if (stored) {
          parsed = JSON.parse(stored) as DraftData<T>;
        } else {
          // Fallback to IndexedDB for Safari private browsing
          const idbData = await restoreFromIDB(localStorageKey);
          if (idbData) {
            parsed = idbData as DraftData<T>;
          }
        }
        
        if (parsed) {
          // Check if draft is within max age
          const age = Date.now() - new Date(parsed.timestamp).getTime();
          if (age < maxAge) {
            setHasDraft(true);
            setDraftTimestamp(parsed.timestamp);
          } else {
            // Clear stale draft from all layers
            removeStorageItem(localStorageKey);
            await clearEmergencyBackup(localStorageKey);
          }
        }
      } catch (e) {
        console.error('Error checking draft:', e);
      }
    };
    
    checkDraft();
  }, [localStorageKey, enabled, maxAge]);

  // Save draft to storage (multi-layer)
  const saveDraft = useCallback(async (data: T) => {
    if (!enabled) return;
    
    dataRef.current = data;
    hasUnsavedRef.current = true;
    
    const draftData: DraftData<T> = {
      data,
      timestamp: new Date().toISOString(),
    };
    
    const jsonStr = JSON.stringify(draftData);
    
    // Save to primary storage
    const success = setStorageItem(localStorageKey, jsonStr);
    setHasDraft(true);
    
    // Also save to IndexedDB if storage is limited
    if (isStorageLimited() || !success) {
      await emergencyBackupToIDB(localStorageKey, draftData);
    }
  }, [localStorageKey, enabled]);

  // Load draft from storage (with fallback)
  const loadDraft = useCallback(async (): Promise<T | null> => {
    if (!enabled) return null;
    
    try {
      // Try regular storage first
      const stored = getStorageItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DraftData<T>;
        return parsed.data;
      }
      
      // Fallback to IndexedDB
      const idbData = await restoreFromIDB(localStorageKey);
      if (idbData) {
        return (idbData as DraftData<T>).data;
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
    return null;
  }, [localStorageKey, enabled]);

  // Clear draft from all storage layers
  const clearDraft = useCallback(async () => {
    if (!enabled) return;
    
    removeStorageItem(localStorageKey);
    await clearEmergencyBackup(localStorageKey);
    setHasDraft(false);
    setDraftTimestamp(null);
    hasUnsavedRef.current = false;
    dataRef.current = null;
  }, [localStorageKey, enabled]);

  // Mark as saved (clears unsaved state without removing draft)
  const markSaved = useCallback(() => {
    hasUnsavedRef.current = false;
  }, []);

  // Visibility change handler (Safari/iOS backup)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedRef.current && dataRef.current) {
        // Synchronously save when page is hidden
        const draftData: DraftData<T> = {
          data: dataRef.current,
          timestamp: new Date().toISOString(),
        };
        setStorageItem(localStorageKey, JSON.stringify(draftData));
      }
    };

    // pagehide is more reliable on iOS
    const handlePageHide = () => {
      if (hasUnsavedRef.current && dataRef.current) {
        const draftData: DraftData<T> = {
          data: dataRef.current,
          timestamp: new Date().toISOString(),
        };
        // Direct localStorage for sync save
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(draftData));
        } catch {
          // Fallback already handled
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, localStorageKey]);

  // Beforeunload warning (desktop browsers)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current && dataRef.current) {
        // Final save attempt
        const draftData: DraftData<T> = {
          data: dataRef.current,
          timestamp: new Date().toISOString(),
        };
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(draftData));
        } catch {
          // Already in memory fallback
        }
        
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, localStorageKey]);

  return {
    hasDraft,
    draftTimestamp,
    saveDraft,
    loadDraft,
    clearDraft,
    markSaved,
  };
}
