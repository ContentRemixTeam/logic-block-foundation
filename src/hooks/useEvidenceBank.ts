import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type EvidenceCategory = 'win' | 'learning' | 'proof' | 'pride';

export interface EvidenceEntry {
  id: string;
  user_id: string;
  content: string;
  category: EvidenceCategory | null;
  entry_date: string;       // YYYY-MM-DD
  source: string | null;
  task_id: string | null;
  day_id: string | null;
  cycle_id: string | null;
  created_at: string;
  updated_at: string;
}

interface NewEvidence {
  content: string;
  category?: EvidenceCategory;
  entry_date?: string;
  source?: string;
  task_id?: string | null;
  day_id?: string | null;
  cycle_id?: string | null;
}

const KEY = ['evidence_bank'] as const;

export function useEvidenceBank(opts: { limit?: number; sinceDate?: string } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { limit = 50, sinceDate } = opts;

  const query = useQuery({
    queryKey: [...KEY, { limit, sinceDate }],
    enabled: !!user,
    staleTime: 1000 * 30,
    queryFn: async () => {
      let q = supabase
        .from('evidence_bank')
        .select('*')
        .eq('user_id', user!.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (sinceDate) q = q.gte('entry_date', sinceDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EvidenceEntry[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: async (entry: NewEvidence) => {
      if (!user) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        content: entry.content.trim(),
        category: entry.category ?? 'win',
        entry_date: entry.entry_date ?? new Date().toISOString().slice(0, 10),
        source: entry.source ?? 'manual',
        task_id: entry.task_id ?? null,
        day_id: entry.day_id ?? null,
        cycle_id: entry.cycle_id ?? null,
      };
      const { data, error } = await supabase
        .from('evidence_bank')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as EvidenceEntry;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evidence_bank').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    add: create.mutateAsync,
    isAdding: create.isPending,
    remove: remove.mutateAsync,
  };
}
