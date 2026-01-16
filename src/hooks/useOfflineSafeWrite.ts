/**
 * Hook for offline-safe write operations
 * Queues mutations when offline and syncs when back online
 */

import { useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineSync } from './useOfflineSync';
import { removeMutation } from '@/lib/offlineDb';

type WriteType = 'create' | 'update' | 'delete';

interface SafeWriteResult {
  success: boolean;
  queued: boolean;
  mutationId?: string;
  data?: any;
  error?: Error;
}

export function useOfflineSafeWrite() {
  const isOnline = useOnlineStatus();
  const { queueOfflineMutation } = useOfflineSync();

  /**
   * Performs a write operation that is safe for offline use
   * - If online: executes immediately, queues as backup in case of failure
   * - If offline: queues for later sync
   */
  const safeWrite = useCallback(async (
    table: string,
    type: WriteType,
    data: any,
    onlineFn: () => Promise<any>
  ): Promise<SafeWriteResult> => {
    // Always backup to mutation queue first
    const mutationId = await queueOfflineMutation(type, table, data);
    
    if (isOnline) {
      try {
        const result = await onlineFn();
        // Success - remove from queue
        await removeMutation(mutationId);
        return { success: true, queued: false, data: result };
      } catch (error) {
        // Keep in queue for retry
        console.error('Write failed, queued for retry:', error);
        return { 
          success: false, 
          queued: true, 
          mutationId, 
          error: error as Error 
        };
      }
    } else {
      // Queued for later sync
      return { success: true, queued: true, mutationId };
    }
  }, [isOnline, queueOfflineMutation]);

  /**
   * Simple wrapper that doesn't queue - just returns status
   * Use when you want manual control over the mutation queue
   */
  const safeWriteSimple = useCallback(async (
    onlineFn: () => Promise<any>,
    offlineFallback?: () => void
  ): Promise<{ success: boolean; offline: boolean; data?: any; error?: Error }> => {
    if (!isOnline) {
      if (offlineFallback) {
        offlineFallback();
      }
      return { success: true, offline: true };
    }

    try {
      const data = await onlineFn();
      return { success: true, offline: false, data };
    } catch (error) {
      return { success: false, offline: false, error: error as Error };
    }
  }, [isOnline]);

  return { 
    safeWrite, 
    safeWriteSimple,
    isOnline 
  };
}
