import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getStorageItem, 
  setStorageItem, 
  removeStorageItem, 
  emergencyBackupToIDB,
  restoreFromIDB,
  clearEmergencyBackup,
  isStorageLimited 
} from '@/lib/storage';

export type SaveStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'
  | 'offline';

interface DataProtectionConfig<T> {
  saveFn: (data: T) => Promise<void>;
  autoSaveDelay?: number;
  localStorageKey: string;
  enableLocalBackup?: boolean;
  enableBeforeUnload?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useDataProtection<T extends Record<string, any>>({
  saveFn,
  autoSaveDelay = 2000,
  localStorageKey,
  enableLocalBackup = true,
  enableBeforeUnload = true,
  maxRetries = 3,
  retryDelay = 5000,
  onSaveSuccess,
  onSaveError,
}: DataProtectionConfig<T>) {
  const { toast } = useToast();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const dataRef = useRef<T | null>(null);
  const lastDataHashRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const rateLimitedUntilRef = useRef<number>(0);
  const isUnmountingRef = useRef(false);

  // Multi-layer backup: localStorage + sessionStorage + memory + IndexedDB
  const saveToLocalStorage = useCallback(async (data: T) => {
    if (!enableLocalBackup) return;
    
    const backup = {
      data,
      timestamp: new Date().toISOString(),
      version: '2.0', // Upgraded version with multi-layer support
    };
    
    const jsonStr = JSON.stringify(backup);
    
    // Primary: Use safe storage (handles fallbacks automatically)
    const success = setStorageItem(localStorageKey, jsonStr);
    
    // If storage is limited (private browsing), also use IndexedDB
    if (isStorageLimited() || !success) {
      await emergencyBackupToIDB(localStorageKey, backup);
    }
  }, [localStorageKey, enableLocalBackup]);

  const loadFromLocalStorage = useCallback(async (): Promise<T | null> => {
    if (!enableLocalBackup) return null;
    
    // Try regular storage first
    const stored = getStorageItem(localStorageKey);
    if (stored) {
      try {
        const backup = JSON.parse(stored);
        return backup.data;
      } catch (error) {
        console.error('Failed to parse stored backup:', error);
      }
    }
    
    // Fallback to IndexedDB
    const idbBackup = await restoreFromIDB(localStorageKey);
    if (idbBackup) {
      return idbBackup.data;
    }
    
    return null;
  }, [localStorageKey, enableLocalBackup]);

  const clearLocalStorage = useCallback(async () => {
    if (!enableLocalBackup) return;
    
    removeStorageItem(localStorageKey);
    await clearEmergencyBackup(localStorageKey);
  }, [localStorageKey, enableLocalBackup]);

  const performSave = useCallback(async () => {
    if (!dataRef.current || isSavingRef.current) return;

    if (!isOnline) {
      setSaveStatus('offline');
      await saveToLocalStorage(dataRef.current);
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      await saveFn(dataRef.current);
      
      retryCountRef.current = 0;
      isSavingRef.current = false;
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      await clearLocalStorage();
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      setTimeout(() => {
        setSaveStatus((current) => current === 'saved' ? 'idle' : current);
      }, 3000);

    } catch (error: any) {
      console.error('Save failed:', error);
      isSavingRef.current = false;

      if (dataRef.current) {
        await saveToLocalStorage(dataRef.current);
      }

      // Check for rate limit error (429)
      const errorMessage = error?.message || '';
      const isRateLimit = errorMessage.includes('429') || 
                          errorMessage.includes('RATE_LIMIT') ||
                          errorMessage.includes('Too many requests');
      
      if (isRateLimit) {
        const retryMatch = errorMessage.match(/retry_after[":]*\s*(\d+)/);
        const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 20;
        
        rateLimitedUntilRef.current = Date.now() + (retryAfter * 1000);
        setSaveStatus('pending');
        
        retryTimeoutRef.current = setTimeout(() => {
          rateLimitedUntilRef.current = 0;
          performSave();
        }, (retryAfter + 2) * 1000);
        
        return;
      }

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setSaveStatus('error');
        
        toast({
          title: `⚠️ Save failed (attempt ${retryCountRef.current}/${maxRetries})`,
          description: `Retrying in ${retryDelay / 1000} seconds... Your work is saved locally.`,
          variant: 'destructive',
        });

        retryTimeoutRef.current = setTimeout(() => {
          performSave();
        }, retryDelay);

      } else {
        setSaveStatus('error');
        toast({
          title: '❌ Save failed',
          description: 'Please check your connection and try again. Your work is saved locally.',
          variant: 'destructive',
          duration: 10000,
        });

        if (onSaveError) {
          onSaveError(error);
        }
      }
    }
  }, [saveFn, isOnline, maxRetries, retryDelay, saveToLocalStorage, clearLocalStorage, onSaveSuccess, onSaveError, toast]);

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus('pending');
      toast({
        title: '🟢 Back online',
        description: 'Attempting to save your work...',
      });
      if (dataRef.current && hasUnsavedChanges) {
        performSave();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('offline');
      toast({
        title: '🔴 Connection lost',
        description: 'Your changes are saved locally and will sync when you\'re back online',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasUnsavedChanges, performSave, toast]);

  const register = useCallback((data: T) => {
    // Skip if data hasn't actually changed
    const dataHash = JSON.stringify(data);
    if (lastDataHashRef.current === dataHash) {
      return;
    }
    lastDataHashRef.current = dataHash;
    
    dataRef.current = data;
    setHasUnsavedChanges(true);
    setSaveStatus('pending');
    
    // Immediate local backup (synchronous)
    saveToLocalStorage(data);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if we're rate limited
    const now = Date.now();
    if (rateLimitedUntilRef.current > now) {
      const waitTime = rateLimitedUntilRef.current - now + 1000;
      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, waitTime);
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, autoSaveDelay);
  }, [autoSaveDelay, performSave, saveToLocalStorage]);

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryCountRef.current = 0;

    await performSave();
  }, [performSave]);

  // Emergency save on visibility change (Safari/iOS backup)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dataRef.current && hasUnsavedChanges) {
        // Synchronously save to storage when page is hidden
        saveToLocalStorage(dataRef.current);
        
        // Try to save to server with sendBeacon-style fire-and-forget
        if (isOnline && !isUnmountingRef.current) {
          performSave();
        }
      }
    };

    // pagehide is more reliable than beforeunload on Safari/iOS
    const handlePageHide = (e: PageTransitionEvent) => {
      if (dataRef.current && hasUnsavedChanges) {
        // Synchronous backup - critical for iOS
        saveToLocalStorage(dataRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [hasUnsavedChanges, isOnline, performSave, saveToLocalStorage]);

  // Before unload warning (desktop browsers)
  useEffect(() => {
    if (!enableBeforeUnload) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Final backup attempt
        if (dataRef.current) {
          const backup = {
            data: dataRef.current,
            timestamp: new Date().toISOString(),
            version: '2.0',
          };
          // Use sync localStorage directly for final save
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(backup));
          } catch {
            // Fallback already handled by saveToLocalStorage
          }
        }
        
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, enableBeforeUnload, localStorageKey]);

  // Cleanup and final save attempt
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      
      if (dataRef.current && hasUnsavedChanges) {
        // Synchronous backup on unmount
        const backup = {
          data: dataRef.current,
          timestamp: new Date().toISOString(),
          version: '2.0',
        };
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(backup));
        } catch {
          // Memory fallback handled by storage utility
        }
        
        // Async save attempt
        if (isOnline) {
          saveFn(dataRef.current).catch(console.error);
        }
      }
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, isOnline, saveFn, localStorageKey]);

  return {
    register,
    saveNow,
    saveStatus,
    hasUnsavedChanges,
    isOnline,
    lastSaved,
    loadBackup: loadFromLocalStorage,
    clearBackup: clearLocalStorage,
  };
}
