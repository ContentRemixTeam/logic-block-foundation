/**
 * Bulletproof storage utilities with multi-layer fallbacks
 * Handles: Safari private browsing, quota limits, incognito modes, iOS PWA
 * Falls back: localStorage → sessionStorage → memory → IndexedDB
 */

// In-memory fallback for when all storage is unavailable
const memoryStorage: Map<string, string> = new Map();
const memorySessionStorage: Map<string, string> = new Map();

// Storage availability flags (cached for performance)
let _localStorageAvailable: boolean | null = null;
let _sessionStorageAvailable: boolean | null = null;
let _indexedDBAvailable: boolean | null = null;

/**
 * Check if localStorage is available and working
 * Handles: Safari private mode, disabled cookies, quota exceeded
 */
function checkLocalStorageAvailable(): boolean {
  if (_localStorageAvailable !== null) return _localStorageAvailable;
  
  try {
    const testKey = '__storage_test__';
    const testValue = 'test_' + Date.now();
    window.localStorage.setItem(testKey, testValue);
    const retrieved = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    _localStorageAvailable = retrieved === testValue;
    return _localStorageAvailable;
  } catch {
    _localStorageAvailable = false;
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
function checkSessionStorageAvailable(): boolean {
  if (_sessionStorageAvailable !== null) return _sessionStorageAvailable;
  
  try {
    const testKey = '__session_test__';
    const testValue = 'test_' + Date.now();
    window.sessionStorage.setItem(testKey, testValue);
    const retrieved = window.sessionStorage.getItem(testKey);
    window.sessionStorage.removeItem(testKey);
    _sessionStorageAvailable = retrieved === testValue;
    return _sessionStorageAvailable;
  } catch {
    _sessionStorageAvailable = false;
    return false;
  }
}

/**
 * Check if IndexedDB is available (for emergency fallback)
 */
async function checkIndexedDBAvailable(): Promise<boolean> {
  if (_indexedDBAvailable !== null) return _indexedDBAvailable;
  
  try {
    if (!window.indexedDB) {
      _indexedDBAvailable = false;
      return false;
    }
    
    // Try to open a test database
    const request = indexedDB.open('__idb_test__', 1);
    
    return new Promise((resolve) => {
      request.onerror = () => {
        _indexedDBAvailable = false;
        resolve(false);
      };
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase('__idb_test__');
        _indexedDBAvailable = true;
        resolve(true);
      };
      // Safari private mode may block IDB
      setTimeout(() => {
        _indexedDBAvailable = false;
        resolve(false);
      }, 100);
    });
  } catch {
    _indexedDBAvailable = false;
    return false;
  }
}

const hasLocalStorage = typeof window !== 'undefined' && checkLocalStorageAvailable();
const hasSessionStorage = typeof window !== 'undefined' && checkSessionStorageAvailable();

/**
 * Calculate approximate storage quota remaining
 */
export async function getStorageQuota(): Promise<{ used: number; quota: number; percentUsed: number } | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        used,
        quota,
        percentUsed: quota > 0 ? Math.round((used / quota) * 100) : 0,
      };
    }
  } catch (e) {
    console.warn('Storage estimate not available:', e);
  }
  return null;
}

/**
 * Safe write with quota management - evicts old data if needed
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  if (!hasLocalStorage) return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    // Handle QuotaExceededError
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      console.warn('Storage quota exceeded, attempting cleanup...');
      
      // Try to clear old backups (anything older than 7 days)
      const keysToRemove: string[] = [];
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      for (let i = 0; i < localStorage.length; i++) {
        const storedKey = localStorage.key(i);
        if (!storedKey) continue;
        
        // Check if it's a backup with timestamp
        if (storedKey.includes('backup') || storedKey.includes('draft')) {
          try {
            const stored = localStorage.getItem(storedKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              const timestamp = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
              if (now - timestamp > maxAge) {
                keysToRemove.push(storedKey);
              }
            }
          } catch {
            // If we can't parse it, consider removing it
            keysToRemove.push(storedKey);
          }
        }
      }
      
      // Remove old items
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      // Try again
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.error('Storage quota still exceeded after cleanup');
        return false;
      }
    }
    
    console.error('localStorage.setItem failed:', e);
    return false;
  }
}

/**
 * Safely get an item with multi-layer fallback
 * Priority: localStorage → sessionStorage → memory → null
 */
export function getStorageItem(key: string): string | null {
  // Try localStorage first
  if (hasLocalStorage) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error);
    }
  }
  
  // Fallback to sessionStorage
  if (hasSessionStorage) {
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) return value;
    } catch (error) {
      console.warn(`Failed to get sessionStorage item "${key}":`, error);
    }
  }
  
  // Final fallback to memory
  return memoryStorage.get(key) ?? null;
}

/**
 * Safely set an item with multi-layer fallback
 * Tries all available storage mechanisms to maximize data survival
 */
export function setStorageItem(key: string, value: string): boolean {
  let success = false;
  
  // Always write to memory first (guaranteed to work)
  memoryStorage.set(key, value);
  
  // Try localStorage
  if (hasLocalStorage) {
    if (safeLocalStorageSet(key, value)) {
      success = true;
    }
  }
  
  // Also write to sessionStorage as backup (survives page refresh within session)
  if (hasSessionStorage) {
    try {
      sessionStorage.setItem(key, value);
      success = true;
    } catch (error) {
      console.warn(`Failed to set sessionStorage item "${key}":`, error);
    }
  }
  
  return success || memoryStorage.has(key);
}

/**
 * Safely remove an item from all storage layers
 */
export function removeStorageItem(key: string): boolean {
  memoryStorage.delete(key);
  
  if (hasLocalStorage) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error);
    }
  }
  
  if (hasSessionStorage) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove sessionStorage item "${key}":`, error);
    }
  }
  
  return true;
}

/**
 * Session-scoped storage (for current tab only)
 */
export function getSessionItem(key: string): string | null {
  if (hasSessionStorage) {
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) return value;
    } catch (error) {
      console.warn(`Failed to get session item "${key}":`, error);
    }
  }
  
  return memorySessionStorage.get(key) ?? null;
}

export function setSessionItem(key: string, value: string): boolean {
  memorySessionStorage.set(key, value);
  
  if (hasSessionStorage) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set session item "${key}":`, error);
    }
  }
  
  return true; // Memory fallback always works
}

export function removeSessionItem(key: string): boolean {
  memorySessionStorage.delete(key);
  
  if (hasSessionStorage) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove session item "${key}":`, error);
    }
  }
  
  return true;
}

/**
 * Check if storage is severely limited (private browsing mode detection)
 */
export function isStorageLimited(): boolean {
  return !hasLocalStorage && !hasSessionStorage;
}

/**
 * Get storage availability status for debugging
 */
export function getStorageStatus(): {
  localStorage: boolean;
  sessionStorage: boolean;
  memoryFallbackActive: boolean;
} {
  return {
    localStorage: hasLocalStorage,
    sessionStorage: hasSessionStorage,
    memoryFallbackActive: !hasLocalStorage && !hasSessionStorage,
  };
}

/**
 * Emergency backup to IndexedDB (for critical data)
 * Use when localStorage/sessionStorage fail
 */
export async function emergencyBackupToIDB(key: string, data: any): Promise<boolean> {
  const idbAvailable = await checkIndexedDBAvailable();
  if (!idbAvailable) return false;
  
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('emergency-backup', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('backups', 'readwrite');
          const store = tx.objectStore('backups');
          
          store.put({
            key,
            data,
            timestamp: new Date().toISOString(),
          });
          
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => {
            db.close();
            resolve(false);
          };
        } catch {
          resolve(false);
        }
      };
      
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Restore from emergency IndexedDB backup
 */
export async function restoreFromIDB(key: string): Promise<any | null> {
  const idbAvailable = await checkIndexedDBAvailable();
  if (!idbAvailable) return null;
  
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('emergency-backup', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('backups', 'readonly');
          const store = tx.objectStore('backups');
          const getRequest = store.get(key);
          
          getRequest.onsuccess = () => {
            db.close();
            resolve(getRequest.result?.data ?? null);
          };
          getRequest.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Clear emergency backup from IndexedDB
 */
export async function clearEmergencyBackup(key: string): Promise<boolean> {
  const idbAvailable = await checkIndexedDBAvailable();
  if (!idbAvailable) return false;
  
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('emergency-backup', 1);
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('backups', 'readwrite');
          const store = tx.objectStore('backups');
          store.delete(key);
          
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => {
            db.close();
            resolve(false);
          };
        } catch {
          resolve(false);
        }
      };
      
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
