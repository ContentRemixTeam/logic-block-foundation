import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { toast } from 'sonner';
import { startOfWeek, differenceInWeeks, format, parseISO } from 'date-fns';

export interface WeeklyTactic {
  id: string;
  user_id: string;
  cycle_id: string;
  tactic_text: string;
  sort_order: number;
  is_active: boolean;
}

export interface WeeklyScorecard {
  id: string;
  user_id: string;
  cycle_id: string;
  week_number: number;
  week_start_date: string;
  tactic_completions: Record<string, boolean>;
  execution_score: number | null;
  sprint_project_id: string | null;
  sprint_phase: string | null;
  belief_score: number | null;
  reflection_text: string | null;
  coaching_prompt_shown: boolean;
}

// Get current week number within a cycle
export function getWeekNumber(cycleStartDate: string): number {
  const cycleStart = startOfWeek(parseISO(cycleStartDate), { weekStartsOn: 1 });
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Math.max(1, differenceInWeeks(currentWeekStart, cycleStart) + 1);
}

export function useWeeklyTactics(cycleId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['weekly-tactics', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_weekly_tactics')
        .select('*')
        .eq('cycle_id', cycleId!)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as WeeklyTactic[];
    },
    enabled: !!user && !!cycleId,
  });

  const upsertTactic = useMutation({
    mutationFn: async (tactic: Partial<WeeklyTactic> & { tactic_text: string }) => {
      const { data, error } = await supabase
        .from('cycle_weekly_tactics')
        .upsert({
          ...tactic,
          user_id: user!.id,
          cycle_id: cycleId!,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-tactics', cycleId] });
    },
  });

  const deleteTactic = useMutation({
    mutationFn: async (tacticId: string) => {
      const { error } = await supabase
        .from('cycle_weekly_tactics')
        .delete()
        .eq('id', tacticId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-tactics', cycleId] });
    },
  });

  return { tactics: query.data ?? [], isLoading: query.isLoading, upsertTactic, deleteTactic };
}

export function useWeeklyScorecard(cycleId?: string, weekNumber?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['weekly-scorecard', cycleId, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_scorecards')
        .select('*')
        .eq('cycle_id', cycleId!)
        .eq('week_number', weekNumber!)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklyScorecard | null;
    },
    enabled: !!user && !!cycleId && !!weekNumber,
  });

  const upsertScorecard = useMutation({
    mutationFn: async (updates: Partial<WeeklyScorecard>) => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('weekly_scorecards')
        .upsert({
          user_id: user!.id,
          cycle_id: cycleId!,
          week_number: weekNumber!,
          week_start_date: weekStart,
          ...updates,
        }, { onConflict: 'user_id,cycle_id,week_number' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-scorecard'] });
      queryClient.invalidateQueries({ queryKey: ['all-scorecards'] });
    },
  });

  return { scorecard: query.data, isLoading: query.isLoading, upsertScorecard };
}

// Fetch ALL scorecards for a cycle (for the 12-week chart)
export function useAllScorecards(cycleId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-scorecards', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_scorecards')
        .select('*')
        .eq('cycle_id', cycleId!)
        .order('week_number');
      if (error) throw error;
      return data as WeeklyScorecard[];
    },
    enabled: !!user && !!cycleId,
  });
}

// Calculate execution score from tactic completions
export function calculateExecutionScore(
  completions: Record<string, boolean>,
  tactics: WeeklyTactic[]
): number {
  const activeTacticIds = tactics.filter(t => t.is_active).map(t => t.id);
  if (activeTacticIds.length === 0) return 0;
  const completed = activeTacticIds.filter(id => completions[id]).length;
  return Math.round((completed / activeTacticIds.length) * 100);
}

// Determine streak of consecutive scored weeks
export function calculateStreak(scorecards: WeeklyScorecard[]): number {
  if (!scorecards.length) return 0;
  const sorted = [...scorecards].sort((a, b) => b.week_number - a.week_number);
  let streak = 0;
  for (const sc of sorted) {
    if (sc.execution_score !== null && sc.execution_score !== undefined) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
