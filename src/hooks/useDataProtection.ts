import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  const saveToLocalStorage = useCallback((data: T) => {
    if (!enableLocalBackup) return;
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };
      localStorage.setItem(localStorageKey, JSON.stringify(backup));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [localStorageKey, enableLocalBackup]);

  const loadFromLocalStorage = useCallback((): T | null => {
    if (!enableLocalBackup) return null;
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (!stored) return null;
      
      const backup = JSON.parse(stored);
      return backup.data;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }, [localStorageKey, enableLocalBackup]);

  const clearLocalStorage = useCallback(() => {
    if (!enableLocalBackup) return;
    try {
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }, [localStorageKey, enableLocalBackup]);

  const performSave = useCallback(async () => {
    if (!dataRef.current || isSavingRef.current) return;

    if (!isOnline) {
      setSaveStatus('offline');
      saveToLocalStorage(dataRef.current);
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
      
      clearLocalStorage();
      
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
        saveToLocalStorage(dataRef.current);
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
    dataRef.current = data;
    setHasUnsavedChanges(true);
    setSaveStatus('pending');
    saveToLocalStorage(data);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
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

  // Before unload warning
  useEffect(() => {
    if (!enableBeforeUnload) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, enableBeforeUnload]);

  // Cleanup and final save attempt
  useEffect(() => {
    return () => {
      if (dataRef.current && hasUnsavedChanges && isOnline) {
        saveFn(dataRef.current).catch(console.error);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, isOnline, saveFn]);

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
