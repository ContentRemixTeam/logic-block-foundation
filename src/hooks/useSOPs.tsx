import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SOP } from '@/components/tasks/types';

export function useSOPs() {
  return useQuery({
    queryKey: ['sops'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke('get-sops', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Error fetching SOPs:', response.error);
        throw new Error('Failed to fetch SOPs');
      }

      return (response.data?.sops || []) as SOP[];
    },
  });
}
