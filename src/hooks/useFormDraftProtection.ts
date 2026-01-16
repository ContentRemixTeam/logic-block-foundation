/**
 * Lightweight hook for protecting modal/dialog form drafts
 * Simpler than useDataProtection - just localStorage backup + beforeunload
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface DraftProtectionConfig {
  localStorageKey: string;
  enabled?: boolean;
}

interface DraftData<T> {
  data: T;
  timestamp: string;
}

export function useFormDraftProtection<T extends Record<string, any>>({
  localStorageKey,
  enabled = true,
}: DraftProtectionConfig) {
  const [hasDraft, setHasDraft] = useState(false);
  const dataRef = useRef<T | null>(null);
  const hasUnsavedRef = useRef(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;
    
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DraftData<T>;
        // Check if draft is less than 24 hours old
        const age = Date.now() - new Date(parsed.timestamp).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          setHasDraft(true);
        } else {
          // Clear stale draft
          localStorage.removeItem(localStorageKey);
        }
      }
    } catch (e) {
      console.error('Error checking draft:', e);
    }
  }, [localStorageKey, enabled]);

  // Save draft to localStorage
  const saveDraft = useCallback((data: T) => {
    if (!enabled) return;
    
    dataRef.current = data;
    hasUnsavedRef.current = true;
    
    try {
      const draftData: DraftData<T> = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(localStorageKey, JSON.stringify(draftData));
      setHasDraft(true);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, [localStorageKey, enabled]);

  // Load draft from localStorage
  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null;
    
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DraftData<T>;
        return parsed.data;
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
    return null;
  }, [localStorageKey, enabled]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (!enabled) return;
    
    try {
      localStorage.removeItem(localStorageKey);
      setHasDraft(false);
      hasUnsavedRef.current = false;
      dataRef.current = null;
    } catch (e) {
      console.error('Error clearing draft:', e);
    }
  }, [localStorageKey, enabled]);

  // Mark as saved (clears unsaved state without removing draft)
  const markSaved = useCallback(() => {
    hasUnsavedRef.current = false;
  }, []);

  // Beforeunload warning
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current && dataRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  return {
    hasDraft,
    saveDraft,
    loadDraft,
    clearDraft,
    markSaved,
  };
}
