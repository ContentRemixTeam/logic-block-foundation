/**
 * Coaching Entries Hook
 * 
 * QA Checklist:
 * - [ ] open from task drawer
 * - [ ] open from weekly planner
 * - [ ] save coaching entry
 * - [ ] entry appears in task drawer log + coaching log page
 * - [ ] create tiny task and schedule it
 * - [ ] tiny task appears immediately on weekly timeline and daily planner
 * - [ ] user can only see their own entries (RLS)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CoachingEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  cycle_id: string | null;
  created_at: string;
  updated_at: string;
  context_summary: string | null;
  circumstance: string | null;
  thought: string | null;
  feeling: string | null;
  action: string | null;
  result: string | null;
  reframe_thought: string | null;
  tiny_next_action: string | null;
  create_tiny_task: boolean;
  schedule_tiny_task_at: string | null;
  shareable_post: string | null;
}

export interface CreateCoachingEntryParams {
  task_id?: string | null;
  cycle_id?: string | null;
  context_summary?: string;
  circumstance?: string;
  thought?: string;
  feeling?: string;
  action?: string;
  result?: string;
  reframe_thought?: string;
  tiny_next_action?: string;
  create_tiny_task?: boolean;
  schedule_tiny_task_at?: string | null;
}

export const coachingQueryKeys = {
  all: ['coaching-entries'] as const,
  byTask: (taskId: string) => ['coaching-entries', 'task', taskId] as const,
  byCycle: (cycleId: string) => ['coaching-entries', 'cycle', cycleId] as const,
};

export function useCoachingEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachingQueryKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CoachingEntry[];
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

export function useCoachingEntriesForTask(taskId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachingQueryKeys.byTask(taskId || ''),
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('coaching_entries')
        .select('*')
        .eq('user_id', user!.id)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as CoachingEntry[];
    },
    enabled: !!user && !!taskId,
    staleTime: 1000 * 60,
  });
}

export function useCoachingMutations() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const createEntry = useMutation({
    mutationFn: async (params: CreateCoachingEntryParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('coaching_entries')
        .insert({
          user_id: user.id,
          ...params,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: coachingQueryKeys.all });
      if (entry.task_id) {
        queryClient.invalidateQueries({ queryKey: coachingQueryKeys.byTask(entry.task_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to create coaching entry:', error);
      toast.error('Failed to save coaching entry');
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CoachingEntry> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('coaching_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: coachingQueryKeys.all });
      if (entry.task_id) {
        queryClient.invalidateQueries({ queryKey: coachingQueryKeys.byTask(entry.task_id) });
      }
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('coaching_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachingQueryKeys.all });
    },
  });

  return {
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
