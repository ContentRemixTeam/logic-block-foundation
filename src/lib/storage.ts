/**
 * Safe localStorage utilities with fallbacks for browser compatibility
 * Handles cases where localStorage is blocked, full, or unavailable
 */

// In-memory fallback for when localStorage is unavailable
const memoryStorage: Record<string, string> = {};

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = typeof window !== 'undefined' && isLocalStorageAvailable();

/**
 * Safely get an item from localStorage with fallback
 */
export function getStorageItem(key: string): string | null {
  try {
    if (hasLocalStorage) {
      return localStorage.getItem(key);
    }
    return memoryStorage[key] ?? null;
  } catch (error) {
    console.warn(`Failed to get storage item "${key}":`, error);
    return memoryStorage[key] ?? null;
  }
}

/**
 * Safely set an item in localStorage with fallback
 */
export function setStorageItem(key: string, value: string): boolean {
  try {
    if (hasLocalStorage) {
      localStorage.setItem(key, value);
    }
    memoryStorage[key] = value;
    return true;
  } catch (error) {
    console.warn(`Failed to set storage item "${key}":`, error);
    memoryStorage[key] = value;
    return false;
  }
}

/**
 * Safely remove an item from localStorage with fallback
 */
export function removeStorageItem(key: string): boolean {
  try {
    if (hasLocalStorage) {
      localStorage.removeItem(key);
    }
    delete memoryStorage[key];
    return true;
  } catch (error) {
    console.warn(`Failed to remove storage item "${key}":`, error);
    delete memoryStorage[key];
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  try {
    const testKey = '__session_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasSessionStorage = typeof window !== 'undefined' && isSessionStorageAvailable();
const memorySessionStorage: Record<string, string> = {};

/**
 * Safely get an item from sessionStorage with fallback
 */
export function getSessionItem(key: string): string | null {
  try {
    if (hasSessionStorage) {
      return sessionStorage.getItem(key);
    }
    return memorySessionStorage[key] ?? null;
  } catch (error) {
    console.warn(`Failed to get session item "${key}":`, error);
    return memorySessionStorage[key] ?? null;
  }
}

/**
 * Safely set an item in sessionStorage with fallback
 */
export function setSessionItem(key: string, value: string): boolean {
  try {
    if (hasSessionStorage) {
      sessionStorage.setItem(key, value);
    }
    memorySessionStorage[key] = value;
    return true;
  } catch (error) {
    console.warn(`Failed to set session item "${key}":`, error);
    memorySessionStorage[key] = value;
    return false;
  }
}
