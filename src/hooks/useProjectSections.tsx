import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ProjectSection, ProjectBoardSettings } from '@/types/project';

export const sectionQueryKeys = {
  byProject: (projectId: string) => ['project-sections', projectId] as const,
  settings: (projectId: string) => ['project-board-settings', projectId] as const,
};

export function useProjectSections(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: sectionQueryKeys.byProject(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProjectSection[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useProjectBoardSettings(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: sectionQueryKeys.settings(projectId || ''),
    queryFn: async () => {
      if (!projectId || !user) return null;
      const { data, error } = await supabase
        .from('project_board_settings')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ProjectBoardSettings | null;
    },
    enabled: !!user && !!projectId,
  });
}

export function useProjectSectionMutations(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createSection = useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get max sort_order
      const { data: existing } = await supabase
        .from('project_sections')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.sort_order ?? -1;

      const { data: section, error } = await supabase
        .from('project_sections')
        .insert({
          project_id: projectId,
          user_id: user.id,
          name: data.name,
          color: data.color || '#6366F1',
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionQueryKeys.byProject(projectId) });
      toast.success('Group created');
    },
    onError: () => {
      toast.error('Failed to create group');
    },
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('project_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionQueryKeys.byProject(projectId) });
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from('project_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionQueryKeys.byProject(projectId) });
      toast.success('Group deleted');
    },
    onError: () => {
      toast.error('Failed to delete group');
    },
  });

  const reorderSections = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('project_sections')
          .update({ sort_order: index })
          .eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionQueryKeys.byProject(projectId) });
    },
  });

  return { createSection, updateSection, deleteSection, reorderSections };
}

export function useProjectBoardSettingsMutations(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Pick<ProjectBoardSettings, 'visible_columns' | 'sort_by' | 'sort_direction'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_board_settings')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          ...updates,
        }, {
          onConflict: 'project_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionQueryKeys.settings(projectId) });
    },
  });

  return { updateSettings };
}
