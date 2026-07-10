/**
 * Bare-minimum plan: the 1–3 tiny non-negotiables that make a day count.
 *
 * Two sources:
 *   1. `user_settings.bare_minimum_template` — user-defined default items
 *      (pre-shown each day, not auto-inserted as tasks so they stay reversible).
 *   2. Any task with `is_bare_minimum = true` scheduled for the given date.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useUserSettingsRow,
  useUserSettingsCache,
  type UserSettingsRow,
} from '@/hooks/useUserSettingsRow';
import { toast } from 'sonner';

export interface BareMinimumTemplateItem {
  id: string;                     // stable local id
  text: string;
  energy_cost?: 'low' | 'medium' | 'high' | null;
}

export interface BareMinimumTask {
  task_id: string;
  task_text: string;
  status: string | null;
  energy_cost: string | null;
  is_bare_minimum: boolean;
}

function readTemplate(raw: unknown): BareMinimumTemplateItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r, i) => {
      if (!r || typeof r !== 'object') return null;
      const o = r as Record<string, unknown>;
      const text = typeof o.text === 'string' ? o.text.trim() : '';
      if (!text) return null;
      const energy = o.energy_cost === 'low' || o.energy_cost === 'medium' || o.energy_cost === 'high'
        ? (o.energy_cost as BareMinimumTemplateItem['energy_cost'])
        : null;
      const id = typeof o.id === 'string' && o.id ? o.id : `t${i}-${text.slice(0, 12)}`;
      return { id, text, energy_cost: energy };
    })
    .filter((x): x is BareMinimumTemplateItem => !!x)
    .slice(0, 3);
}

/** Template CRUD (mounted in Settings → Planner). */
export function useBareMinimumTemplate() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useUserSettingsRow();
  const { patch } = useUserSettingsCache();

  const items = useMemo<BareMinimumTemplateItem[]>(
    () => readTemplate((settings as unknown as { bare_minimum_template?: unknown } | null)?.bare_minimum_template),
    [settings],
  );

  const save = useCallback(
    async (next: BareMinimumTemplateItem[]) => {
      if (!user) return;
      const trimmed = next.slice(0, 3);
      patch({ bare_minimum_template: trimmed as unknown as UserSettingsRow['bare_minimum_template'] });
      const { error } = await supabase
        .from('user_settings')
        .update({
          bare_minimum_template: trimmed as unknown as UserSettingsRow['bare_minimum_template'],
          updated_at: new Date().toISOString(),
        } as Partial<UserSettingsRow>)
        .eq('user_id', user.id);
      if (error) {
        toast.error("Couldn't save your bare-minimum list. Try again in a moment.");
      }
    },
    [user, patch],
  );

  return { items, save, isLoading };
}

/** Bare-minimum + energy-tagged tasks scheduled for a date. */
export function useBareMinimumTasks(dateISO: string) {
  const { user } = useAuth();
  const key = ['bare-minimum-tasks', user?.id, dateISO] as const;

  return useQuery({
    queryKey: key,
    enabled: !!user?.id && !!dateISO,
    staleTime: 30_000,
    queryFn: async (): Promise<BareMinimumTask[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('task_id, task_text, status, energy_cost, is_bare_minimum')
        .eq('user_id', user!.id)
        .eq('scheduled_date', dateISO)
        .eq('is_bare_minimum', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BareMinimumTask[];
    },
  });
}

/** Toggle any task's bare-minimum flag. Optimistic. */
export function useToggleBareMinimum() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, value }: { taskId: string; value: boolean }) => {
      if (!user) throw new Error('not signed in');
      const { error } = await supabase
        .from('tasks')
        .update({ is_bare_minimum: value })
        .eq('task_id', taskId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bare-minimum-tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error("Couldn't update that. Try again in a moment.");
    },
  });
}

/** Create a task from a template item on today's plan. */
export function useAddTemplateAsTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, dateISO }: { item: BareMinimumTemplateItem; dateISO: string }) => {
      if (!user) throw new Error('not signed in');
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        task_text: item.text,
        scheduled_date: dateISO,
        energy_cost: item.energy_cost ?? null,
        is_bare_minimum: true,
        status: 'scheduled',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bare-minimum-tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error("Couldn't add that to today. Try again in a moment.");
    },
  });
}
