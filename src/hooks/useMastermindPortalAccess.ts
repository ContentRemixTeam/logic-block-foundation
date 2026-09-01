import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MastermindPortalAccessReceipt {
  allowed: boolean;
  memberEntitled: boolean;
  memberTier: string | null;
  memberScopes: string[];
  previewCapabilities: string[];
  previewActive: boolean;
  launchState: string | null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeAccessReceipt(value: unknown): MastermindPortalAccessReceipt {
  const data = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    allowed: data.allowed === true,
    memberEntitled: data.memberEntitled === true,
    memberTier: typeof data.memberTier === 'string' ? data.memberTier : null,
    memberScopes: stringArray(data.memberScopes),
    previewCapabilities: stringArray(data.previewCapabilities),
    previewActive: data.previewActive === true,
    launchState: typeof data.launchState === 'string' ? data.launchState : null,
  };
}

export function useMastermindPortalAccess(enabled = true, preview = false) {
  return useQuery({
    queryKey: ['mastermind-portal-access', preview ? 'preview' : 'member'],
    enabled,
    staleTime: 60_000,
    retry: 1,
    queryFn: async (): Promise<MastermindPortalAccessReceipt> => {
      const { data, error } = await supabase.functions.invoke('get-mastermind-portal-access', {
        body: { preview },
      });
      if (error) throw error;
      return normalizeAccessReceipt(data);
    },
  });
}
