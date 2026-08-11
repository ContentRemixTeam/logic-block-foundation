import { supabase } from '@/integrations/supabase/client';

const REQUEST_STORAGE_PREFIX = 'cycle_plan_reconciliation_request_v1';
const PLAN_STORAGE_PREFIX = 'cycle_plan_identity_v1';

function requestStorageKey(userId: string): string {
  return `${REQUEST_STORAGE_PREFIX}:${userId}`;
}

function planStorageKey(userId: string): string {
  return `${PLAN_STORAGE_PREFIX}:${userId}`;
}

export function getOrCreateCyclePlanKey(userId: string): string {
  const storageKey = planStorageKey(userId);
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const planKey = crypto.randomUUID();
  window.localStorage.setItem(storageKey, planKey);
  return planKey;
}

export function clearCyclePlanKey(userId: string, planKey: string): void {
  const storageKey = planStorageKey(userId);
  if (window.localStorage.getItem(storageKey) === planKey) {
    window.localStorage.removeItem(storageKey);
  }
}

export type SuccessPathStageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';

export interface CyclePlanReconciliationTask {
  generation_key: string;
  task_text: string;
  task_description?: string | null;
  scheduled_date?: string | null;
  planned_day?: string | null;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  context_tags?: string[];
}

export interface CyclePlanReconciliationPayload {
  payload_version: 'cycle-plan-v1';
  plan_key: string;
  cycle_id?: string | null;
  cycle: {
    start_date: string;
    end_date: string;
    goal: string;
    why?: string | null;
    identity?: string | null;
    target_feeling?: string | null;
    supporting_projects?: string[];
    discover_score?: number;
    nurture_score?: number;
    convert_score?: number;
    focus_area?: string | null;
    biggest_bottleneck?: string | null;
    audience_target?: string | null;
    audience_frustration?: string | null;
    signature_message?: string | null;
    low_energy_version?: string | null;
    medium_energy_version?: string | null;
    high_energy_version?: string | null;
    day1_top3?: string[];
    day1_why?: string | null;
    day2_top3?: string[];
    day2_why?: string | null;
    day3_top3?: string[];
    day3_why?: string | null;
    weekly_planning_day?: string | null;
    weekly_debrief_day?: string | null;
  };
  implementation_project?: {
    name: string;
    description?: string | null;
  };
  tasks: CyclePlanReconciliationTask[];
  details?: Record<string, unknown>;
  success_path?: {
    recommended_stage: SuccessPathStageId;
    recommendation_reason?: string | null;
    recommendation_evidence?: string | null;
    curriculum_version?: string;
  };
}

export interface CyclePlanReconciliationReceipt {
  request_id: string;
  status: 'complete';
  replayed: boolean;
  payload_hash: string;
  cycle_id: string;
  implementation_project_id: string | null;
  active_generated_task_count: number;
  retired_generated_task_count: number;
  success_path_ready: boolean;
  success_path_url: string | null;
  completed_at: string;
}

interface CyclePlanConflictReceipt {
  status: 'conflict';
  conflict: true;
  request_id: string;
  cycle_id: string;
  conflict_kind: 'request_changed' | 'plan_changed';
}

function isConflictReceipt(value: unknown): value is CyclePlanConflictReceipt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.status === 'conflict'
    && row.conflict === true
    && typeof row.request_id === 'string'
    && typeof row.cycle_id === 'string'
    && (row.conflict_kind === 'request_changed' || row.conflict_kind === 'plan_changed');
}

function isCompleteReceipt(value: unknown): value is CyclePlanReconciliationReceipt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.status === 'complete'
    && typeof row.request_id === 'string'
    && typeof row.payload_hash === 'string'
    && typeof row.cycle_id === 'string'
    && typeof row.active_generated_task_count === 'number'
    && typeof row.retired_generated_task_count === 'number'
    && typeof row.success_path_ready === 'boolean'
    && (typeof row.success_path_url === 'string' || row.success_path_url === null);
}

export function getOrCreateCyclePlanRequestId(userId: string): string {
  const storageKey = requestStorageKey(userId);
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const requestId = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, requestId);
  return requestId;
}

export function clearCyclePlanRequestId(userId: string, requestId: string): void {
  const storageKey = requestStorageKey(userId);
  if (window.sessionStorage.getItem(storageKey) === requestId) {
    window.sessionStorage.removeItem(storageKey);
  }
  // Clean up request IDs created by pre-Wave-1 builds without reusing them.
  window.localStorage.removeItem(storageKey);
}

export async function submitCyclePlanReconciliation(
  payload: CyclePlanReconciliationPayload,
  requestId: string,
): Promise<CyclePlanReconciliationReceipt> {
  const rpcClient = supabase as unknown as {
    rpc: (
      name: string,
      params: { p_request_id: string; p_payload: CyclePlanReconciliationPayload },
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  };

  const { data, error } = await rpcClient.rpc('reconcile_cycle_plan', {
    p_request_id: requestId,
    p_payload: payload,
  });

  if (error) {
    const message = error.code === '22000'
      ? 'This saved request no longer matches your current answers. Refresh your verified plan before trying again.'
      : error.message || 'Your plan was not confirmed as saved. Keep this screen open and try again.';
    throw new Error(message);
  }

  if (isConflictReceipt(data)) {
    throw new Error(data.conflict_kind === 'plan_changed'
      ? 'This plan was saved from another tab or session. Refresh to review it before replacing those answers.'
      : 'These answers changed after an earlier save attempt. Refresh to review the verified plan before replacing them.');
  }

  if (!isCompleteReceipt(data) || data.request_id !== requestId) {
    throw new Error("Your plan save could not be verified. This screen's draft was not cleared. Retry the same save.");
  }

  return data;
}
