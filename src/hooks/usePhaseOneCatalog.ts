import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Server-authorized Mastermind curriculum catalog.
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

export interface PhaseOneCurriculumMomentRow {
  portal_resource_id: string;
  title: string | null;
  category_title: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  moment_id: string;
  snippet: string | null;
  duration_seconds: number | null;
  completed: boolean | null;
}

export type PhaseOneStep = 'plan' | 'workspace' | 'connector' | 'complete';
export type PhaseOneWorkspaceStatus = 'not_started' | 'in_progress' | 'ready';
export type PhaseOneConnectorStatus = 'not_started' | 'connected' | 'verified';

export interface PhaseOneStateRow {
  cycle_id: string | null;
  current_step: PhaseOneStep;
  plan_ready_at: string | null;
  workspace_provider: string | null;
  workspace_status: PhaseOneWorkspaceStatus;
  workspace_ready_at: string | null;
  connector_status: PhaseOneConnectorStatus;
  connector_verified_at: string | null;
  completed_at: string | null;
  updated_at: string;
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
      }).rpc('search_my_mastermind_phase_one_resources', { p_query: null, p_stage: null, p_limit: 200 });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as PhaseOneCatalogRow[];
    },
  });
}

export function usePhaseOneCurriculumMomentSearch(query: string, stage: string | null | undefined, enabled = true, preview = false) {
  const normalizedQuery = query.trim().slice(0, 160);
  const normalizedStage = stage?.trim() || null;

  return useQuery({
    queryKey: ['phase-one-curriculum-moments', preview ? 'preview' : 'member', normalizedQuery, normalizedStage ?? 'all'],
    enabled: enabled && normalizedQuery.length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<PhaseOneCurriculumMomentRow[]> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc('search_my_mastermind_curriculum_moments', {
        p_query: normalizedQuery,
        p_stage: normalizedStage,
        p_limit: 12,
        p_preview: preview,
      });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as PhaseOneCurriculumMomentRow[];
    },
  });
}

export function usePhaseOneState(enabled = true) {
  return useQuery({
    queryKey: ['phase-one-state'],
    enabled,
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<PhaseOneStateRow | null> => {
      const { data, error } = await supabase
        .from('mastermind_phase_one_state')
        .select('cycle_id,current_step,plan_ready_at,workspace_provider,workspace_status,workspace_ready_at,connector_status,connector_verified_at,completed_at,updated_at')
        .maybeSingle();
      if (error) throw error;
      return data as PhaseOneStateRow | null;
    },
  });
}

export async function savePhaseOneState(input: {
  cycleId?: string | null;
  currentStep?: PhaseOneStep;
  planReady?: boolean;
  workspaceStatus?: PhaseOneWorkspaceStatus;
  connectorStatus?: PhaseOneConnectorStatus;
}): Promise<PhaseOneStateRow> {
  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc('save_my_mastermind_phase_one_state', {
    p_cycle_id: input.cycleId ?? null,
    p_current_step: input.currentStep ?? null,
    p_plan_ready: input.planReady ?? null,
    p_workspace_status: input.workspaceStatus ?? null,
    p_connector_status: input.connectorStatus ?? null,
  });
  if (error) throw error;
  return data as PhaseOneStateRow;
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
