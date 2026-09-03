import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/components/tasks/types';

export const SCORECARD_CAPABILITY = 'scorecard.core';

export type ScorecardCadence = 'daily' | 'weekly';

export interface ScorecardAction {
  id: string;
  user_id: string;
  cycle_id: string | null;
  action_text: string;
  category: string | null;
  cadence: ScorecardCadence;
  scheduled_days: number[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScorecardActionInput {
  id?: string;
  action_text: string;
  category?: string | null;
  cadence: ScorecardCadence;
  scheduled_days: number[];
  cycle_id?: string | null;
  sort_order?: number;
}

function weekKey(date: Date) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function useProductCapabilities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-capabilities', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_product_capabilities');
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
}

export function useScorecardActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['scorecard-actions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scorecard_actions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('sort_order')
        .order('created_at');

      if (error) throw error;
      return (data ?? []) as ScorecardAction[];
    },
    enabled: Boolean(user),
  });

  const saveAction = useMutation({
    mutationFn: async (input: ScorecardActionInput) => {
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        user_id: user!.id,
        action_text: input.action_text.trim(),
        category: input.category?.trim() || null,
        cadence: input.cadence,
        scheduled_days: [...new Set(input.scheduled_days)].sort((a, b) => a - b),
        cycle_id: input.cycle_id || null,
        sort_order: input.sort_order ?? query.data?.length ?? 0,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('scorecard_actions')
        .upsert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data as ScorecardAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecard-actions'] });
      queryClient.invalidateQueries({ queryKey: ['scorecard-week'] });
    },
  });

  const archiveAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('scorecard_actions')
        .update({ is_active: false })
        .eq('id', actionId)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecard-actions'] });
      queryClient.invalidateQueries({ queryKey: ['scorecard-week'] });
    },
  });

  return {
    actions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveAction,
    archiveAction,
  };
}

export function useScorecardWeek(selectedDate: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const selectedWeek = useMemo(() => weekKey(selectedDate), [selectedDate]);

  const query = useQuery({
    queryKey: ['scorecard-week', user?.id, selectedWeek],
    queryFn: async () => {
      const { error: syncError } = await supabase.rpc('sync_scorecard_week', {
        p_week_start: selectedWeek,
      });
      if (syncError) throw syncError;

      const weekEnd = format(addDays(new Date(`${selectedWeek}T12:00:00`), 6), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .not('scorecard_action_id', 'is', null)
        .gte('scheduled_date', selectedWeek)
        .lte('scheduled_date', weekEnd)
        .is('deleted_at', null)
        .order('scheduled_date')
        .order('day_order');

      if (error) throw error;
      return (data ?? []) as Task[];
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`scorecard-week-${user.id}-${selectedWeek}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['scorecard-week', user.id, selectedWeek] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, selectedWeek, user]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['scorecard-week', user?.id, selectedWeek] });
  }, [queryClient, selectedWeek, user?.id]);

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    selectedWeek,
    refresh,
  };
}

export function useOptionalActiveCycle() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scorecard-active-cycle', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('cycles_90_day')
        .select('cycle_id, goal, start_date, end_date')
        .eq('user_id', user!.id)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
}
