import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface Launch {
  id: string;
  name: string;
  cart_opens: string | null;
  cart_closes: string | null;
  status: string;
}

export function useLaunches() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['launches-dropdown', user?.id],
    queryFn: async (): Promise<Launch[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('launches')
        .select('id, name, cart_opens, cart_closes, status')
        .eq('user_id', user.id)
        .in('status', ['planning', 'active', 'scheduled', 'pre-launch', 'runway'])
        .order('cart_opens', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Format launch for dropdown display
  const formatLaunchOption = (launch: Launch): string => {
    if (launch.cart_opens) {
      const dateStr = format(new Date(launch.cart_opens), 'MMM d');
      return `${launch.name} (Opens: ${dateStr})`;
    }
    return launch.name;
  };

  return {
    launches: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    formatLaunchOption,
  };
}
