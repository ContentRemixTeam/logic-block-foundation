import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface CalendarSettings {
  autoCreateContentTasks: boolean;
  showContentInPlanners: boolean;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  autoCreateContentTasks: true,
  showContentInPlanners: true,
};

export function useCalendarSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ['calendar-settings', user?.id],
    queryFn: async (): Promise<CalendarSettings> => {
      if (!user?.id) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from('user_settings')
        .select('auto_create_content_tasks, show_content_in_planners')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching calendar settings:', error);
        return DEFAULT_SETTINGS;
      }

      return {
        autoCreateContentTasks: data?.auto_create_content_tasks ?? true,
        showContentInPlanners: data?.show_content_in_planners ?? true,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<CalendarSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const dbUpdates: Record<string, boolean> = {};
      if (updates.autoCreateContentTasks !== undefined) {
        dbUpdates.auto_create_content_tasks = updates.autoCreateContentTasks;
      }
      if (updates.showContentInPlanners !== undefined) {
        dbUpdates.show_content_in_planners = updates.showContentInPlanners;
      }

      const { error } = await supabase
        .from('user_settings')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) throw error;
      return updates;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-settings', user?.id] });
      const previous = queryClient.getQueryData<CalendarSettings>(['calendar-settings', user?.id]);
      
      queryClient.setQueryData<CalendarSettings>(['calendar-settings', user?.id], (old) => ({
        ...DEFAULT_SETTINGS,
        ...old,
        ...updates,
      }));
      
      return { previous };
    },
    onError: (err, _, context) => {
      console.error('Error updating calendar settings:', err);
      if (context?.previous) {
        queryClient.setQueryData(['calendar-settings', user?.id], context.previous);
      }
      toast.error('Failed to update settings');
    },
    onSuccess: () => {
      toast.success('Settings updated');
    },
  });

  const updateSettings = useCallback((updates: Partial<CalendarSettings>) => {
    updateMutation.mutate(updates);
  }, [updateMutation]);

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
