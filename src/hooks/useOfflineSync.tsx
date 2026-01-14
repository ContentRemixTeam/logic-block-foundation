/**
 * React hook for offline sync status and controls
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  syncPendingMutations, 
  addSyncListener, 
  setupAutoSync,
} from '@/lib/offlineSync';
import { getMutationCount, queueMutation } from '@/lib/offlineDb';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncResult: { synced: number; failed: number } | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncResult: null,
  });

  // Update counts
  const updateCounts = useCallback(async () => {
    const [pending, failed] = await Promise.all([
      getMutationCount('pending'),
      getMutationCount('failed'),
    ]);
    
    setState(prev => ({
      ...prev,
      pendingCount: pending,
      failedCount: failed,
    }));
  }, []);

  useEffect(() => {
    // Initial count
    updateCounts();

    // Setup auto sync
    const cleanupAutoSync = setupAutoSync();

    // Listen to sync events
    const cleanupListener = addSyncListener((event) => {
      switch (event.type) {
        case 'sync-start':
          setState(prev => ({ ...prev, isSyncing: true }));
          break;
        case 'sync-complete':
          setState(prev => ({
            ...prev,
            isSyncing: false,
            lastSyncResult: event.data,
          }));
          updateCounts();
          break;
        case 'sync-error':
          setState(prev => ({ ...prev, isSyncing: false }));
          updateCounts();
          break;
        case 'mutation-synced':
          updateCounts();
          break;
      }
    });

    // Online/offline listeners
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cleanupAutoSync();
      cleanupListener();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateCounts]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('Cannot sync while offline');
      return null;
    }
    return syncPendingMutations();
  }, []);

  // Queue a mutation for offline sync
  const queueOfflineMutation = useCallback(async (
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ) => {
    const id = await queueMutation({ type, table, data });
    await updateCounts();
    return id;
  }, [updateCounts]);

  return {
    ...state,
    triggerSync,
    queueOfflineMutation,
    updateCounts,
  };
}
