import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VaultItem {
  id: string;
  title: string;
  type: string;
  channel: string | null;
  status: string;
  planned_creation_date: string | null;
  planned_publish_date: string | null;
}

interface UseContentVaultItemsOptions {
  /** Only fetch items without publish dates (unscheduled) */
  unscheduledOnly?: boolean;
  /** Search filter */
  search?: string;
  /** Platform filter */
  platform?: string;
  /** Limit results */
  limit?: number;
}

export function useContentVaultItems(options: UseContentVaultItemsOptions = {}) {
  const { user } = useAuth();
  const { unscheduledOnly = false, search = '', platform, limit = 100 } = options;

  const query = useQuery({
    queryKey: ['content-vault-items', user?.id, unscheduledOnly, search, platform, limit],
    queryFn: async (): Promise<VaultItem[]> => {
      if (!user?.id) return [];

      let q = supabase
        .from('content_items')
        .select('id, title, type, channel, status, planned_creation_date, planned_publish_date')
        .eq('user_id', user.id)
        .neq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unscheduledOnly) {
        q = q.is('planned_publish_date', null);
      }

      if (search) {
        q = q.ilike('title', `%${search}%`);
      }

      if (platform) {
        q = q.eq('channel', platform);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
