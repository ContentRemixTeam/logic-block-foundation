/**
 * Imperative reader for user_settings — used by callsites that previously
 * invoked the get-user-settings edge function inside useEffect/useCallback.
 * Pulls from the shared React Query cache (or fetches once if cold), so all
 * sites converge on a single network request.
 */
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Row = Tables<'user_settings'>;

export async function ensureUserSettings(
  queryClient: QueryClient,
  userId: string
): Promise<Row | null> {
  return queryClient.ensureQueryData({
    queryKey: ['user_settings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('[ensureUserSettings] failed:', error);
        return null;
      }
      if (data) return data as Row;

      const { data: created } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: userId,
            daily_review_questions: [],
            weekly_review_questions: [],
            monthly_review_questions: [],
            cycle_summary_questions: [],
            theme_preference: 'vibrant',
            xp_points: 0,
            user_level: 1,
            streak_potions_remaining: 2,
            current_debrief_streak: 0,
            longest_debrief_streak: 0,
          },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
        .select()
        .maybeSingle();
      return (created as Row) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
