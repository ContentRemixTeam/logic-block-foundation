import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  inferMastermindSuccessPath,
  type MastermindPlanCycle,
} from '@/lib/mastermindSuccessPath';

export function useMastermindSuccessPath() {
  return useQuery({
    queryKey: ['mastermind-success-path'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { cycle: null, successPath: null };
      }

      const { data, error } = await supabase
        .from('cycles_90_day')
        .select(`
          cycle_id,
          goal,
          start_date,
          end_date,
          focus_area,
          biggest_bottleneck,
          discover_score,
          nurture_score,
          convert_score,
          audience_target,
          audience_frustration,
          signature_message,
          why,
          low_energy_version,
          medium_energy_version,
          high_energy_version,
          updated_at
        `)
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const cycle = data as MastermindPlanCycle | null;

      return {
        cycle,
        successPath: inferMastermindSuccessPath(cycle),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
