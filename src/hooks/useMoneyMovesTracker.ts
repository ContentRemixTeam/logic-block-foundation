import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MoneyTrack } from '@/constants/moneyMovesConfig';
import type { DiagnosticAnswers } from '@/lib/moneyMovesDiagnosis';
import { getRung } from '@/data/moneyMovesLadder';

export interface TrackerAction {
  id: string;
  label: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string;
  proof_url: string;
  community_post_copied: boolean;
  community_post_shared: boolean;
}

export interface MoneyMovesTracker {
  id: string;
  user_id: string;
  track: MoneyTrack;
  rung: number;
  move_title: string | null;
  move_why: string | null;
  goal: string | null;
  block: string | null;
  actions: TrackerAction[];
  proof: Record<string, unknown>;
  community_posts: { diagnostic_shared?: boolean; all_done_shared?: boolean; sale_shared?: boolean };
  sale_logged: boolean;
  result_note: string | null;
  diagnostic_answers: DiagnosticAnswers | Record<string, never>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ['money-moves-tracker'];

function buildActionsForRung(track: MoneyTrack, rung: number): TrackerAction[] {
  const r = getRung(track, rung);
  const today = new Date();
  return r.defaultActions.map((a, i) => {
    const due = new Date(today);
    due.setDate(today.getDate() + a.dueOffsetDays);
    return {
      id: `action_${i + 1}`,
      label: a.label,
      due_date: due.toISOString().slice(0, 10),
      completed: false,
      completed_at: null,
      notes: '',
      proof_url: '',
      community_post_copied: false,
      community_post_shared: false,
    };
  });
}

export function useMoneyMovesTracker() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    enabled: !!user,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<MoneyMovesTracker | null> => {
      const { data, error } = await supabase
        .from('money_moves_sprint_trackers')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MoneyMovesTracker | null) ?? null;
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      track: MoneyTrack;
      rung: number;
      diagnostic_answers: DiagnosticAnswers;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const r = getRung(input.track, input.rung);
      const actions = buildActionsForRung(input.track, input.rung);

      // Replace existing tracker (retake support)
      await supabase.from('money_moves_sprint_trackers').delete().eq('user_id', user.id);

      const { data, error } = await supabase
        .from('money_moves_sprint_trackers')
        .insert([{
          user_id: user.id,
          track: input.track,
          rung: input.rung,
          move_title: r.moveTitle,
          move_why: r.moveWhy,
          actions: actions as unknown as never,
          diagnostic_answers: input.diagnostic_answers as unknown as never,
        }])
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<MoneyMovesTracker>) => {
      if (!user || !query.data) throw new Error('No tracker');
      const { data, error } = await supabase
        .from('money_moves_sprint_trackers')
        .update(patch as Record<string, unknown>)
        .eq('id', query.data.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<MoneyMovesTracker | null>(KEY);
      if (prev) qc.setQueryData(KEY, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { tracker: query.data ?? null, isLoading: query.isLoading, create, update };
}
