import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TaskSettings {
  id: string;
  user_id: string;
  enable_time_tracking: boolean | null;
  time_completion_modal: 'always' | 'when_estimated' | 'never' | null;
  weekly_capacity_minutes: number | null;
  daily_capacity_minutes: number | null;
  default_task_duration: number | null;
  week_start_day: number | null;
  preferred_view: string | null;
  show_completed_tasks: boolean | null;
  enable_sounds: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useTaskSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-settings', user?.id],
    queryFn: async (): Promise<TaskSettings | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('task_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no settings exist, create default settings
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('task_settings')
          .insert({
            user_id: user.id,
            enable_time_tracking: true,
            time_completion_modal: 'when_estimated',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings as TaskSettings;
      }

      return data as TaskSettings;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<TaskSettings>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as TaskSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['task-settings', user?.id], data);
      toast.success('Settings updated');
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings,
  };
}
