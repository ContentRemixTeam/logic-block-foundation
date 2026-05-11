/**
 * Hook to get the active (unlocked) theme's effect config.
 * Reads active_theme_id from the shared user_settings cache (no extra query).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseThemeConfig, type ThemeConfig } from '@/lib/themeConfigSchema';
import { useUserSettingsRow } from '@/hooks/useUserSettingsRow';

export function useActiveThemeEffects() {
  const { data: activeThemeId } = useUserSettingsRow<string | null>(
    (row) => row?.active_theme_id ?? null
  );

  const { data: config, isLoading } = useQuery({
    queryKey: ['active-theme-effects', activeThemeId],
    queryFn: async (): Promise<ThemeConfig | null> => {
      if (!activeThemeId) return null;
      const { data: theme } = await supabase
        .from('app_themes')
        .select('config_json')
        .eq('id', activeThemeId)
        .single();
      if (!theme) return null;
      return parseThemeConfig(theme.config_json);
    },
    enabled: !!activeThemeId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    config: config ?? null,
    isLoading,
    ambient: config?.fx?.ambient ?? { enabled: false, style: 'none' as const, opacity: 0.4 },
    celebration: config?.fx?.celebration ?? { enabled: false, style: 'none' as const, duration: 2500 },
    badge: config?.badge ?? undefined,
  };
}
