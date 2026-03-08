/**
 * Monthly Theme Hook
 * Fetches current month's theme release, user challenge progress, and dismissal state
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MonthlyThemeData {
  active: boolean;
  template: {
    id: string;
    title: string;
    description: string | null;
    announcement_title: string | null;
    announcement_body: string | null;
    preview_image_url: string | null;
    suggested_targets: { light: number; medium: number; stretch: number };
    unlock_paths: string[];
    month_start: string;
    month_end: string;
    reward_theme: {
      id: string;
      name: string;
      slug: string;
      preview_emoji: string | null;
      config_json: unknown;
    } | null;
  } | null;
  challenge: {
    id: string;
    challenge_type: string;
    target_value: number;
    status: string;
    project_id: string | null;
  } | null;
  dismissal: {
    popup_dismissed: boolean;
    hello_bar_dismissed: boolean;
  };
  theme_unlocked: boolean;
  progress: {
    current_count: number;
    target_value: number;
    percent: number;
    is_complete: boolean;
  } | null;
}

export function useMonthlyTheme() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-theme', user?.id],
    queryFn: async (): Promise<MonthlyThemeData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-monthly-theme`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (!res.ok) throw new Error('Failed to fetch monthly theme');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // Dismiss popup or hello bar
  const dismissMutation = useMutation({
    mutationFn: async (type: 'popup' | 'hello_bar') => {
      if (!data?.template) return;
      const field = type === 'popup' ? 'popup_dismissed_at' : 'hello_bar_dismissed_at';
      
      await supabase
        .from('user_monthly_theme_dismissals')
        .upsert(
          {
            user_id: user!.id,
            template_id: data.template.id,
            [field]: new Date().toISOString(),
          },
          { onConflict: 'user_id,template_id' }
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-theme'] });
    },
  });

  // Enroll in a challenge
  const enrollMutation = useMutation({
    mutationFn: async (params: {
      challengeType: string;
      targetValue: number;
      projectId?: string;
    }) => {
      if (!data?.template) throw new Error('No active template');
      
      const { error } = await supabase
        .from('user_monthly_challenges')
        .insert({
          user_id: user!.id,
          template_id: data.template.id,
          challenge_type: params.challengeType,
          target_value: params.targetValue,
          project_id: params.projectId || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-theme'] });
    },
  });

  // Check completion
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!data?.challenge) throw new Error('No active challenge');
      const { data: result, error } = await supabase.rpc(
        'complete_monthly_challenge_if_ready',
        { p_user_challenge_id: data.challenge.id }
      );
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-theme'] });
      queryClient.invalidateQueries({ queryKey: ['app-themes'] });
    },
  });

  return {
    data: data ?? null,
    isLoading,
    showPopup: !!(data?.active && !data.dismissal.popup_dismissed && !data.theme_unlocked),
    showHelloBar: !!(data?.active && !data.dismissal.hello_bar_dismissed && !data.theme_unlocked),
    dismissPopup: () => dismissMutation.mutateAsync('popup'),
    dismissHelloBar: () => dismissMutation.mutateAsync('hello_bar'),
    enroll: enrollMutation.mutateAsync,
    isEnrolling: enrollMutation.isPending,
    checkCompletion: completeMutation.mutateAsync,
    isChecking: completeMutation.isPending,
  };
}
