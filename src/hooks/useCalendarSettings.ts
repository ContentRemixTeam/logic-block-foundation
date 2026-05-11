import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUserSettingsRow, useUserSettingsCache } from '@/hooks/useUserSettingsRow';

export type CalendarDateMode = 'dual' | 'create-only' | 'publish-only';

export interface CalendarSettings {
  autoCreateContentTasks: boolean;
  showContentInPlanners: boolean;
  calendarDateMode: CalendarDateMode;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  autoCreateContentTasks: true,
  showContentInPlanners: true,
  calendarDateMode: 'dual',
};

export function useCalendarSettings() {
  const { user } = useAuth();
  const { patch } = useUserSettingsCache();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useUserSettingsRow<CalendarSettings>((row) => {
    if (!row) return DEFAULT_SETTINGS;
    return {
      autoCreateContentTasks: row.auto_create_content_tasks ?? true,
      showContentInPlanners: row.show_content_in_planners ?? true,
      calendarDateMode: (row.calendar_date_mode as CalendarDateMode) ?? 'dual',
    };
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<CalendarSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const dbUpdates: Record<string, boolean | string> = {};
      if (updates.autoCreateContentTasks !== undefined) {
        dbUpdates.auto_create_content_tasks = updates.autoCreateContentTasks;
      }
      if (updates.showContentInPlanners !== undefined) {
        dbUpdates.show_content_in_planners = updates.showContentInPlanners;
      }
      if (updates.calendarDateMode !== undefined) {
        dbUpdates.calendar_date_mode = updates.calendarDateMode;
      }

      const { error } = await supabase
        .from('user_settings')
        .update(dbUpdates)
        .eq('user_id', user.id);
      if (error) throw error;
      return { dbUpdates, updates };
    },
    onMutate: ({ } = { } as never) => undefined,
    onSuccess: ({ dbUpdates }) => {
      patch(dbUpdates as never);
      toast.success('Settings updated');
    },
    onError: (err) => {
      console.error('Error updating calendar settings:', err);
      toast.error('Failed to update settings');
    },
  });

  const updateSettings = useCallback(
    (updates: Partial<CalendarSettings>) => {
      updateMutation.mutate(updates);
    },
    [updateMutation]
  );

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
