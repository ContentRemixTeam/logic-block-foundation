import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSeason, getSeasonMeta } from '@/lib/businessSeasons';

const KEY = ['business_season'] as const;

/** Read & set the user's current Business Season preference. */
export function useBusinessSeason() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('business_season')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.business_season ?? null) as BusinessSeason | null;
    },
  });

  const setSeason = useMutation({
    mutationFn: async (season: BusinessSeason | null) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_profiles')
        .update({ business_season: season })
        .eq('id', user.id);
      if (error) throw error;
      return season;
    },
    onSuccess: (season) => {
      queryClient.setQueryData(KEY, season);
    },
  });

  return {
    season: query.data ?? null,
    seasonMeta: getSeasonMeta(query.data),
    isLoading: query.isLoading,
    setSeason: setSeason.mutate,
    isSaving: setSeason.isPending,
  };
}
