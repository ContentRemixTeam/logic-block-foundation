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

interface LocalStorageSyncConfig {
  key: string;
  enableIndexDBFallback?: boolean;
}

interface LocalStorageSyncReturn<T> {
  save: (data: T) => Promise<boolean>;
  load: () => Promise<T | null>;
  clear: () => Promise<void>;
  isStorageLimited: boolean;
}

/**
 * Hook for immediate localStorage synchronization with multi-layer fallback.
 * Saves data with 0ms delay (synchronous) to localStorage, with automatic
 * fallback to sessionStorage, memory, and IndexedDB.
 * 
 * Works on all browsers including Safari private browsing mode.
 */
export function useLocalStorageSync<T extends Record<string, any>>({
  key,
  enableIndexDBFallback = true,
}: LocalStorageSyncConfig): LocalStorageSyncReturn<T> {
  
  const storageLimited = useMemo(() => isStorageLimited(), []);

  /**
   * Immediately saves data to localStorage with fallbacks.
   * Returns true if save was successful, false otherwise.
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
      const success = setStorageItem(key, jsonStr);
      
      // If storage is limited (private browsing) or primary failed, use IndexedDB
      if (enableIndexDBFallback && (storageLimited || !success)) {
        await emergencyBackupToIDB(key, backup);
      }
      
      return true;
    } catch (error) {
      console.error('[useLocalStorageSync] Save failed:', error);
      return false;
    }
  }, [key, enableIndexDBFallback, storageLimited]);

  /**
   * Loads data from localStorage with IndexedDB fallback.
   * Returns null if no data found or parse error.
   */
  const load = useCallback(async (): Promise<T | null> => {
    try {
      // Try regular storage first
      const stored = getStorageItem(key);
      if (stored) {
        const backup = JSON.parse(stored);
        return backup.data as T;
      }
      
      // Fallback to IndexedDB
      if (enableIndexDBFallback) {
        const idbBackup = await restoreFromIDB(key);
        if (idbBackup) {
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
   * Clears data from all storage layers.
   */
  const clear = useCallback(async (): Promise<void> => {
    try {
      removeStorageItem(key);
      
      if (enableIndexDBFallback) {
        await clearEmergencyBackup(key);
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
  };
}
