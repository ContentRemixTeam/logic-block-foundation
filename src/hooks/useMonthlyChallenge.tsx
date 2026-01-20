/**
 * Monthly Challenge Hook
 * Manages challenge enrollment, progress tracking, and completion
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { toast } from 'sonner';

export type ChallengeType = 'tasks_total' | 'tasks_in_project' | 'daily_checkins';
export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface MonthlyTemplate {
  id: string;
  month_start: string;
  month_end: string;
  title: string;
  description: string | null;
  reward_theme_id: string | null;
}

export interface UserChallenge {
  id: string;
  template_id: string;
  challenge_type: ChallengeType;
  target_value: number;
  project_id: string | null;
  status: ChallengeStatus;
  enrolled_at: string;
  completed_at: string | null;
}

export interface ChallengeProgress {
  current_count: number;
  target_value: number;
  percent: number;
  is_complete: boolean;
  month_start: string;
  month_end: string;
  reward_theme_id: string | null;
}

export interface CompletionResult {
  completed: boolean;
  unlocked_theme_id: string | null;
  already_completed?: boolean;
  error?: string;
}

export function useMonthlyChallenge() {
  const { user } = useAuth();
  const { enabled: featureEnabled, loading: featureLoading } = useFeatureFlag('monthly_challenges');
  const queryClient = useQueryClient();

  // Fetch current month's template
  const { data: currentTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['monthly-template-current'],
    queryFn: async (): Promise<MonthlyTemplate | null> => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('monthly_challenge_templates')
        .select('*')
        .eq('is_published', true)
        .lte('month_start', today)
        .gte('month_end', today)
        .order('month_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching template:', error);
        return null;
      }
      return data;
    },
    enabled: !!user && featureEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user's current challenge
  const { data: userChallenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['user-monthly-challenge', currentTemplate?.id],
    queryFn: async (): Promise<UserChallenge | null> => {
      if (!currentTemplate) return null;

      const { data, error } = await supabase
        .from('user_monthly_challenges')
        .select('*')
        .eq('template_id', currentTemplate.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user challenge:', error);
        return null;
      }
      if (!data) return null;
      return {
        ...data,
        challenge_type: data.challenge_type as ChallengeType,
        status: data.status as ChallengeStatus,
      };
    },
    enabled: !!user && !!currentTemplate && featureEnabled,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch progress
  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['challenge-progress', userChallenge?.id],
    queryFn: async (): Promise<ChallengeProgress | null> => {
      if (!userChallenge) return null;

      const { data, error } = await supabase.rpc('get_monthly_challenge_progress', {
        p_user_challenge_id: userChallenge.id,
      });

      if (error) {
        console.error('Error fetching progress:', error);
        return null;
      }
      
      const result = data as Record<string, unknown>;
      if (result?.error) {
        console.error('Progress error:', result.error);
        return null;
      }
      
      return result as unknown as ChallengeProgress;
    },
    enabled: !!userChallenge && userChallenge.status === 'active' && featureEnabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (params: {
      templateId: string;
      challengeType: ChallengeType;
      targetValue: number;
      projectId?: string;
    }) => {
      const { data, error } = await supabase
        .from('user_monthly_challenges')
        .insert({
          user_id: user!.id,
          template_id: params.templateId,
          challenge_type: params.challengeType,
          target_value: params.targetValue,
          project_id: params.projectId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Challenge enrolled! Good luck! 🎯');
      queryClient.invalidateQueries({ queryKey: ['user-monthly-challenge'] });
    },
    onError: (error: Error) => {
      console.error('Enroll error:', error);
      toast.error('Failed to enroll in challenge');
    },
  });

  // Complete challenge mutation
  const completeMutation = useMutation({
    mutationFn: async (challengeId: string): Promise<CompletionResult> => {
      const { data, error } = await supabase.rpc('complete_monthly_challenge_if_ready', {
        p_user_challenge_id: challengeId,
      });

      if (error) throw error;
      return data as unknown as CompletionResult;
    },
    onSuccess: (result) => {
      if (result.completed && !result.already_completed) {
        queryClient.invalidateQueries({ queryKey: ['user-monthly-challenge'] });
        queryClient.invalidateQueries({ queryKey: ['user-theme-unlocks'] });
      }
    },
    onError: (error: Error) => {
      console.error('Complete error:', error);
      toast.error('Failed to complete challenge');
    },
  });

  // Calculate pace needed
  const calculatePace = useCallback(() => {
    if (!progress || !currentTemplate) return null;

    const today = new Date();
    const endDate = new Date(currentTemplate.month_end);
    const daysRemaining = Math.max(1, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = progress.target_value - progress.current_count;
    
    if (remaining <= 0) return { perDay: 0, status: 'complete' as const };
    
    const perDay = Math.ceil(remaining / daysRemaining);
    const isOnTrack = perDay <= 3; // Reasonable daily pace
    
    return {
      perDay,
      daysRemaining,
      remaining,
      status: isOnTrack ? ('on_track' as const) : ('behind' as const),
    };
  }, [progress, currentTemplate]);

  return {
    // Feature gate
    featureEnabled,
    featureLoading,
    
    // Data
    currentTemplate,
    userChallenge,
    progress,
    pace: calculatePace(),
    
    // Loading states
    isLoading: templateLoading || challengeLoading || progressLoading,
    
    // Actions
    enroll: enrollMutation.mutateAsync,
    isEnrolling: enrollMutation.isPending,
    
    claimReward: completeMutation.mutateAsync,
    isClaiming: completeMutation.isPending,
    
    refetchProgress,
    
    // Computed
    hasActiveChallenge: !!userChallenge && userChallenge.status === 'active',
    isComplete: progress?.is_complete || userChallenge?.status === 'completed',
    canClaim: progress?.is_complete && userChallenge?.status === 'active',
  };
}
