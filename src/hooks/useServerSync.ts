import { useState, useRef, useCallback, useEffect } from 'react';

export type SyncStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'offline';

interface ServerSyncConfig<T> {
  saveFn: (data: T) => Promise<void>;
  delay?: number;
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface ServerSyncReturn<T> {
  sync: (data: T) => void;
  syncNow: (data: T) => Promise<void>;
  cancel: () => void;
  status: SyncStatus;
  lastSynced: Date | null;
  retryCount: number;
  isOnline: boolean;
}

/**
 * Hook for debounced server synchronization with retry logic.
 * Handles offline scenarios gracefully and provides detailed status updates.
 * 
 * Features:
 * - Configurable debounce delay (default: 2000ms)
 * - Automatic retry on failure (default: 3 attempts)
 * - Rate limit detection (429 errors)
 * - Online/offline detection
 */
export function useServerSync<T>({
  saveFn,
  delay = 2000,
  maxRetries = 3,
  retryDelay = 5000,
  onSuccess,
  onError,
}: ServerSyncConfig<T>): ServerSyncReturn<T> {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const dataRef = useRef<T | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const rateLimitedUntilRef = useRef<number>(0);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Attempt to save pending data when coming back online
      if (dataRef.current && status === 'offline') {
        setStatus('pending');
        performSave(dataRef.current);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  const performSave = useCallback(async (data: T) => {
    if (isSavingRef.current) return;

    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    try {
      await saveFn(data);
      
      setRetryCount(0);
      isSavingRef.current = false;
      setStatus('saved');
      setLastSynced(new Date());
      
      onSuccess?.();

      // Reset to idle after showing "saved" status
      setTimeout(() => {
        setStatus((current) => current === 'saved' ? 'idle' : current);
      }, 3000);

    } catch (error: any) {
      console.error('[useServerSync] Save failed:', error);
      isSavingRef.current = false;

      const errorMessage = error?.message || '';
      const isRateLimit = errorMessage.includes('429') || 
                          errorMessage.includes('RATE_LIMIT') ||
                          errorMessage.includes('Too many requests');
      
      if (isRateLimit) {
        const retryMatch = errorMessage.match(/retry_after[":]*\s*(\d+)/);
        const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 20;
        
        rateLimitedUntilRef.current = Date.now() + (retryAfter * 1000);
        setStatus('pending');
        
        retryTimeoutRef.current = setTimeout(() => {
          rateLimitedUntilRef.current = 0;
          if (dataRef.current) {
            performSave(dataRef.current);
          }
        }, (retryAfter + 2) * 1000);
        
        return;
      }

      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setStatus('error');
        
        retryTimeoutRef.current = setTimeout(() => {
          if (dataRef.current) {
            performSave(dataRef.current);
          }
        }, retryDelay);

      } else {
        setStatus('error');
        onError?.(error);
      }
    }
  }, [saveFn, maxRetries, retryDelay, retryCount, onSuccess, onError]);

  /**
   * Debounced sync - schedules a save after the configured delay.
   * Cancels any pending save and reschedules.
   */
  const sync = useCallback((data: T) => {
    dataRef.current = data;
    setStatus('pending');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if we're rate limited
    const now = Date.now();
    if (rateLimitedUntilRef.current > now) {
      const waitTime = rateLimitedUntilRef.current - now + 1000;
      saveTimeoutRef.current = setTimeout(() => {
        performSave(data);
      }, waitTime);
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave(data);
    }, delay);
  }, [delay, performSave]);

  /**
   * Immediate sync - saves right now, cancelling any pending debounced save.
   */
  const syncNow = useCallback(async (data: T) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    dataRef.current = data;
    setRetryCount(0);
    await performSave(data);
  }, [performSave]);

  /**
   * Cancel any pending saves and reset state.
   */
  const cancel = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    sync,
    syncNow,
    cancel,
    status,
    lastSynced,
    retryCount,
    isOnline,
  };
}
