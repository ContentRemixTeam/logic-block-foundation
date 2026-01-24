/**
 * IndexedDB offline storage for app data
 * Uses the 'idb' library for a promise-based API
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface OfflineDBSchema extends DBSchema {
  // Cache for API responses
  apiCache: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      endpoint: string;
    };
  };
  
  // Mutation queue for offline changes
  mutationQueue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      table: string;
      data: any;
      timestamp: number;
      retries: number;
      status: 'pending' | 'syncing' | 'failed';
    };
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
  
  // Sync state tracking
  syncState: {
    key: string;
    value: {
      key: string;
      lastSyncAt: number;
      version: number;
    };
  };
  
  // Local data cache for offline access
  tasks: {
    key: string;
    value: any;
    indexes: { 'by-user': string };
  };
  
  dailyPlans: {
    key: string;
    value: any;
    indexes: { 'by-user': string; 'by-date': string };
  };
  
  weeklyPlans: {
    key: string;
    value: any;
    indexes: { 'by-user': string };
  };
}

const DB_NAME = 'boss-planner-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;
let isClosing = false;

/**
 * Reset the database instance (useful when connection closes unexpectedly)
 */
export function resetDbInstance(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Already closed
    }
  }
  dbInstance = null;
  isClosing = false;
}

/**
 * Initialize and get the IndexedDB database
 */
export async function getDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  // If we're in the middle of closing, reset and wait
  if (isClosing) {
    resetDbInstance();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // API cache store
      if (!db.objectStoreNames.contains('apiCache')) {
        db.createObjectStore('apiCache', { keyPath: 'endpoint' });
      }
      
      // Mutation queue store
      if (!db.objectStoreNames.contains('mutationQueue')) {
        const mutationStore = db.createObjectStore('mutationQueue', { keyPath: 'id' });
        mutationStore.createIndex('by-status', 'status');
        mutationStore.createIndex('by-timestamp', 'timestamp');
      }
      
      // Sync state store
      if (!db.objectStoreNames.contains('syncState')) {
        db.createObjectStore('syncState', { keyPath: 'key' });
      }
      
      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'task_id' });
        tasksStore.createIndex('by-user', 'user_id');
      }
      
      // Daily plans store
      if (!db.objectStoreNames.contains('dailyPlans')) {
        const dailyStore = db.createObjectStore('dailyPlans', { keyPath: 'day_id' });
        dailyStore.createIndex('by-user', 'user_id');
        dailyStore.createIndex('by-date', 'date');
      }
      
      // Weekly plans store
      if (!db.objectStoreNames.contains('weeklyPlans')) {
        const weeklyStore = db.createObjectStore('weeklyPlans', { keyPath: 'week_id' });
        weeklyStore.createIndex('by-user', 'user_id');
      }
    },
    blocked() {
      // Another tab is blocking the upgrade
      console.warn('IDB blocked - another tab may be using the database');
    },
    blocking() {
      // This tab is blocking another tab's upgrade
      isClosing = true;
      resetDbInstance();
    },
    terminated() {
      // The database was closed unexpectedly
      isClosing = true;
      resetDbInstance();
    },
  });
  
  return dbInstance;
}

/**
 * Safely execute an IDB operation with automatic retry on connection close
 */
export async function safeDbOperation<T>(
  operation: (db: IDBPDatabase<OfflineDBSchema>) => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    const db = await getDb();
    return await operation(db);
  } catch (error: any) {
    // Handle "database connection is closing" errors
    if (error?.name === 'InvalidStateError' || error?.message?.includes('closing')) {
      console.warn('IDB connection closed, resetting...');
      resetDbInstance();
      
      // Retry once
      try {
        const db = await getDb();
        return await operation(db);
      } catch (retryError) {
        console.error('IDB retry failed:', retryError);
        if (fallback !== undefined) return fallback;
        throw retryError;
      }
    }
    
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

// ============ API Cache Functions ============

/**
 * Cache an API response
 */
export async function cacheApiResponse(endpoint: string, data: any): Promise<void> {
  const db = await getDb();
  await db.put('apiCache', {
    endpoint,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get cached API response
 */
export async function getCachedResponse(endpoint: string, maxAge?: number): Promise<any | null> {
  const db = await getDb();
  const cached = await db.get('apiCache', endpoint);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (maxAge && Date.now() - cached.timestamp > maxAge) {
    await db.delete('apiCache', endpoint);
    return null;
  }
  
  return cached.data;
}

/**
 * Clear all cached API responses
 */
export async function clearApiCache(): Promise<void> {
  const db = await getDb();
  await db.clear('apiCache');
}

// ============ Mutation Queue Functions ============

export interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

/**
 * Add a mutation to the offline queue
 */
export async function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
  const db = await getDb();
  const id = `${mutation.table}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  
  await db.add('mutationQueue', {
    ...mutation,
    id,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  });
  
  return id;
}

/**
 * Get all pending mutations
 */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  return db.getAllFromIndex('mutationQueue', 'by-status', 'pending');
}

/**
 * Get mutation count by status
 */
export async function getMutationCount(status?: 'pending' | 'syncing' | 'failed'): Promise<number> {
  const db = await getDb();
  if (status) {
    const mutations = await db.getAllFromIndex('mutationQueue', 'by-status', status);
    return mutations.length;
  }
  return (await db.getAll('mutationQueue')).length;
}

/**
 * Update mutation status
 */
export async function updateMutationStatus(id: string, status: 'pending' | 'syncing' | 'failed', incrementRetry = false): Promise<void> {
  const db = await getDb();
  const mutation = await db.get('mutationQueue', id);
  
  if (mutation) {
    await db.put('mutationQueue', {
      ...mutation,
      status,
      retries: incrementRetry ? mutation.retries + 1 : mutation.retries,
    });
  }
}

/**
 * Remove a mutation from the queue (after successful sync)
 */
export async function removeMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('mutationQueue', id);
}

/**
 * Clear all mutations
 */
export async function clearMutationQueue(): Promise<void> {
  const db = await getDb();
  await db.clear('mutationQueue');
}

// ============ Sync State Functions ============

/**
 * Get last sync time for a resource
 */
export async function getLastSyncTime(key: string): Promise<number | null> {
  const db = await getDb();
  const state = await db.get('syncState', key);
  return state?.lastSyncAt || null;
}

/**
 * Update sync time for a resource
 */
export async function updateSyncTime(key: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get('syncState', key);
  
  await db.put('syncState', {
    key,
    lastSyncAt: Date.now(),
    version: (existing?.version || 0) + 1,
  });
}

// ============ Data Store Functions ============

/**
 * Cache tasks locally
 */
export async function cacheTasks(tasks: any[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('tasks', 'readwrite');
  
  for (const task of tasks) {
    await tx.store.put(task);
  }
  
  await tx.done;
}

/**
 * Get cached tasks
 */
export async function getCachedTasks(userId: string): Promise<any[]> {
  const db = await getDb();
  return db.getAllFromIndex('tasks', 'by-user', userId);
}

/**
 * Update a single cached task
 */
export async function updateCachedTask(task: any): Promise<void> {
  const db = await getDb();
  await db.put('tasks', task);
}

/**
 * Delete a cached task
 */
export async function deleteCachedTask(taskId: string): Promise<void> {
  const db = await getDb();
  await db.delete('tasks', taskId);
}

/**
 * Cache daily plan
 */
export async function cacheDailyPlan(plan: any): Promise<void> {
  const db = await getDb();
  await db.put('dailyPlans', plan);
}

/**
 * Get cached daily plan by date
 */
export async function getCachedDailyPlan(date: string): Promise<any | null> {
  const db = await getDb();
  const plans = await db.getAllFromIndex('dailyPlans', 'by-date', date);
  return plans[0] || null;
}

/**
 * Cache weekly plan
 */
export async function cacheWeeklyPlan(plan: any): Promise<void> {
  const db = await getDb();
  await db.put('weeklyPlans', plan);
}

/**
 * Get all cached weekly plans for user
 */
export async function getCachedWeeklyPlans(userId: string): Promise<any[]> {
  const db = await getDb();
  return db.getAllFromIndex('weeklyPlans', 'by-user', userId);
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear('apiCache'),
    db.clear('mutationQueue'),
    db.clear('syncState'),
    db.clear('tasks'),
    db.clear('dailyPlans'),
    db.clear('weeklyPlans'),
  ]);
}
