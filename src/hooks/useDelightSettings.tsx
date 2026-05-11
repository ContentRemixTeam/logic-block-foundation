/**
 * Delight Settings Hook — now consumes the shared user_settings cache.
 */
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DelightIntensity } from '@/lib/themeConfigSchema';
import { useUserSettingsRow, useUserSettingsCache } from '@/hooks/useUserSettingsRow';

export interface DelightSettings {
  themes_enabled: boolean;
  celebrations_enabled: boolean;
  sound_enabled: boolean;
  delight_intensity: DelightIntensity;
  active_theme_id: string | null;
}

const DEFAULT_SETTINGS: DelightSettings = {
  themes_enabled: true,
  celebrations_enabled: true,
  sound_enabled: false,
  delight_intensity: 'subtle',
  active_theme_id: null,
};

export function useDelightSettings() {
  const { user } = useAuth();
  const { patch } = useUserSettingsCache();

  const { data: settings, isLoading } = useUserSettingsRow<DelightSettings>((row) => {
    if (!row) return DEFAULT_SETTINGS;
    return {
      themes_enabled: row.themes_enabled ?? true,
      celebrations_enabled: row.celebrations_enabled ?? true,
      sound_enabled: row.sound_enabled ?? false,
      delight_intensity: (row.delight_intensity as DelightIntensity) ?? 'subtle',
      active_theme_id: row.active_theme_id ?? null,
    };
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DelightSettings>) => {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user!.id);
      if (error) throw error;
      return updates;
    },
    onMutate: (updates) => {
      patch(updates as never);
    },
    onError: (error: Error) => {
      console.error('Failed to update delight settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const updateSetting = useCallback(
    <K extends keyof DelightSettings>(key: K, value: DelightSettings[K]) => {
      updateMutation.mutate({ [key]: value });
    },
    [updateMutation]
  );

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    updateSetting,
    isUpdating: updateMutation.isPending,
  };
}
