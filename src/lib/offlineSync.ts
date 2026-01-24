/**
 * Offline sync manager - handles syncing queued mutations when online
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  QueuedMutation,
  getMutationCount,
  updateSyncTime,
} from './offlineDb';

const MAX_RETRIES = 3;

type SyncEventType = 'sync-start' | 'sync-complete' | 'sync-error' | 'mutation-synced' | 'conflict-resolved';

type SyncEventListener = (event: { type: SyncEventType; data?: any }) => void;

let syncListeners: SyncEventListener[] = [];
let isSyncing = false;

/**
 * Add a sync event listener
 */
export function addSyncListener(listener: SyncEventListener): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

/**
 * Emit a sync event
 */
function emitSyncEvent(type: SyncEventType, data?: any) {
  syncListeners.forEach(listener => listener({ type, data }));
}

/**
 * Process a single mutation
 */
async function processMutation(mutation: QueuedMutation): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.warn('No session available for sync');
    return false;
  }

  try {
    await updateMutationStatus(mutation.id, 'syncing');

    // Route to appropriate edge function based on table
    let endpoint = '';
    let body: any = mutation.data;

    switch (mutation.table) {
      case 'tasks':
        endpoint = 'manage-task';
        body = {
          action: mutation.type,
          ...mutation.data,
        };
        break;
      
      case 'daily_plans':
        endpoint = 'save-daily-plan';
        break;
      
      case 'weekly_plans':
        endpoint = 'save-weekly-plan';
        break;
      
      case 'weekly_reviews':
        endpoint = 'save-weekly-review';
        break;
      
      case 'habits':
        endpoint = 'save-habit';
        break;
      
      case 'ideas':
        endpoint = 'save-idea';
        break;
      
      default:
        console.warn(`Unknown table for sync: ${mutation.table}`);
        return false;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check for conflict (409) - apply last-write-wins
      if (response.status === 409) {
        console.log(`Conflict detected for ${mutation.table}, applying last-write-wins`);
        emitSyncEvent('conflict-resolved', { mutation, resolution: 'last-write-wins' });
        // For last-write-wins, we still consider this a success
        // The server should have the latest version
        await removeMutation(mutation.id);
        return true;
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    await removeMutation(mutation.id);
    emitSyncEvent('mutation-synced', { mutation });
    return true;

  } catch (error) {
    console.error(`Failed to sync mutation ${mutation.id}:`, error);
    
    if (mutation.retries >= MAX_RETRIES) {
      await updateMutationStatus(mutation.id, 'failed', true);
      return false;
    }
    
    await updateMutationStatus(mutation.id, 'pending', true);
    return false;
  }
}

/**
 * Sync all pending mutations
 */
export async function syncPendingMutations(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) {
    console.log('Sync already in progress');
    return { synced: 0, failed: 0 };
  }

  if (!navigator.onLine) {
    console.log('Offline, skipping sync');
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  emitSyncEvent('sync-start');

  let synced = 0;
  let failed = 0;

  try {
    let mutations: QueuedMutation[];
    try {
      mutations = await getPendingMutations();
    } catch (dbError: any) {
      // Handle IDB connection closing (e.g., during navigation)
      if (dbError?.name === 'InvalidStateError' || dbError?.message?.includes('closing')) {
        console.warn('IDB connection closed during sync, will retry later');
        isSyncing = false;
        return { synced: 0, failed: 0 };
      }
      throw dbError;
    }
    
    if (mutations.length === 0) {
      emitSyncEvent('sync-complete', { synced: 0, failed: 0 });
      return { synced: 0, failed: 0 };
    }

    console.log(`Starting sync of ${mutations.length} mutations`);

    // Process mutations in order (FIFO)
    for (const mutation of mutations.sort((a, b) => a.timestamp - b.timestamp)) {
      try {
        const success = await processMutation(mutation);
        if (success) {
          synced++;
        } else {
          failed++;
        }
      } catch (mutationError: any) {
        // Handle IDB closing mid-sync
        if (mutationError?.name === 'InvalidStateError') {
          console.warn('IDB closed during mutation processing');
          break;
        }
        failed++;
      }
      
      // Small delay between mutations to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update sync time (ignore errors if DB is closing)
    try {
      await updateSyncTime('mutations');
    } catch {
      // Ignore - DB may be closing
    }

    emitSyncEvent('sync-complete', { synced, failed });
    console.log(`Sync complete: ${synced} synced, ${failed} failed`);

  } catch (error) {
    console.error('Sync error:', error);
    emitSyncEvent('sync-error', { error });
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

/**
 * Get current sync status
 */
export function getSyncStatus(): { isSyncing: boolean } {
  return { isSyncing };
}

/**
 * Get pending mutation count
 */
export async function getPendingCount(): Promise<number> {
  return getMutationCount('pending');
}

/**
 * Setup automatic sync on reconnection
 */
export function setupAutoSync(): () => void {
  const handleOnline = () => {
    console.log('Connection restored, starting sync...');
    // Delay sync slightly to ensure connection is stable
    setTimeout(() => {
      syncPendingMutations();
    }, 1000);
  };

  window.addEventListener('online', handleOnline);

  // Also sync on visibility change (when app comes to foreground)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncPendingMutations();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Initial sync if online
  if (navigator.onLine) {
    syncPendingMutations();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
