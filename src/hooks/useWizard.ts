import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const AUTOSAVE_INTERVAL = 30000; // 30 seconds
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
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  const localStorageKey = `${LOCAL_STORAGE_PREFIX}${templateName}`;

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      setIsLoading(true);
      try {
        // Try localStorage first (for offline support)
        const localDraft = localStorage.getItem(localStorageKey);
        let draftData: T | null = null;
        let draftStep = 1;

        if (localDraft) {
          try {
            const parsed = JSON.parse(localDraft);
            draftData = parsed.data;
            draftStep = parsed.step || 1;
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Try server if user is authenticated
        if (user) {
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
            // Use server draft if it exists and is newer
            draftData = serverData;
            draftStep = (serverDraft.answers as Record<string, unknown>)._step as number || 1;
          }
        }

        if (draftData) {
          setDataState({ ...defaultData, ...draftData });
          setStep(draftStep);
          setHasDraft(true);
        }
      } catch (err) {
        console.error('Error loading wizard draft:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [user, templateName, localStorageKey, defaultData]);

  // Autosave setup
  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      const currentDataStr = JSON.stringify(data);
      if (currentDataStr !== lastSavedRef.current) {
        saveDraftInternal();
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
      }
    };
  }, [data]);

  const saveDraftInternal = useCallback(async () => {
    const draftPayload = { ...data, _step: step };
    
    // Always save to localStorage
    localStorage.setItem(localStorageKey, JSON.stringify({ data: draftPayload, step }));
    lastSavedRef.current = JSON.stringify(data);
    setHasDraft(true);

    // Save to server if authenticated
    if (user) {
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
            .update({ answers: JSON.parse(JSON.stringify(draftPayload)) })
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
      } catch (err) {
        console.error('Error saving draft to server:', err);
      }
    }
  }, [data, step, user, templateName, localStorageKey]);

  const setData = useCallback((updates: Partial<T>) => {
    setDataState(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const canProceed = validateStep ? validateStep(step, data) : true;

  const goNext = useCallback(() => {
    if (step < totalSteps && canProceed) {
      setStep(prev => prev + 1);
      saveDraftInternal();
    }
  }, [step, totalSteps, canProceed, saveDraftInternal]);

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
      await saveDraftInternal();
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
      await saveDraftInternal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [saveDraftInternal]);

  const clearDraft = useCallback(async () => {
    localStorage.removeItem(localStorageKey);
    setHasDraft(false);
    setDataState(defaultData);
    setStep(1);

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
  };
}
