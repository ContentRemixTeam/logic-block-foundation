/**
 * Delight Settings Hook
 * Manages user preferences for themes, celebrations, and sounds
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DelightIntensity } from '@/lib/themeConfigSchema';

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
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['delight-settings', user?.id],
    queryFn: async (): Promise<DelightSettings> => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('themes_enabled, celebrations_enabled, sound_enabled, delight_intensity, active_theme_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching delight settings:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data) return DEFAULT_SETTINGS;

      return {
        themes_enabled: data.themes_enabled ?? true,
        celebrations_enabled: data.celebrations_enabled ?? true,
        sound_enabled: data.sound_enabled ?? false,
        delight_intensity: (data.delight_intensity as DelightIntensity) ?? 'subtle',
        active_theme_id: data.active_theme_id ?? null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DelightSettings>) => {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delight-settings'] });
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
