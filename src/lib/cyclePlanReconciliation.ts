import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { cyclePlanReceiptMatchesReadback } from '@/lib/cyclePlanReceiptVerification';
export { cyclePlanReceiptMatchesReadback } from '@/lib/cyclePlanReceiptVerification';

const IDENTITY_STORAGE_PREFIX = 'cycle_plan_reconciliation_identity_v2';

export interface CyclePlanDraftIdentity {
  logical_plan_key: string;
  request_id: string;
  /** Browser-side payload binding used only to decide when to rotate request_id. */
  request_payload_fingerprint?: string;
}

export interface CyclePlanGeneratedProject {
  generation_key: string;
  name: string;
  description?: string | null;
}

export interface CyclePlanGeneratedHabit {
  generation_key: string;
  habit_name: string;
  category?: string | null;
  display_order: number;
}

export interface CyclePlanGeneratedTask {
  generation_key: string;
  project_generation_key?: string | null;
  task_text: string;
  task_description?: string | null;
  scheduled_date?: string | null;
  planned_day?: string | null;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  context_tags?: string[];
}

export interface CyclePlanReconciliationPayload {
  payload_version: 'cycle-plan-v2';
  logical_plan_key: string;
  cycle_id?: string | null;
  expected_version?: number | null;
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
    wish?: string | null;
    outcome?: string | null;
    obstacle?: string | null;
    if_then_plan?: string | null;
    low_energy_version?: string | null;
    medium_energy_version?: string | null;
    high_energy_version?: string | null;
    things_to_remember?: string[];
    metric_1_name?: string | null;
    metric_1_start?: number | null;
    metric_1_goal?: number | null;
    metric_2_name?: string | null;
    metric_2_start?: number | null;
    metric_2_goal?: number | null;
    metric_3_name?: string | null;
    metric_3_start?: number | null;
    metric_3_goal?: number | null;
    metric_4_name?: string | null;
    metric_4_start?: number | null;
    metric_4_goal?: number | null;
    metric_5_name?: string | null;
    metric_5_start?: number | null;
    metric_5_goal?: number | null;
    weekly_planning_day?: string | null;
    weekly_debrief_day?: string | null;
    office_hours_start?: string | null;
    office_hours_end?: string | null;
    office_hours_days?: string[];
    biggest_fear?: string | null;
    fear_response?: string | null;
    commitment_statement?: string | null;
    accountability_person?: string | null;
    day1_top3?: string[];
    day1_why?: string | null;
    day2_top3?: string[];
    day2_why?: string | null;
    day3_top3?: string[];
    day3_why?: string | null;
    promotions?: Json[];
  };
  strategy: Record<string, Json | undefined>;
  offers: Array<Record<string, Json | undefined>>;
  limited_offers: Array<Record<string, Json | undefined>>;
  revenue_plan: Record<string, Json | undefined>;
  month_plans: Array<Record<string, Json | undefined>>;
  generated_projects: CyclePlanGeneratedProject[];
  generated_habits: CyclePlanGeneratedHabit[];
  generated_tasks: CyclePlanGeneratedTask[];
  daily_plans: Array<Record<string, Json | undefined>>;
  details: Record<string, Json | undefined>;
}

export interface CyclePlanReconciliationReceipt {
  planner_receipt_id: string;
  request_id: string;
  logical_plan_id: string;
  logical_plan_key: string;
  status: 'complete';
  replayed: boolean;
  payload_hash: string;
  content_hash: string;
  cycle_id: string;
  version: number;
  active_generated_project_count: number;
  active_generated_habit_count: number;
  active_generated_task_count: number;
  retired_generated_project_count: number;
  retired_generated_habit_count: number;
  retired_generated_task_count: number;
  reactivated_generated_project_count: number;
  reactivated_generated_habit_count: number;
  reactivated_generated_task_count: number;
  preserved_inactive_generated_project_count: number;
  preserved_inactive_generated_habit_count: number;
  preserved_inactive_generated_task_count: number;
  generation_reactivation_conflicts: Array<{
    kind: 'project' | 'habit' | 'task';
    generation_key: string;
    outcome: 'member_state_preserved';
  }>;
  daily_plan_inserted_count: number;
  daily_plan_linked_count: number;
  daily_plan_preserved_count: number;
  daily_plan_conflict_count: number;
  daily_plan_outcomes: Array<{
    date: string;
    outcome: 'created_generated_plan' | 'linked_existing_preserved' | 'existing_same_cycle_preserved' | 'other_cycle_preserved';
    existing_cycle_id?: string;
  }>;
  completed_at: string;
}

interface CyclePlanConflictReceipt {
  status: 'conflict';
  conflict: true;
  conflict_kind: 'request_changed' | 'stale_version' | 'quarter_changed'
    | 'cycle_quarter_mismatch' | 'owner_quarter_cycle_conflict' | 'ambiguous_owner_quarter_cycles'
    | 'daily_plan_collision';
  current_version?: number;
}

function identityStorageKey(userId: string): string {
  return `${IDENTITY_STORAGE_PREFIX}:${userId}`;
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isDraftIdentity(value: unknown): value is CyclePlanDraftIdentity {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return validUuid(row.logical_plan_key)
    && validUuid(row.request_id)
    && (row.request_payload_fingerprint === undefined
      || (typeof row.request_payload_fingerprint === 'string'
        && /^[0-9a-f]{64}$/.test(row.request_payload_fingerprint)));
}

async function payloadFingerprint(payload: CyclePlanReconciliationPayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Cloud draft identity wins. Browser storage is only a retry cache; the server
 * also converges new identities by authenticated owner + calendar quarter.
 */
export function getOrCreateCyclePlanIdentity(
  userId: string,
  cloudDraftIdentity?: CyclePlanDraftIdentity | null,
): CyclePlanDraftIdentity {
  const storageKey = identityStorageKey(userId);
  if (isDraftIdentity(cloudDraftIdentity)) {
    window.localStorage.setItem(storageKey, JSON.stringify(cloudDraftIdentity));
    return cloudDraftIdentity;
  }

  try {
    const cached = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (isDraftIdentity(cached)) return cached;
  } catch {
    // Replace malformed cache below.
  }

  const identity = {
    logical_plan_key: crypto.randomUUID(),
    request_id: crypto.randomUUID(),
  };
  window.localStorage.setItem(storageKey, JSON.stringify(identity));
  return identity;
}

/**
 * Binds one delivery identity to one exact payload. A lost-response retry keeps
 * the request ID, while changed answers receive a new request ID and retain the
 * durable logical plan key.
 */
export async function bindCyclePlanRequestToPayload(
  userId: string,
  identity: CyclePlanDraftIdentity,
  payload: CyclePlanReconciliationPayload,
): Promise<CyclePlanDraftIdentity> {
  const fingerprint = await payloadFingerprint(payload);
  const nextIdentity = identity.request_payload_fingerprint
    && identity.request_payload_fingerprint !== fingerprint
    ? {
        logical_plan_key: identity.logical_plan_key,
        request_id: crypto.randomUUID(),
        request_payload_fingerprint: fingerprint,
      }
    : { ...identity, request_payload_fingerprint: fingerprint };

  window.localStorage.setItem(identityStorageKey(userId), JSON.stringify(nextIdentity));
  return nextIdentity;
}

export function clearCyclePlanIdentity(userId: string, identity: CyclePlanDraftIdentity): void {
  const storageKey = identityStorageKey(userId);
  try {
    const cached = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (isDraftIdentity(cached)
      && cached.logical_plan_key === identity.logical_plan_key
      && cached.request_id === identity.request_id) {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function isConflictReceipt(value: unknown): value is CyclePlanConflictReceipt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.status === 'conflict'
    && row.conflict === true
    && [
      'request_changed', 'stale_version', 'quarter_changed', 'cycle_quarter_mismatch',
      'owner_quarter_cycle_conflict', 'ambiguous_owner_quarter_cycles', 'daily_plan_collision',
    ].includes(String(row.conflict_kind));
}

function isCompleteReceipt(value: unknown): value is CyclePlanReconciliationReceipt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.status === 'complete'
    && validUuid(row.planner_receipt_id)
    && validUuid(row.request_id)
    && validUuid(row.logical_plan_id)
    && validUuid(row.logical_plan_key)
    && validUuid(row.cycle_id)
    && typeof row.payload_hash === 'string' && /^[0-9a-f]{64}$/.test(row.payload_hash)
    && typeof row.content_hash === 'string' && /^[0-9a-f]{64}$/.test(row.content_hash)
    && typeof row.version === 'number' && Number.isSafeInteger(row.version) && row.version > 0
    && typeof row.active_generated_task_count === 'number'
    && typeof row.daily_plan_inserted_count === 'number'
    && typeof row.daily_plan_linked_count === 'number'
    && typeof row.daily_plan_preserved_count === 'number'
    && typeof row.daily_plan_conflict_count === 'number'
    && row.daily_plan_conflict_count === 0
    && Array.isArray(row.daily_plan_outcomes)
    && typeof row.completed_at === 'string';
}

export async function submitCyclePlanReconciliation(
  payload: CyclePlanReconciliationPayload,
  requestId: string,
): Promise<CyclePlanReconciliationReceipt> {
  const { data, error } = await supabase.rpc('reconcile_cycle_plan_v2', {
    p_request_id: requestId,
    p_payload: payload as Json,
  });

  if (error) {
    if (error.message?.includes('cycle_plan_daily_plan_collision:')) {
      throw new Error('A required Daily Plan date is already attached to another cycle. Nothing was changed; keep this recovery and contact support before retrying.');
    }
    throw new Error(error.message || 'Your plan save was not verified. Keep this screen open and retry the same save.');
  }
  if (isConflictReceipt(data)) {
    if (data.conflict_kind === 'daily_plan_collision') {
      throw new Error('A required Daily Plan date is already attached to another cycle. Nothing was changed; keep this recovery and contact support before retrying.');
    }
    if (data.conflict_kind === 'request_changed') {
      throw new Error('This retry ID already completed with different answers. Reload the verified plan before saving again.');
    }
    if (data.conflict_kind === 'ambiguous_owner_quarter_cycles'
      || data.conflict_kind === 'owner_quarter_cycle_conflict'
      || data.conflict_kind === 'cycle_quarter_mismatch') {
      throw new Error('More than one cycle authority may exist for this quarter. Nothing was replaced; review your Cycles before retrying.');
    }
    throw new Error('This plan changed in another tab or device. Reload it before replacing those answers.');
  }
  if (data && typeof data === 'object'
    && (data as Record<string, unknown>).status === 'complete'
    && Number((data as Record<string, unknown>).daily_plan_conflict_count) > 0) {
    throw new Error('A required Daily Plan date is already attached to another cycle. Nothing was changed; keep this recovery and contact support before retrying.');
  }
  if (!isCompleteReceipt(data)
    || data.request_id !== requestId
    || data.logical_plan_key !== payload.logical_plan_key) {
    throw new Error("Your plan receipt could not be verified. This screen's draft was not cleared; retry the same save.");
  }
  return data;
}

/** Performs a separate owner-scoped readback before the browser may clear draft state. */
export async function verifyCyclePlanReceiptReadback(
  receipt: CyclePlanReconciliationReceipt,
): Promise<void> {
  const { data, error } = await supabase
    .from('cycle_plan_reconciliation_requests_v2')
    .select('request_id, plan_id, planner_receipt_id, cycle_id, payload_hash, content_hash, resulting_version, status, receipt')
    .eq('request_id', receipt.request_id)
    .single();

  if (error || !cyclePlanReceiptMatchesReadback(receipt, data)) {
    throw new Error("Your plan was committed, but its receipt readback was not verified. This screen's draft was not cleared; retry the same save.");
  }
}
