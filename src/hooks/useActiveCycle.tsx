import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveCycle {
  cycle_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  focus_area: string | null;
  identity: string | null;
  biggest_bottleneck: string | null;
  revenue_goal: number | null;
}

export function useActiveCycle() {
  return useQuery({
    queryKey: ['active-cycle'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await supabase.functions.invoke('get-current-cycle-or-create', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        console.error('Error fetching active cycle:', response.error);
        return null;
      }

      const cycle = response.data?.data?.cycle || response.data?.cycle;
      if (!cycle) return null;

      // Fetch additional data: biggest_bottleneck from cycles_90_day and revenue_goal from cycle_revenue_plan
      const [bottleneckResult, revenueResult] = await Promise.all([
        supabase
          .from('cycles_90_day')
          .select('biggest_bottleneck')
          .eq('cycle_id', cycle.cycle_id)
          .maybeSingle(),
        supabase
          .from('cycle_revenue_plan')
          .select('revenue_goal')
          .eq('cycle_id', cycle.cycle_id)
          .maybeSingle(),
      ]);

      return {
        ...cycle,
        biggest_bottleneck: bottleneckResult.data?.biggest_bottleneck || null,
        revenue_goal: revenueResult.data?.revenue_goal || null,
      } as ActiveCycle;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAllCycles() {
  return useQuery({
    queryKey: ['all-cycles'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('cycles_90_day')
        .select('cycle_id, goal, start_date, end_date, focus_area')
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching cycles:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
