import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveCycle {
  cycle_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  focus_area: string | null;
  identity: string | null;
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

      return response.data?.data?.cycle as ActiveCycle | null;
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
