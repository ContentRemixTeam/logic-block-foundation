/**
 * Per-user "Extra Features" toggles, backed by `user_settings.feature_toggles`
 * (a JSONB column). Reads share the same cached row as every other setting.
 */
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useUserSettingsRow,
  useUserSettingsCache,
  type UserSettingsRow,
} from '@/hooks/useUserSettingsRow';
import { FEATURE_DEFAULTS, type FeatureKey } from '@/lib/featureRoutes';
import { toast } from 'sonner';

export type FeatureToggles = Record<FeatureKey, boolean>;

function normalize(raw: unknown): FeatureToggles {
  const merged: FeatureToggles = { ...FEATURE_DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(merged) as FeatureKey[]) {
      const v = (raw as Record<string, unknown>)[key];
      if (typeof v === 'boolean') merged[key] = v;
    }
  }
  return merged;
}

export function useFeatureToggles() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useUserSettingsRow();
  const { patch } = useUserSettingsCache();

  const toggles = useMemo<FeatureToggles>(() => {
    const raw = (settings as unknown as { feature_toggles?: unknown } | null)?.feature_toggles;
    return normalize(raw);
  }, [settings]);

  const isEnabled = useCallback(
    (key: FeatureKey) => toggles[key] === true,
    [toggles],
  );

  const setToggle = useCallback(
    async (key: FeatureKey, value: boolean) => {
      if (!user) return;
      const next = { ...toggles, [key]: value };
      // Optimistic update
      patch({ feature_toggles: next } as Partial<UserSettingsRow>);
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({
            feature_toggles: next as unknown as UserSettingsRow['feature_toggles'],
            updated_at: new Date().toISOString(),
          } as Partial<UserSettingsRow>)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success(
          value
            ? "Turned on — you'll see it in the sidebar."
            : "Turned off. Your data is safe.",
        );
      } catch (err) {
        console.error('[useFeatureToggles] update failed', err);
        // Revert
        patch({ feature_toggles: toggles as unknown as UserSettingsRow['feature_toggles'] });
        toast.error("Couldn't save that toggle. Please try again.");
      }
    },
    [user, toggles, patch],
  );

  return { toggles, isEnabled, setToggle, isLoading };
}
