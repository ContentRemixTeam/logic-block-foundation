/**
 * Legacy useUserSettings — now backed by the shared user_settings cache.
 * Existing consumers continue to use { settings, updateSettings, isLoading, refetch }.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettingsRow, useUserSettingsCache, type UserSettingsRow } from '@/hooks/useUserSettingsRow';

type UserSettings = Record<string, unknown>;

export function useUserSettings() {
  const { user } = useAuth();
  const { data: settings, isLoading, refetch } = useUserSettingsRow();
  const { patch } = useUserSettingsCache();

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) throw error;
        patch(updates as Partial<UserSettingsRow>);
      } catch (error) {
        console.error('Error updating settings:', error);
      }
    },
    [user, patch]
  );

  return {
    settings: (settings as UserSettings | null) ?? null,
    updateSettings,
    isLoading,
    refetch: () => {
      refetch();
    },
  };
}
