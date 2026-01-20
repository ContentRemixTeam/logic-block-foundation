/**
 * Unlocked Themes Hook
 * Fetches user's unlocked themes and available published themes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseThemeConfig, ThemeConfig } from '@/lib/themeConfigSchema';
import { toast } from 'sonner';

export interface AppTheme {
  id: string;
  slug: string;
  name: string;
  preview_emoji: string | null;
  config: ThemeConfig;
  is_unlocked: boolean;
}

export function useUnlockedThemes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all published themes with unlock status
  const { data: themes, isLoading } = useQuery({
    queryKey: ['app-themes', user?.id],
    queryFn: async (): Promise<AppTheme[]> => {
      // Get published themes
      const { data: publishedThemes, error: themesError } = await supabase
        .from('app_themes')
        .select('*')
        .eq('is_published', true);

      if (themesError) {
        console.error('Error fetching themes:', themesError);
        return [];
      }

      // Get user unlocks
      const { data: unlocks, error: unlocksError } = await supabase
        .from('user_theme_unlocks')
        .select('theme_id');

      if (unlocksError && unlocksError.code !== 'PGRST116') {
        console.error('Error fetching unlocks:', unlocksError);
      }

      const unlockedIds = new Set((unlocks || []).map((u) => u.theme_id));
      
      // Default theme is always unlocked
      return (publishedThemes || []).map((theme) => ({
        id: theme.id,
        slug: theme.slug,
        name: theme.name,
        preview_emoji: theme.preview_emoji,
        config: parseThemeConfig(theme.config_json),
        is_unlocked: theme.slug === 'default' || unlockedIds.has(theme.id),
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Apply theme mutation
  const applyThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const { error } = await supabase
        .from('user_settings')
        .update({ active_theme_id: themeId })
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Theme applied!');
      queryClient.invalidateQueries({ queryKey: ['delight-settings'] });
    },
    onError: (error: Error) => {
      console.error('Failed to apply theme:', error);
      toast.error('Failed to apply theme');
    },
  });

  // Revert to default
  const revertToDefaultMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_settings')
        .update({ active_theme_id: null })
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reverted to default theme');
      queryClient.invalidateQueries({ queryKey: ['delight-settings'] });
    },
    onError: (error: Error) => {
      console.error('Failed to revert theme:', error);
      toast.error('Failed to revert theme');
    },
  });

  return {
    themes: themes ?? [],
    isLoading,
    unlockedThemes: (themes ?? []).filter((t) => t.is_unlocked),
    lockedThemes: (themes ?? []).filter((t) => !t.is_unlocked),
    applyTheme: applyThemeMutation.mutateAsync,
    isApplying: applyThemeMutation.isPending,
    revertToDefault: revertToDefaultMutation.mutateAsync,
    isReverting: revertToDefaultMutation.isPending,
  };
}
