/**
 * Emergency Save Utility using sendBeacon
 * 
 * Uses navigator.sendBeacon for guaranteed data delivery during:
 * - Browser close
 * - Tab close  
 * - Page navigation
 * - App crash/freeze
 * 
 * sendBeacon is designed to survive page unload events where
 * normal fetch/XHR requests would be killed.
 */

import { saveEmergencyData } from './offlineDb';

interface EmergencySavePayload {
  userId: string;
  pageType: string;
  pageId?: string;
  data: any;
  timestamp: number;
  source: 'beforeunload' | 'pagehide' | 'visibilitychange' | 'crash';
}

// Get the Supabase URL from env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EMERGENCY_SAVE_ENDPOINT = `${SUPABASE_URL}/functions/v1/emergency-save`;

/**
 * Send data using sendBeacon (fire-and-forget, survives page unload)
 * Returns true if the beacon was queued successfully
 */
export function sendEmergencyBeacon(payload: Omit<EmergencySavePayload, 'timestamp'>): boolean {
  if (!navigator.sendBeacon) {
    console.warn('[EmergencySave] sendBeacon not supported');
    return false;
  }

  const fullPayload: EmergencySavePayload = {
    ...payload,
    timestamp: Date.now(),
  };

  try {
    // sendBeacon requires a Blob for JSON data with proper content-type
    const blob = new Blob([JSON.stringify(fullPayload)], {
      type: 'application/json',
    });

    const success = navigator.sendBeacon(EMERGENCY_SAVE_ENDPOINT, blob);
    
    if (success) {
      console.log('[EmergencySave] Beacon queued:', payload.pageType, payload.source);
    } else {
      console.warn('[EmergencySave] Beacon queue failed (may be full)');
    }
    
    return success;
  } catch (error) {
    console.error('[EmergencySave] Beacon error:', error);
    return false;
  }
}

/**
 * Multi-layer emergency save:
 * 1. Try sendBeacon for server-side backup
 * 2. Try localStorage as sync fallback
 * 3. Try IndexedDB as async fallback
 */
export function emergencySave(
  userId: string,
  pageType: string,
  data: any,
  source: EmergencySavePayload['source'],
  pageId?: string
): void {
  // Layer 1: sendBeacon for server-side crash recovery
  sendEmergencyBeacon({
    userId,
    pageType,
    pageId,
    data,
    source,
  });

  // Layer 2: Synchronous localStorage backup
  try {
    const key = `emergency_${pageType}_${pageId || 'default'}`;
    const backup = {
      userId,
      data,
      timestamp: Date.now(),
      source,
    };
    localStorage.setItem(key, JSON.stringify(backup));
  } catch (error) {
    console.warn('[EmergencySave] localStorage fallback failed:', error);
  }

  // Layer 3: IndexedDB backup (async, fire-and-forget)
  saveEmergencyData(userId, pageType, data).catch((error) => {
    console.warn('[EmergencySave] IndexedDB fallback failed:', error);
  });
}

/**
 * Check for emergency saves on page load and return any found
 */
export function checkEmergencySaves(pageType: string, pageId?: string): any | null {
  try {
    const key = `emergency_${pageType}_${pageId || 'default'}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only return if less than 24 hours old
      const age = Date.now() - parsed.timestamp;
      if (age < 24 * 60 * 60 * 1000) {
        return parsed;
      }
      // Clear stale emergency save
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('[EmergencySave] Check failed:', error);
  }
  return null;
}

/**
 * Clear emergency save after successful recovery or save
 */
export function clearEmergencySave(pageType: string, pageId?: string): void {
  try {
    const key = `emergency_${pageType}_${pageId || 'default'}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[EmergencySave] Clear failed:', error);
  }
}
