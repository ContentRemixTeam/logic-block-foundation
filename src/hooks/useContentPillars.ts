import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ContentPillar } from '@/types/contentChallenge';

export function useContentPillars() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pillarsQuery = useQuery({
    queryKey: ['content-pillars', user?.id],
    queryFn: async (): Promise<ContentPillar[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('content_pillars')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as ContentPillar[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const createPillar = useMutation({
    mutationFn: async (pillar: Omit<ContentPillar, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('content_pillars')
        .insert({
          user_id: user.id,
          name: pillar.name,
          description: pillar.description,
          color: pillar.color,
          emoji: pillar.emoji,
          is_active: pillar.is_active,
          sort_order: pillar.sort_order,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ContentPillar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-pillars'] });
    },
    onError: (error) => {
      console.error('Error creating pillar:', error);
      toast.error('Failed to create content pillar');
    },
  });

  const createPillars = useMutation({
    mutationFn: async (pillars: Omit<ContentPillar, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('content_pillars')
        .insert(
          pillars.map((pillar, index) => ({
            user_id: user.id,
            name: pillar.name,
            description: pillar.description,
            color: pillar.color,
            emoji: pillar.emoji,
            is_active: pillar.is_active,
            sort_order: index,
          }))
        )
        .select();

      if (error) throw error;
      return data as ContentPillar[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-pillars'] });
    },
    onError: (error) => {
      console.error('Error creating pillars:', error);
      toast.error('Failed to create content pillars');
    },
  });

  const updatePillar = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContentPillar> }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('content_pillars')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as ContentPillar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-pillars'] });
    },
    onError: (error) => {
      console.error('Error updating pillar:', error);
      toast.error('Failed to update content pillar');
    },
  });

  const deletePillar = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('content_pillars')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-pillars'] });
    },
    onError: (error) => {
      console.error('Error deleting pillar:', error);
      toast.error('Failed to delete content pillar');
    },
  });

  const reorderPillars = useMutation({
    mutationFn: async (pillarIds: string[]) => {
      if (!user) throw new Error('Not authenticated');

      // Update sort_order for each pillar
      const updates = pillarIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('content_pillars')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-pillars'] });
    },
    onError: (error) => {
      console.error('Error reordering pillars:', error);
      toast.error('Failed to reorder pillars');
    },
  });

  return {
    pillars: pillarsQuery.data || [],
    isLoading: pillarsQuery.isLoading,
    error: pillarsQuery.error,
    createPillar: createPillar.mutateAsync,
    createPillars: createPillars.mutateAsync,
    updatePillar: updatePillar.mutateAsync,
    deletePillar: deletePillar.mutateAsync,
    reorderPillars: reorderPillars.mutateAsync,
    isCreating: createPillar.isPending || createPillars.isPending,
    isUpdating: updatePillar.isPending,
    isDeleting: deletePillar.isPending,
  };
}
