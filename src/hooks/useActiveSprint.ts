import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, differenceInDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type RevenueSprint = Database['public']['Tables']['revenue_sprints']['Row'];
type SprintDailyProgress = Database['public']['Tables']['sprint_daily_progress']['Row'];
type SprintActionMetrics = Database['public']['Tables']['sprint_action_metrics']['Row'];

export interface ActiveSprintData {
  sprint: RevenueSprint;
  dailyProgress: SprintDailyProgress[];
  actionMetrics: SprintActionMetrics[];
  currentDay: number;
  totalDays: number;
  daysRemaining: number;
  totalRevenue: number;
  dailyTarget: number;
  percentComplete: number;
  isWorkingDay: boolean;
  todayProgress: SprintDailyProgress | null;
}

export function useActiveSprint() {
  return useQuery({
    queryKey: ['active-sprint'],
    queryFn: async (): Promise<ActiveSprintData | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Get active sprint
      const { data: sprint, error } = await supabase
        .from('revenue_sprints')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !sprint) return null;

      // Check if sprint is within date range
      const today = new Date();
      const startDate = parseISO(sprint.sprint_start_date!);
      const endDate = parseISO(sprint.sprint_end_date!);

      if (!isWithinInterval(today, { start: startDate, end: endDate })) {
        return null;
      }

      // Get daily progress
      const { data: dailyProgress } = await supabase
        .from('sprint_daily_progress')
        .select('*')
        .eq('sprint_id', sprint.id)
        .order('date', { ascending: true });

      // Get action metrics
      const { data: actionMetrics } = await supabase
        .from('sprint_action_metrics')
        .select('*')
        .eq('sprint_id', sprint.id);

      // Calculate stats
      const currentDay = differenceInDays(today, startDate) + 1;
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const daysRemaining = Math.max(0, totalDays - currentDay + 1);

      // Calculate total revenue from daily progress
      const totalRevenue = (dailyProgress || []).reduce(
        (sum, p) => sum + (p.actual_revenue || 0), 
        0
      );

      const percentComplete = sprint.gap_to_close && sprint.gap_to_close > 0 
        ? Math.round((totalRevenue / sprint.gap_to_close) * 100)
        : 0;

      // Check if today is a working day
      const workingDays = (sprint.working_days as number[]) || [];
      const todayDayOfWeek = today.getDay();
      const isWorkingDay = workingDays.includes(todayDayOfWeek);

      // Get today's progress
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayProgress = (dailyProgress || []).find(p => p.date === todayStr) || null;

      return {
        sprint,
        dailyProgress: dailyProgress || [],
        actionMetrics: actionMetrics || [],
        currentDay,
        totalDays,
        daysRemaining,
        totalRevenue,
        dailyTarget: sprint.daily_target || 0,
        percentComplete,
        isWorkingDay,
        todayProgress,
      };
    },
    staleTime: 30 * 1000,
  });
}

export function useSprintMutations() {
  const queryClient = useQueryClient();

  const updateDailyProgress = useMutation({
    mutationFn: async ({
      sprintId,
      date,
      revenue,
      actionsCompleted,
      whatWorked,
      whatDidntWork,
      hitTarget,
    }: {
      sprintId: string;
      date: string;
      revenue?: number;
      actionsCompleted?: string[];
      whatWorked?: string;
      whatDidntWork?: string;
      hitTarget?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check if record exists
      const { data: existing } = await supabase
        .from('sprint_daily_progress')
        .select('id')
        .eq('sprint_id', sprintId)
        .eq('date', date)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('sprint_daily_progress')
          .update({
            actual_revenue: revenue,
            actions_completed: actionsCompleted as any,
            what_worked: whatWorked,
            what_didnt_work: whatDidntWork,
            hit_target: hitTarget,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('sprint_daily_progress')
          .insert({
            sprint_id: sprintId,
            user_id: session.user.id,
            date,
            actual_revenue: revenue || 0,
            actions_completed: actionsCompleted as any,
            what_worked: whatWorked,
            what_didnt_work: whatDidntWork,
            hit_target: hitTarget || false,
            daily_target: 0, // Will be calculated
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
    },
    onError: () => {
      toast.error('Failed to save progress');
    },
  });

  const pauseSprint = useMutation({
    mutationFn: async ({
      sprintId,
      reason,
      resumeDate,
    }: {
      sprintId: string;
      reason?: string;
      resumeDate?: string;
    }) => {
      const { error } = await supabase
        .from('revenue_sprints')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          pause_reason: reason,
          resume_date: resumeDate,
        })
        .eq('id', sprintId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
      toast.success('Sprint paused');
    },
    onError: () => {
      toast.error('Failed to pause sprint');
    },
  });

  const resumeSprint = useMutation({
    mutationFn: async (sprintId: string) => {
      const { error } = await supabase
        .from('revenue_sprints')
        .update({
          status: 'active',
          paused_at: null,
          pause_reason: null,
          resume_date: null,
        })
        .eq('id', sprintId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
      toast.success('Sprint resumed!');
    },
    onError: () => {
      toast.error('Failed to resume sprint');
    },
  });

  const endSprintEarly = useMutation({
    mutationFn: async (sprintId: string) => {
      const { error } = await supabase
        .from('revenue_sprints')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sprintId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
      toast.success('Sprint completed');
    },
    onError: () => {
      toast.error('Failed to end sprint');
    },
  });

  const updateActionMetrics = useMutation({
    mutationFn: async ({
      sprintId,
      actionName,
      attempts,
      responses,
      conversions,
      revenue,
    }: {
      sprintId: string;
      actionName: string;
      attempts?: number;
      responses?: number;
      conversions?: number;
      revenue?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check if exists
      const { data: existing } = await supabase
        .from('sprint_action_metrics')
        .select('id')
        .eq('sprint_id', sprintId)
        .eq('action_name', actionName)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('sprint_action_metrics')
          .update({
            attempts,
            responses,
            conversions,
            revenue_generated: revenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sprint_action_metrics')
          .insert({
            sprint_id: sprintId,
            user_id: session.user.id,
            action_name: actionName,
            attempts: attempts || 0,
            responses: responses || 0,
            conversions: conversions || 0,
            revenue_generated: revenue || 0,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
    },
    onError: () => {
      toast.error('Failed to update metrics');
    },
  });

  return {
    updateDailyProgress,
    pauseSprint,
    resumeSprint,
    endSprintEarly,
    updateActionMetrics,
  };
}
