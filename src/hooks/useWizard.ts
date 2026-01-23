import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const DEBOUNCE_DELAY = 3000; // 3 seconds
const LOCAL_STORAGE_PREFIX = 'wizard_draft_';

interface UseWizardOptions<T> {
  templateName: string;
  totalSteps: number;
  defaultData: T;
  validateStep?: (step: number, data: T) => boolean;
}

interface UseWizardReturn<T> {
  step: number;
  data: T;
  setData: (updates: Partial<T>) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  canProceed: boolean;
  save: () => Promise<void>;
  saveDraft: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasDraft: boolean;
  clearDraft: () => Promise<void>;
  totalSteps: number;
  lastServerSync: Date | null;
  syncError: string | null;
  getDraftAge: () => string | null;
  draftUpdatedAt: Date | null;
}

export function useWizard<T extends Record<string, unknown>>({
  templateName,
  totalSteps,
  defaultData,
  validateStep,
}: UseWizardOptions<T>): UseWizardReturn<T> {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setDataState] = useState<T>(defaultData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastServerSync, setLastServerSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<Date | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const hasUnsavedChanges = useRef(false);
  const isInitialLoad = useRef(true);

  const localStorageKey = `${LOCAL_STORAGE_PREFIX}${templateName}`;

  // Browser close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      setIsLoading(true);
      try {
        // Try localStorage first (for offline support)
        let localDraft: { data: T; step: number; updatedAt?: string } | null = null;
        
        try {
          const stored = localStorage.getItem(localStorageKey);
          if (stored) {
            localDraft = JSON.parse(stored);
          }
        } catch {
          // Invalid JSON, ignore
        }

        let draftData: T | null = localDraft?.data || null;
        let draftStep = localDraft?.step || 1;
        let updatedAt: Date | null = localDraft?.updatedAt ? new Date(localDraft.updatedAt) : null;

        // Try server if user is authenticated
        if (user) {
          try {
            const { data: serverDraft } = await supabase
              .from('wizard_completions')
              .select('*')
              .eq('user_id', user.id)
              .eq('template_name', templateName)
              .is('completed_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (serverDraft?.answers) {
              const serverData = serverDraft.answers as T;
              const serverUpdatedAt = new Date(serverDraft.created_at);
              
              // Use server draft if it's newer than local
              if (!updatedAt || serverUpdatedAt > updatedAt) {
                draftData = serverData;
                draftStep = (serverDraft.answers as Record<string, unknown>)._step as number || 1;
                updatedAt = serverUpdatedAt;
              }
            }
          } catch {
            // No server draft found, continue with local
          }
        }

        if (draftData) {
          setDataState({ ...defaultData, ...draftData });
          setStep(draftStep);
          setHasDraft(true);
          setDraftUpdatedAt(updatedAt);
          setLastServerSync(updatedAt);
          lastSavedRef.current = JSON.stringify(draftData);
        }
        
        isInitialLoad.current = false;
      } catch (err) {
        console.error('Error loading wizard draft:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [user, templateName, localStorageKey, defaultData]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const saveToServer = useCallback(async (draftPayload: T & { _step: number }) => {
    if (!user) return;
    
    setIsSaving(true);
    setSyncError(null);
    
    try {
      // Check if draft exists
      const { data: existing } = await supabase
        .from('wizard_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_name', templateName)
        .is('completed_at', null)
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from('wizard_completions')
          .update({ 
            answers: JSON.parse(JSON.stringify(draftPayload))
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('wizard_completions')
          .insert([{
            user_id: user.id,
            template_name: templateName,
            answers: JSON.parse(JSON.stringify(draftPayload)),
          }]);
      }
      
      const now = new Date();
      setLastServerSync(now);
      hasUnsavedChanges.current = false;
    } catch (err) {
      console.error('Error saving draft to server:', err);
      setSyncError('Failed to sync');
    } finally {
      setIsSaving(false);
    }
  }, [user, templateName]);

  const saveDraftInternal = useCallback(async (immediate = false) => {
    const draftPayload = { ...data, _step: step };
    const currentDataStr = JSON.stringify(draftPayload);
    
    // Skip if nothing changed
    if (currentDataStr === lastSavedRef.current && !immediate) {
      return;
    }
    
    // Always save to localStorage immediately
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({ 
        data: draftPayload, 
        step,
        updatedAt: new Date().toISOString()
      }));
      lastSavedRef.current = currentDataStr;
      setHasDraft(true);
      hasUnsavedChanges.current = true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }

    // Debounce server sync
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (immediate) {
      await saveToServer(draftPayload);
    } else {
      debounceRef.current = setTimeout(() => {
        saveToServer(draftPayload);
      }, DEBOUNCE_DELAY);
    }
  }, [data, step, localStorageKey, saveToServer]);

  const setData = useCallback((updates: Partial<T>) => {
    setDataState(prev => {
      const newData = { ...prev, ...updates };
      return newData;
    });
    setError(null);
  }, []);

  // Trigger save when data changes (after initial load)
  useEffect(() => {
    if (!isInitialLoad.current && !isLoading) {
      saveDraftInternal();
    }
  }, [data, step, saveDraftInternal, isLoading]);

  const canProceed = validateStep ? validateStep(step, data) : true;

  const goNext = useCallback(() => {
    if (step < totalSteps && canProceed) {
      setStep(prev => prev + 1);
    }
  }, [step, totalSteps, canProceed]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  }, [step]);

  const goToStep = useCallback((targetStep: number) => {
    if (targetStep >= 1 && targetStep <= totalSteps) {
      setStep(targetStep);
    }
  }, [totalSteps]);

  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveDraftInternal(true);
      toast.success('Draft saved');
    } catch (err) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, [saveDraftInternal]);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveDraftInternal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [saveDraftInternal]);

  const clearDraft = useCallback(async () => {
    try {
      localStorage.removeItem(localStorageKey);
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
    
    setHasDraft(false);
    setDataState(defaultData);
    setStep(1);
    setLastServerSync(null);
    setDraftUpdatedAt(null);
    hasUnsavedChanges.current = false;
    lastSavedRef.current = '';

    if (user) {
      try {
        await supabase
          .from('wizard_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('template_name', templateName)
          .is('completed_at', null);
      } catch (err) {
        console.error('Error clearing server draft:', err);
      }
    }
  }, [user, templateName, localStorageKey, defaultData]);

  const getDraftAge = useCallback((): string | null => {
    if (!lastServerSync) return null;
    return formatDistanceToNow(lastServerSync, { addSuffix: true });
  }, [lastServerSync]);

  return {
    step,
    data,
    setData,
    goNext,
    goBack,
    goToStep,
    canProceed,
    save,
    saveDraft,
    isLoading,
    isSaving,
    error,
    hasDraft,
    clearDraft,
    totalSteps,
    lastServerSync,
    syncError,
    getDraftAge,
    draftUpdatedAt,
  };
}
