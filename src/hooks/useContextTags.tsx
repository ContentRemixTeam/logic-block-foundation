import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CONTEXT_TAGS } from '@/components/tasks/types';

export interface ContextTag {
  id: string;
  user_id: string;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export function useContextTags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's custom tags
  const { data: customTags = [], isLoading, refetch } = useQuery({
    queryKey: ['context-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-context-tags', {
        body: { action: 'list' }
      });

      if (error) throw error;
      return (data?.tags || []) as ContextTag[];
    },
  });

  // Seed default tags if user has none
  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-context-tags', {
        body: { action: 'seed-defaults' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.seeded) {
        queryClient.invalidateQueries({ queryKey: ['context-tags'] });
      }
    },
  });

  // Create new tag
  const createMutation = useMutation({
    mutationFn: async ({ label, icon }: { label: string; icon?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-context-tags', {
        body: { 
          action: 'create', 
          value: label.toLowerCase().replace(/\s+/g, '-'),
          label, 
          icon: icon || '🏷️' 
        }
      });
      if (error) throw error;
      return data?.tag as ContextTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-tags'] });
      toast({ title: 'Tag created!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to create tag', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update tag
  const updateMutation = useMutation({
    mutationFn: async ({ id, label, icon }: { id: string; label?: string; icon?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-context-tags', {
        body: { action: 'update', id, label, icon }
      });
      if (error) throw error;
      return data?.tag as ContextTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-tags'] });
      toast({ title: 'Tag updated!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to update tag', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete tag
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('manage-context-tags', {
        body: { action: 'delete', id }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-tags'] });
      toast({ title: 'Tag deleted' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to delete tag', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Combined tags - if user has custom tags, use those; otherwise fall back to defaults
  const tags = customTags.length > 0 
    ? customTags.map(t => ({ value: t.value, label: t.label, icon: t.icon, id: t.id }))
    : CONTEXT_TAGS.map(t => ({ ...t, id: t.value }));

  return {
    tags,
    customTags,
    isLoading,
    hasCustomTags: customTags.length > 0,
    refetch,
    seedDefaults: seedDefaultsMutation.mutate,
    createTag: createMutation.mutate,
    updateTag: updateMutation.mutate,
    deleteTag: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
