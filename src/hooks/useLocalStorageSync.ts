import { useCallback, useMemo, useRef } from 'react';
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
import { useCrossTabSync } from '@/hooks/useCrossTabSync';

export interface ConflictInfo<T = Record<string, unknown>> {
  local: {
    data: T;
    timestamp: number;
    tabId?: string;
  };
  remote: {
    data: T;
    timestamp: number;
    source?: string;
  };
  pageType: string;
  pageId?: string;
}

interface LocalStorageSyncConfig<T = Record<string, unknown>> {
  key: string;
  enableIndexDBFallback?: boolean;
  /** Enable cross-tab synchronization */
  enableCrossTabSync?: boolean;
  /** Called when another tab updates the data */
  onRemoteUpdate?: (data: T) => void;
  /** Called when a conflict is detected between tabs - provides full conflict info */
  onConflict?: (conflict: ConflictInfo<T>) => void;
  /** Page type for conflict resolution UI */
  pageType?: string;
  /** Conflict threshold in ms - conflicts detected when timestamps differ by more than this */
  conflictThresholdMs?: number;
}

interface LocalStorageSyncReturn<T> {
  save: (data: T) => Promise<boolean>;
  load: () => Promise<T | null>;
  clear: () => Promise<void>;
  isStorageLimited: boolean;
  getTimestamp: () => Promise<number | null>;
  /** Broadcast data to other tabs (only if cross-tab sync enabled) */
  broadcastUpdate: (data: T) => void;
  /** Unique tab ID for conflict detection */
  tabId: string;
  /** Force resolve a conflict with a chosen version */
  resolveConflict: (choice: 'local' | 'remote', localData: T, remoteData: T) => Promise<void>;
}

/**
 * Hook for immediate localStorage synchronization with multi-layer fallback.
 * Saves data with 0ms delay (synchronous) to localStorage, with automatic
 * fallback to sessionStorage, memory, and IndexedDB.
 * 
 * ENHANCED (Prompt 7): Now ALWAYS saves to IndexedDB in parallel with localStorage
 * for 50MB+ storage capacity and Safari private mode support.
 * 
 * ENHANCED (Prompt 11): Now supports cross-tab synchronization via BroadcastChannel
 * to keep data in sync across multiple open browser tabs.
 * 
 * Works on all browsers including Safari private browsing mode.
 */
export function useLocalStorageSync<T extends Record<string, unknown>>({
  key,
  enableIndexDBFallback = true,
  enableCrossTabSync = false,
  onRemoteUpdate,
  onConflict,
  pageType = 'Unknown',
  conflictThresholdMs = 5000,
}: LocalStorageSyncConfig<T>): LocalStorageSyncReturn<T> {
  
  const storageLimited = useMemo(() => isStorageLimited(), []);
  const lastLocalDataRef = useRef<{ data: T; timestamp: number } | null>(null);

  // Cross-tab sync integration
  const { broadcast, broadcastSaveComplete, tabId } = useCrossTabSync<T>({
    key,
    enabled: enableCrossTabSync,
    onRemoteUpdate: (data, timestamp) => {
      const typedData = data as T;
      
      // Check for conflict based on timestamp threshold
      if (lastLocalDataRef.current) {
        const timeDiff = Math.abs(timestamp - lastLocalDataRef.current.timestamp);
        if (timeDiff > conflictThresholdMs) {
          // Significant time difference - might be a conflict
          const conflictInfo: ConflictInfo<T> = {
            local: {
              data: lastLocalDataRef.current.data,
              timestamp: lastLocalDataRef.current.timestamp,
              tabId,
            },
            remote: {
              data: typedData,
              timestamp,
              source: 'Other Tab',
            },
            pageType,
          };
          onConflict?.(conflictInfo);
          return;
        }
      }
      
      // No conflict, accept remote update
      onRemoteUpdate?.(typedData);
    },
    onConflict: (localTs, remoteTs) => {
      // Called when cross-tab sync detects timestamp mismatch
      console.log('[useLocalStorageSync] Cross-tab conflict detected', { localTs, remoteTs });
    },
  });

  /**
   * Immediately saves data to localStorage AND IndexedDB in parallel.
   * Also broadcasts to other tabs if cross-tab sync is enabled.
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
      
      // ENHANCED (Prompt 11): Broadcast to other tabs on successful save
      if ((localStorageSuccess || idbSuccess) && enableCrossTabSync) {
        broadcast(data);
        broadcastSaveComplete();
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
  }, [key, enableIndexDBFallback, enableCrossTabSync, broadcast, broadcastSaveComplete]);

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

  /**
   * Manually broadcast data update to other tabs
   */
  const broadcastUpdate = useCallback((data: T) => {
    if (enableCrossTabSync) {
      broadcast(data);
    }
  }, [enableCrossTabSync, broadcast]);

  /**
   * Resolve a conflict by choosing local or remote data
   */
  const resolveConflict = useCallback(async (
    choice: 'local' | 'remote',
    localData: T,
    remoteData: T
  ): Promise<void> => {
    const dataToSave = choice === 'local' ? localData : remoteData;
    await save(dataToSave);
    
    // Broadcast the resolution to other tabs
    if (enableCrossTabSync) {
      broadcast(dataToSave);
      broadcastSaveComplete();
    }
  }, [save, enableCrossTabSync, broadcast, broadcastSaveComplete]);

  return {
    save,
    load,
    clear,
    isStorageLimited: storageLimited,
    getTimestamp,
    broadcastUpdate,
    tabId,
    resolveConflict,
  };
}
