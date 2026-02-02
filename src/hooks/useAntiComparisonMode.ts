import { useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

export function useAntiComparisonMode() {
  const { settings, updateSettings, isLoading } = useUserSettings();

  // Access anti_comparison_mode from raw settings object
  const rawSettings = settings as Record<string, unknown> | null;
  const isEnabled = (rawSettings?.anti_comparison_mode as boolean) ?? false;

  const toggle = useCallback(async () => {
    await updateSettings({ anti_comparison_mode: !isEnabled });
  }, [isEnabled, updateSettings]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    await updateSettings({ anti_comparison_mode: enabled });
  }, [updateSettings]);

  return {
    isEnabled,
    isLoading,
    toggle,
    setEnabled,
  };
}
