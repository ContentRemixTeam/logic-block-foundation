import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMastermindSuccessPath } from '@/hooks/useMastermindSuccessPath';

// Phase One migrations can land before generated client types are refreshed.
// Keep this boundary local and validate every returned shape before rendering.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

export interface PhaseOneState {
  user_id: string;
  cycle_id: string | null;
  current_step: 'plan' | 'workspace' | 'connector' | 'complete';
  plan_ready_at: string | null;
  workspace_provider: 'claude' | 'codex' | null;
  workspace_status: 'not_started' | 'in_progress' | 'ready';
  connector_status: 'not_started' | 'connected' | 'verified';
  test_proposal_id: string | null;
  test_task_id: string | null;
  completed_at: string | null;
}

export interface PhaseOneResource {
  portal_resource_id: string;
  title: string;
  duration_seconds: number | null;
  completed: boolean;
  last_position_seconds: number;
  stages: string[];
}

export interface PlannerProposal {
  proposal_id: string;
  task_text: string;
  task_description: string | null;
  why_this_task: string | null;
  done_enough: string | null;
  evidence_target: string | null;
  suggested_date: string | null;
  priority: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_task_id: string | null;
  connection_key_id: string | null;
}

export interface CoachingContext {
  phase?: Record<string, unknown>;
  plan?: {
    cycleId?: string;
    result?: string;
    outcome?: string;
    focus?: string;
    bottleneck?: string;
    minimumMove?: string;
    evidenceTargets?: Record<string, unknown>;
  } | null;
  videos?: { started?: number; completed?: number };
  pendingTaskProposals?: number;
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

export function useMastermindPhaseOne() {
  const successPath = useMastermindSuccessPath();
  const [phaseState, setPhaseState] = useState<PhaseOneState | null>(null);
  const [resources, setResources] = useState<PhaseOneResource[]>([]);
  const [proposals, setProposals] = useState<PlannerProposal[]>([]);
  const [coachingContext, setCoachingContext] = useState<CoachingContext | null>(null);
  const [hasAiKey, setHasAiKey] = useState(false);
  const [hasActiveConnectionKey, setHasActiveConnectionKey] = useState(false);
  const [hasUsedConnectionKey, setHasUsedConnectionKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cycle = successPath.data?.cycle ?? null;
  const planReady = Boolean(
    cycle?.cycle_id
    && cycle.goal?.trim()
    && cycle.focus_area?.trim()
    && successPath.data?.hasConfirmedStage,
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sign in to continue Phase One.');
      const [stateResult, resourceResult, proposalResult, contextResult, keyResult, connectionKeyResult] = await Promise.all([
        db.from('mastermind_phase_one_state').select('*').eq('user_id', auth.user.id).maybeSingle(),
        db.rpc('search_my_mastermind_phase_one_resources', { p_query: null, p_stage: successPath.data?.selectedStageId ?? null, p_limit: 20 }),
        db.from('ai_planner_task_proposals').select('proposal_id,task_text,task_description,why_this_task,done_enough,evidence_target,suggested_date,priority,status,approved_task_id,connection_key_id').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(20),
        db.rpc('get_my_mastermind_phase_one_coaching_context'),
        db.from('user_api_keys').select('provider,key_status').eq('user_id', auth.user.id),
        db.from('ai_connection_keys').select('id,last_used_at').eq('user_id', auth.user.id).is('revoked_at', null).limit(10),
      ]);
      if (stateResult.error) throw stateResult.error;
      if (resourceResult.error) throw resourceResult.error;
      if (proposalResult.error) throw proposalResult.error;
      if (contextResult.error) throw contextResult.error;
      setPhaseState(stateResult.data as PhaseOneState | null);
      setResources(Array.isArray(resourceResult.data) ? resourceResult.data as PhaseOneResource[] : []);
      setProposals(Array.isArray(proposalResult.data) ? proposalResult.data as PlannerProposal[] : []);
      setCoachingContext(isObject(contextResult.data) ? contextResult.data as CoachingContext : null);
      setHasAiKey(Array.isArray(keyResult.data) && keyResult.data.some((row: { key_status?: string }) => row.key_status !== 'invalid'));
      setHasActiveConnectionKey(Array.isArray(connectionKeyResult.data) && connectionKeyResult.data.length > 0);
      setHasUsedConnectionKey(Array.isArray(connectionKeyResult.data) && connectionKeyResult.data.some((row: { last_used_at?: string | null }) => Boolean(row.last_used_at)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Phase One could not load.');
    } finally {
      setIsLoading(false);
    }
  }, [successPath.data?.selectedStageId]);

  useEffect(() => { if (!successPath.isLoading) void load(); }, [load, successPath.isLoading]);

  useEffect(() => {
    if (!isLoading) void db.rpc('record_my_mastermind_activity', { p_event_type: 'phase_one_opened', p_safe_metadata: {} });
  }, [isLoading]);

  const saveState = useCallback(async (changes: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await db.rpc('save_my_mastermind_phase_one_state', changes);
      if (saveError) throw saveError;
      setPhaseState(data as PhaseOneState);
      return data as PhaseOneState;
    } finally { setIsSaving(false); }
  }, []);

  const syncPlanReady = useCallback(async () => {
    if (!cycle?.cycle_id) throw new Error('Finish your 90-day plan first.');
    const saved = await saveState({ p_cycle_id: cycle.cycle_id, p_current_step: 'workspace', p_plan_ready: planReady });
    if (planReady) await db.rpc('record_my_mastermind_activity', { p_event_type: 'plan_ready', p_safe_metadata: { cycleId: cycle.cycle_id } });
    return saved;
  }, [cycle?.cycle_id, planReady, saveState]);

  const saveWorkspaceReady = useCallback(async (provider: 'claude' | 'codex') => {
    const saved = await saveState({ p_cycle_id: cycle?.cycle_id ?? null, p_current_step: 'connector', p_workspace_provider: provider, p_workspace_status: 'ready' });
    await db.rpc('record_my_mastermind_activity', { p_event_type: 'workspace_ready', p_safe_metadata: { provider, packetVersion: 'phase-one-workspace-v1' } });
    return saved;
  }, [cycle?.cycle_id, saveState]);

  const createConnectionTest = useCallback(async () => {
    if (!cycle?.cycle_id) throw new Error('Finish your 90-day plan first.');
    setIsSaving(true);
    try {
      const { data, error: proposalError } = await db.rpc('propose_my_phase_one_connection_test_task', { p_cycle_id: cycle.cycle_id });
      if (proposalError) throw proposalError;
      await load();
      return data as PlannerProposal;
    } finally { setIsSaving(false); }
  }, [cycle?.cycle_id, load]);

  const reviewProposal = useCallback(async (proposalId: string, decision: 'approved' | 'rejected') => {
    setIsSaving(true);
    try {
      const { data, error: reviewError } = await db.rpc('review_ai_planner_task_proposal', { p_proposal_id: proposalId, p_decision: decision });
      if (reviewError) throw reviewError;
      const receipt = data as { proposal_id: string; task_id: string | null; receipt_id: string; state: string };
      if (decision === 'approved' && receipt.task_id) {
        const reviewed = proposals.find((proposal) => proposal.proposal_id === proposalId);
        if (reviewed?.connection_key_id) {
          await saveState({ p_cycle_id: cycle?.cycle_id ?? null, p_current_step: 'complete', p_connector_status: 'verified', p_test_proposal_id: receipt.proposal_id, p_test_task_id: receipt.task_id });
          await db.rpc('record_my_mastermind_activity', { p_event_type: 'connector_verified', p_safe_metadata: { receiptId: receipt.receipt_id } });
        }
      }
      await load();
      return receipt;
    } finally { setIsSaving(false); }
  }, [cycle?.cycle_id, load, proposals, saveState]);

  const searchResources = useCallback(async (query: string) => {
    const clean = query.trim();
    if (clean.length < 2) return [];
    const { data, error: searchError } = await db.rpc('search_my_mastermind_phase_one_resources', { p_query: clean.slice(0, 160), p_stage: successPath.data?.selectedStageId ?? null, p_limit: 3 });
    if (searchError) throw searchError;
    await db.rpc('record_my_mastermind_activity', { p_event_type: 'resource_searched', p_safe_metadata: { queryLength: clean.length, resultCount: Array.isArray(data) ? data.length : 0 } });
    return Array.isArray(data) ? data as PhaseOneResource[] : [];
  }, [successPath.data?.selectedStageId]);

  const pendingProposal = useMemo(() => proposals.find((proposal) => proposal.status === 'pending' && proposal.connection_key_id) ?? null, [proposals]);
  const hasVerifiedExternalConnection = useMemo(() => hasActiveConnectionKey && hasUsedConnectionKey && proposals.some((proposal) => proposal.status === 'approved' && Boolean(proposal.connection_key_id) && Boolean(proposal.approved_task_id)), [hasActiveConnectionKey, hasUsedConnectionKey, proposals]);

  return {
    successPath,
    cycle,
    planReady,
    phaseState,
    resources,
    proposals,
    pendingProposal,
    coachingContext,
    hasAiKey,
    hasActiveConnectionKey,
    hasVerifiedExternalConnection,
    isLoading: isLoading || successPath.isLoading,
    isSaving: isSaving || successPath.isSaving,
    error: error || successPath.error,
    refetch: load,
    syncPlanReady,
    saveWorkspaceReady,
    createConnectionTest,
    reviewProposal,
    searchResources,
  };
}
