import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Server-authorized Phase One catalog.
 *
 * Playable state comes from `search_my_mastermind_phase_one_resources`, which
 * only returns core-curriculum lessons the signed-in identity may actually
 * watch. Never infer readiness from static catalog metadata.
 */
export interface PhaseOneCatalogRow {
  portal_resource_id: string;
  title: string | null;
  product_title: string | null;
  category_title: string | null;
  resource_type: string | null;
  duration_seconds: number | null;
  stages: string[] | null;
  success_paths: string[] | null;
  completed: boolean | null;
  last_position_seconds: number | null;
}

export function usePhaseOneCatalog(enabled = true) {
  return useQuery({
    queryKey: ['phase-one-catalog'],
    enabled,
    staleTime: 60_000,
    // Completion state is server-owned. Always revalidate on mount so a page
    // reload (or navigation from the preview page) never renders a stale
    // "not completed" checkoff from cache.
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<PhaseOneCatalogRow[]> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc('search_my_mastermind_phase_one_resources', { p_query: null, p_stage: null, p_limit: 50 });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as PhaseOneCatalogRow[];
    },
  });
}

/** Persist member-owned Phase One video progress through the validated RPC. */
export async function savePhaseOneVideoProgress(input: {
  portalResourceId: string;
  lastPositionSeconds?: number;
  watchedSeconds?: number;
  completed?: boolean;
  completionSource?: 'playback' | 'member_confirmed';
}): Promise<boolean> {
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
  }).rpc('save_my_mastermind_phase_one_video_progress', {
    p_portal_resource_id: input.portalResourceId,
    p_last_position_seconds: Math.max(0, Math.floor(input.lastPositionSeconds ?? 0)),
    p_watched_seconds: Math.max(0, Math.floor(input.watchedSeconds ?? 0)),
    p_completed: input.completed === true,
    p_completion_source: input.completionSource ?? 'playback',
  });
  return !error;
}
