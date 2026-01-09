import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Project, ProjectColumn } from '@/types/project';
import { useEffect } from 'react';
import { toast } from 'sonner';

export const projectQueryKeys = {
  all: ['projects'] as const,
  single: (id: string) => ['projects', id] as const,
};

export function useProjects() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: projectQueryKeys.all,
    queryFn: async () => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('get-projects', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return (data?.data || []) as Project[];
    },
    enabled: !!user && !!session,
    staleTime: 1000 * 60 * 2,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useProject(projectId: string | undefined) {
  const { data: projects } = useProjects();
  
  return projects?.find(p => p.id === projectId);
}

export function useProjectMutations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const createProject = useMutation({
    mutationFn: async (project: Partial<Project>) => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('manage-project', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'create', project },
      });

      if (error) throw error;
      return data?.data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      toast.success('Project created');
    },
    onError: (error) => {
      toast.error('Failed to create project');
      console.error('Create project error:', error);
    },
  });

  const updateProject = useMutation({
    mutationFn: async (project: Partial<Project> & { id: string }) => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('manage-project', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'update', project },
      });

      if (error) throw error;
      return data?.data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      toast.success('Project updated');
    },
    onError: (error) => {
      toast.error('Failed to update project');
      console.error('Update project error:', error);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      if (!session?.access_token) throw new Error('No session');

      const { error } = await supabase.functions.invoke('manage-project', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'delete', project: { id: projectId } },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success('Project deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete project');
      console.error('Delete project error:', error);
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async ({ templateId, newName, start_date, end_date }: { 
      templateId: string; 
      newName?: string; 
      start_date?: string;
      end_date?: string;
    }) => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('manage-project', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          action: 'duplicate_template', 
          project: { id: templateId, newName, start_date, end_date } 
        },
      });

      if (error) throw error;
      return data?.data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      toast.success('Project created from template');
    },
    onError: (error) => {
      toast.error('Failed to create from template');
      console.error('Duplicate template error:', error);
    },
  });

  return {
    createProject,
    updateProject,
    deleteProject,
    duplicateTemplate,
  };
}

// Hook for task-project operations
export function useTaskProjectMutations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const addToProject = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('manage-task', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          action: 'update', 
          task_id: taskId, 
          project_id: projectId,
          project_column: 'todo',
        },
      });

      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      toast.success('Task added to project');
    },
  });

  const removeFromProject = useMutation({
    mutationFn: async (taskId: string) => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('manage-task', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          action: 'update', 
          task_id: taskId, 
          project_id: null,
          project_column: 'todo',
        },
      });

      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      toast.success('Task removed from project');
    },
  });

  const updateProjectColumn = useMutation({
    mutationFn: async ({ taskId, column }: { taskId: string; column: ProjectColumn }) => {
      if (!session?.access_token) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('manage-task', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          action: 'update', 
          task_id: taskId, 
          project_column: column,
        },
      });

      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    },
  });

  return {
    addToProject,
    removeFromProject,
    updateProjectColumn,
  };
}
