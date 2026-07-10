/**
 * Per-user preference: does the "How's your battery today?" prompt
 * auto-appear once per day on Dashboard / Daily Plan?
 *
 * Default: true. When false, the battery chip/control still works for
 * manual check-ins, and battery-driven features (energy matching,
 * Low Battery Day) still consume whatever level the user sets.
 */
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useUserSettingsRow, useUserSettingsCache } from '@/hooks/useUserSettingsRow';

export function useBatteryPromptEnabled() {
  const { user } = useAuth();
  const { patch } = useUserSettingsCache();

  const { data: enabled, isLoading } = useUserSettingsRow<boolean>((row) => {
    if (!row) return true;
    const val = (row as Record<string, unknown>).battery_checkin_prompt_enabled;
    return val === false ? false : true;
  });

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from('user_settings')
        // Column added via migration; types file may be a step behind.
        .update({ battery_checkin_prompt_enabled: next } as never)
        .eq('user_id', user!.id);
      if (error) throw error;
      return next;
    },
    onMutate: (next) => {
      patch({ battery_checkin_prompt_enabled: next } as never);
    },
    onError: (err: Error) => {
      console.error('Failed to update battery prompt setting:', err);
      toast.error('Could not save that setting');
    },
  });

  const setEnabled = useCallback((v: boolean) => mutation.mutate(v), [mutation]);

  return {
    enabled: enabled ?? true,
    isLoading,
    setEnabled,
    isUpdating: mutation.isPending,
  };
}
