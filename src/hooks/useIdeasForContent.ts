import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface IdeaForContent {
  id: string;
  content: string;
  category: string | null;
  notes: string | null;
  created_at: string;
}

interface UseIdeasForContentOptions {
  search?: string;
  limit?: number;
  enabled?: boolean;
}

export function useIdeasForContent({ 
  search = '', 
  limit = 50,
  enabled = true,
}: UseIdeasForContentOptions = {}) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['ideas-for-content', user?.id, search, limit],
    queryFn: async (): Promise<IdeaForContent[]> => {
      if (!user?.id) return [];

      let queryBuilder = supabase
        .from('ideas_db')
        .select('idea_id, idea, category, notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply text search if provided
      if (search.trim()) {
        queryBuilder = queryBuilder.ilike('idea', `%${search.trim()}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching ideas:', error);
        throw error;
      }

      return (data || []).map(idea => ({
        id: idea.idea_id,
        content: idea.idea || '',
        category: idea.category,
        notes: idea.notes,
        created_at: idea.created_at || '',
      }));
    },
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    ideas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
