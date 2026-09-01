import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AiProjectPackId } from '@/lib/mastermindAiStudio';

export const MASTERMIND_AI_STUDIO_UNLOCKS_QUERY_KEY = ['mastermind-ai-studio-unlocks'] as const;

export interface MastermindAiAssetUnlockRow {
  pack_id: AiProjectPackId;
  unlock_month: string;
  cycle_id: string | null;
  confirmed_at: string;
}

export interface MastermindAiAssetUnlockReceipt {
  confirmed: boolean;
  packId: AiProjectPackId | null;
  currentPackId: AiProjectPackId | null;
  unlockMonth: string | null;
  confirmedAt: string | null;
  alreadyConfirmed: boolean;
  conflict: boolean;
  consumedMonthlyUnlock: boolean;
  access: 'monthly' | 'full_library' | null;
}

const monthlyUnlockablePackIds = new Set<AiProjectPackId>([
  'offer-lab',
  'discovery-engine',
  'nurture-desk',
  'sales-room',
  'customer-results-lab',
  'workflow-systems-lab',
]);

function asPackId(value: unknown): AiProjectPackId | null {
  return typeof value === 'string' && monthlyUnlockablePackIds.has(value as AiProjectPackId)
    ? value as AiProjectPackId
    : null;
}

function normalizeReceipt(value: unknown): MastermindAiAssetUnlockReceipt {
  const data = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    confirmed: data.confirmed === true,
    packId: asPackId(data.packId ?? data.pack_id),
    currentPackId: asPackId(data.currentPackId ?? data.current_pack_id),
    unlockMonth: typeof (data.unlockMonth ?? data.unlock_month) === 'string'
      ? String(data.unlockMonth ?? data.unlock_month)
      : null,
    confirmedAt: typeof (data.confirmedAt ?? data.confirmed_at) === 'string'
      ? String(data.confirmedAt ?? data.confirmed_at)
      : null,
    alreadyConfirmed: data.alreadyConfirmed === true || data.already_confirmed === true,
    conflict: data.conflict === true,
    consumedMonthlyUnlock: data.consumedMonthlyUnlock === true || data.consumed_monthly_unlock === true,
    access: data.access === 'monthly' || data.access === 'full_library' ? data.access : null,
  };
}

export function useMastermindAiStudioUnlocks(enabled = true) {
  return useQuery({
    queryKey: MASTERMIND_AI_STUDIO_UNLOCKS_QUERY_KEY,
    enabled,
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<MastermindAiAssetUnlockRow[]> => {
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => Promise<{ data: unknown; error: unknown }>;
        };
      })
        .from('mastermind_ai_asset_unlocks')
        .select('pack_id,unlock_month,cycle_id,confirmed_at');

      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map((row) => row as Partial<MastermindAiAssetUnlockRow>)
        .filter((row): row is MastermindAiAssetUnlockRow => Boolean(asPackId(row.pack_id)));
    },
  });
}

export async function confirmMastermindAiAssetUnlock(input: {
  packId: AiProjectPackId;
  cycleId?: string | null;
}): Promise<MastermindAiAssetUnlockReceipt> {
  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc('confirm_my_mastermind_ai_asset_unlock', {
    p_pack_id: input.packId,
    p_cycle_id: input.cycleId ?? null,
  });

  if (error) throw error;
  return normalizeReceipt(data);
}
