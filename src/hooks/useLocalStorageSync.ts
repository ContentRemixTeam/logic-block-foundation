import { useCallback, useMemo } from 'react';
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  emergencyBackupToIDB,
  restoreFromIDB,
  clearEmergencyBackup,
  isStorageLimited,
} from '@/lib/storage';
import {
  saveDraftToIDB,
  loadDraftFromIDB,
  deleteDraftFromIDB,
  getDraftWithMetadata,
} from '@/lib/offlineDb';

interface LocalStorageSyncConfig {
  key: string;
  enableIndexDBFallback?: boolean;
}

interface LocalStorageSyncReturn<T> {
  save: (data: T) => Promise<boolean>;
  load: () => Promise<T | null>;
  clear: () => Promise<void>;
  isStorageLimited: boolean;
  getTimestamp: () => Promise<number | null>;
}

/**
 * Hook for immediate localStorage synchronization with multi-layer fallback.
 * Saves data with 0ms delay (synchronous) to localStorage, with automatic
 * fallback to sessionStorage, memory, and IndexedDB.
 * 
 * ENHANCED (Prompt 7): Now ALWAYS saves to IndexedDB in parallel with localStorage
 * for 50MB+ storage capacity and Safari private mode support.
 * 
 * Works on all browsers including Safari private browsing mode.
 */
export function useLocalStorageSync<T extends Record<string, any>>({
  key,
  enableIndexDBFallback = true,
}: LocalStorageSyncConfig): LocalStorageSyncReturn<T> {
  
  const storageLimited = useMemo(() => isStorageLimited(), []);

  /**
   * Immediately saves data to localStorage AND IndexedDB in parallel.
   * Returns true if at least one save was successful, false otherwise.
   */
  const save = useCallback(async (data: T): Promise<boolean> => {
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        version: '2.0',
      };
      
      const jsonStr = JSON.stringify(backup);
      
      // Primary: Use safe storage (handles fallbacks automatically)
      const localStorageSuccess = setStorageItem(key, jsonStr);
      
      // ENHANCED (Prompt 7): ALWAYS save to IndexedDB in parallel for redundancy
      // This provides 50MB+ storage and works in Safari private mode
      let idbSuccess = false;
      if (enableIndexDBFallback) {
        // Use both the drafts store (for structured access) and emergency backup
        const [draftResult, emergencyResult] = await Promise.all([
          saveDraftToIDB(key, backup),
          emergencyBackupToIDB(key, backup),
        ]);
        idbSuccess = draftResult || emergencyResult;
      }
      
      // Log for debugging
      if (!localStorageSuccess && !idbSuccess) {
        console.warn('[useLocalStorageSync] All storage methods failed for key:', key);
      }
      
      return localStorageSuccess || idbSuccess;
    } catch (error) {
      console.error('[useLocalStorageSync] Save failed:', error);
      return false;
    }
  }, [key, enableIndexDBFallback]);

  /**
   * Loads data with priority: localStorage → IndexedDB drafts → IndexedDB emergency → null
   * Returns null if no data found or parse error.
   */
  const load = useCallback(async (): Promise<T | null> => {
    try {
      // Priority 1: Try localStorage first (fastest)
      const stored = getStorageItem(key);
      if (stored) {
        try {
          const backup = JSON.parse(stored);
          return backup.data as T;
        } catch {
          // Corrupted data, continue to fallbacks
          console.warn('[useLocalStorageSync] Corrupted localStorage data, trying IDB');
        }
      }
      
      // Priority 2: Try IndexedDB drafts store
      if (enableIndexDBFallback) {
        const idbDraft = await loadDraftFromIDB(key);
        if (idbDraft) {
          console.log('[useLocalStorageSync] Restored from IndexedDB drafts store');
          return idbDraft.data as T;
        }
        
        // Priority 3: Try IndexedDB emergency backup
        const idbBackup = await restoreFromIDB(key);
        if (idbBackup) {
          console.log('[useLocalStorageSync] Restored from IndexedDB emergency backup');
          return idbBackup.data as T;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[useLocalStorageSync] Load failed:', error);
      return null;
    }
  }, [key, enableIndexDBFallback]);

  /**
   * Get timestamp of the most recent save
   */
  const getTimestamp = useCallback(async (): Promise<number | null> => {
    try {
      // Check localStorage first
      const stored = getStorageItem(key);
      if (stored) {
        try {
          const backup = JSON.parse(stored);
          if (backup.timestamp) {
            return new Date(backup.timestamp).getTime();
          }
        } catch {
          // Continue to IDB
        }
      }
      
      // Check IndexedDB drafts
      if (enableIndexDBFallback) {
        const draft = await getDraftWithMetadata(key);
        if (draft?.timestamp) {
          return draft.timestamp;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }, [key, enableIndexDBFallback]);

  /**
   * Clears data from all storage layers.
   */
  const clear = useCallback(async (): Promise<void> => {
    try {
      removeStorageItem(key);
      
      if (enableIndexDBFallback) {
        await Promise.all([
          deleteDraftFromIDB(key),
          clearEmergencyBackup(key),
        ]);
      }
    } catch (error) {
      console.error('[useLocalStorageSync] Clear failed:', error);
    }
  }, [key, enableIndexDBFallback]);

  return {
    save,
    load,
    clear,
    isStorageLimited: storageLimited,
    getTimestamp,
  };
}
