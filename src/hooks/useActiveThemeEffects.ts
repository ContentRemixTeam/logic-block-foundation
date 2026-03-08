/**
 * Hook to get the active (unlocked) theme's effect config
 * Returns ambient, celebration, and badge config for the currently applied theme
 */
import { useUnlockedThemes } from '@/hooks/useUnlockedThemes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseThemeConfig, type ThemeConfig } from '@/lib/themeConfigSchema';

export function useActiveThemeEffects() {
  const { user } = useAuth();

  const { data: config, isLoading } = useQuery({
    queryKey: ['active-theme-effects', user?.id],
    queryFn: async (): Promise<ThemeConfig | null> => {
      // Get user's active theme ID from settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('active_theme_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!settings?.active_theme_id) return null;

      // Get theme config
      const { data: theme } = await supabase
        .from('app_themes')
        .select('config_json')
        .eq('id', settings.active_theme_id)
        .single();

      if (!theme) return null;
      return parseThemeConfig(theme.config_json);
    },
    enabled: !!user,
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
