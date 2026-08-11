import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getMastermindStage,
  inferMastermindSuccessPath,
  type MastermindPlanCycle,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';

interface UntypedResult {
  data: unknown;
  error: unknown;
}

interface UntypedQuery extends PromiseLike<UntypedResult> {
  select(columns: string): UntypedQuery;
  eq(column: string, value: unknown): UntypedQuery;
  order(column: string, options: { ascending: boolean }): UntypedQuery;
  limit(count: number): UntypedQuery;
  maybeSingle(): UntypedQuery;
  upsert(values: Record<string, unknown>, options?: { onConflict: string }): UntypedQuery;
}

interface UntypedSupabase {
  from(table: string): UntypedQuery;
  rpc(functionName: string, args: Record<string, unknown>): PromiseLike<UntypedResult>;
}

const db = supabase as unknown as UntypedSupabase;
const CYCLE_SELECT =
  'cycle_id,goal,start_date,end_date,focus_area,biggest_bottleneck,discover_score,nurture_score,convert_score,audience_target,audience_frustration,signature_message,why,low_energy_version,medium_energy_version,high_energy_version,planner_payload,updated_at';
const SNAPSHOT_SELECT =
  'snapshot_id,user_id,cycle_id,planner_receipt_id,recommended_stage,confirmed_stage,recommendation_reason,recommendation_evidence,current_milestone_id,current_milestone_title,capacity_mode,curriculum_version,confirmed_at,created_at,updated_at';

export interface MastermindSuccessPathSnapshot {
  snapshot_id: string;
  user_id: string;
  cycle_id: string;
  planner_receipt_id: string | null;
  recommended_stage: MastermindStageId;
  confirmed_stage: MastermindStageId | null;
  recommendation_reason: string | null;
  recommendation_evidence: string | null;
  current_milestone_id: string | null;
  current_milestone_title: string | null;
  capacity_mode: 'minimum' | 'normal' | 'expansion' | null;
  curriculum_version: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MastermindAction {
  action_id: string;
  task_id: string;
  stable_key: string;
  exact_move: string;
  capacity_mode: 'minimum' | 'standard' | 'stretch';
  done_enough: string;
  evidence: string;
  scheduled_date: string;
}

export interface MastermindFirstMove {
  task_id: string;
  task_text: string;
  planned_day: string | null;
}

export interface MastermindOnboarding {
  business_context: string;
  reason_joined: string;
  support_preference: string;
  capacity_constraints: string;
  completed_at: string | null;
}

interface MastermindSuccessPathData {
  cycle: MastermindPlanCycle | null;
  successPath: MastermindSuccessPathOutput | null;
  snapshot: MastermindSuccessPathSnapshot | null;
  selectedStageId: MastermindStageId;
  hasConfirmedStage: boolean;
  action: MastermindAction | null;
  firstMoves: MastermindFirstMove[];
  onboarding: MastermindOnboarding | null;
}

interface ActionInput {
  exactMove: string;
  capacityMode: string;
  doneEnough: string;
  evidence: string;
  scheduledDate: string;
}

interface CheckInInput {
  response: string;
  evidence: string;
  friction: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStage(value: unknown): value is MastermindStageId {
  return (
    typeof value === 'string' &&
    ['offer', 'find', 'nurture', 'sell', 'deliver', 'leverage'].includes(value)
  );
}

function parseSnapshot(value: unknown): MastermindSuccessPathSnapshot | null {
  if (!isRecord(value) || !isStage(value.recommended_stage)) return null;
  const rawSnapshot = value as Record<string, unknown> & { confirmed_stage: unknown };
  if (rawSnapshot.confirmed_stage === null) {
    return rawSnapshot as unknown as MastermindSuccessPathSnapshot;
  }
  return isStage(rawSnapshot.confirmed_stage)
    ? (rawSnapshot as unknown as MastermindSuccessPathSnapshot)
    : null;
}

function parseRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeErrorMessage(value: unknown, fallback: string) {
  return value instanceof Error && value.message ? value.message : fallback;
}

export function useMastermindSuccessPath(cycleId?: string) {
  const [data, setData] = useState<MastermindSuccessPathData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuccessPath = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setData(null);
        return;
      }

      let cycleQuery = supabase
        .from('cycles_90_day')
        .select(CYCLE_SELECT)
        .eq('user_id', authData.user.id);
      cycleQuery = cycleId
        ? cycleQuery.eq('cycle_id', cycleId)
        : cycleQuery
            .lte('start_date', new Date().toISOString().slice(0, 10))
            .gte('end_date', new Date().toISOString().slice(0, 10))
            .order('updated_at', { ascending: false })
            .limit(1);

      const [cycleResult, onboardingResult] = await Promise.all([
        cycleQuery.maybeSingle(),
        db
          .from('mastermind_onboarding_profiles')
          .select(
            'business_context,reason_joined,support_preference,capacity_constraints,completed_at',
          )
          .eq('user_id', authData.user.id)
          .maybeSingle(),
      ]);
      if (cycleResult.error) throw cycleResult.error;
      if (onboardingResult.error) throw onboardingResult.error;
      const onboarding = onboardingResult.data as MastermindOnboarding | null;
      if (!cycleResult.data) {
        setData({
          cycle: null,
          successPath: null,
          snapshot: null,
          selectedStageId: 'offer',
          hasConfirmedStage: false,
          action: null,
          firstMoves: [],
          onboarding,
        });
        return;
      }

      const cycle = cycleResult.data as MastermindPlanCycle;
      const successPath = inferMastermindSuccessPath(cycle);
      const [snapshotResult, actionResult, firstMovesResult] = await Promise.all([
        db
          .from('cycle_success_path_snapshots')
          .select(SNAPSHOT_SELECT)
          .eq('user_id', authData.user.id)
          .eq('cycle_id', cycle.cycle_id)
          .maybeSingle(),
        db
          .from('mastermind_success_path_actions')
          .select(
            'action_id,task_id,stable_key,exact_move,capacity_mode,done_enough,evidence,scheduled_date',
          )
          .eq('user_id', authData.user.id)
          .eq('cycle_id', cycle.cycle_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('tasks')
          .select('task_id,task_text,planned_day')
          .eq('user_id', authData.user.id)
          .eq('cycle_id', cycle.cycle_id)
          .eq('system_source', 'cycle_reconciliation_v1')
          .eq('is_completed', false)
          .order('planned_day', { ascending: true })
          .limit(3),
      ]);
      if (snapshotResult.error) throw snapshotResult.error;
      if (actionResult.error) throw actionResult.error;
      if (firstMovesResult.error) throw firstMovesResult.error;

      const rawSnapshot = parseSnapshot(snapshotResult.data);
      let receiptIsComplete = false;
      if (rawSnapshot?.planner_receipt_id) {
        const receiptResult = await db
          .from('cycle_plan_reconciliation_requests')
          .select('request_id')
          .eq('request_id', rawSnapshot.planner_receipt_id)
          .eq('user_id', authData.user.id)
          .eq('cycle_id', cycle.cycle_id)
          .eq('status', 'complete')
          .maybeSingle();
        if (receiptResult.error) throw receiptResult.error;
        receiptIsComplete = Boolean(receiptResult.data);
      }

      const snapshot = receiptIsComplete ? rawSnapshot : null;
      const selectedStageId = snapshot?.confirmed_stage ?? successPath?.stageId ?? 'offer';
      const firstMoves = parseRows<MastermindFirstMove>(firstMovesResult.data);
      setData({
        cycle,
        successPath,
        snapshot,
        selectedStageId,
        hasConfirmedStage: Boolean(snapshot?.confirmed_stage && snapshot.confirmed_at),
        action: actionResult.data as MastermindAction | null,
        firstMoves,
        onboarding,
      });
    } catch (caught) {
      console.error(caught);
      setError(safeErrorMessage(caught, 'Unable to load your Success Path.'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    void loadSuccessPath();
  }, [loadSuccessPath]);

  const confirmStage = useCallback(
    async (stageId: MastermindStageId) => {
      if (!data?.cycle) throw new Error('Save your 90-day plan first.');
      if (!data.snapshot?.planner_receipt_id) {
        throw new Error('Save your verified 90-day plan before confirming a focus.');
      }
      setIsSaving(true);
      setError(null);
      try {
        const milestone = getMastermindStage(stageId).milestones[0];
        const result = await db.rpc('confirm_mastermind_success_path', {
          p_cycle_id: data.cycle.cycle_id,
          p_stage: stageId,
          p_milestone_id: milestone.id,
          planner_receipt_id: data.snapshot.planner_receipt_id,
        });
        if (result.error) throw result.error;
        await loadSuccessPath();
      } catch (caught) {
        setError(safeErrorMessage(caught, 'Unable to confirm your focus.'));
        throw caught;
      } finally {
        setIsSaving(false);
      }
    },
    [data, loadSuccessPath],
  );

  const scheduleAction = useCallback(
    async (input: ActionInput) => {
      if (!data?.cycle || !data.snapshot?.current_milestone_id) {
        throw new Error('Confirm a focus and milestone first.');
      }
      setIsSaving(true);
      setError(null);
      try {
        const result = await db.rpc('schedule_mastermind_success_path_action', {
          p_cycle_id: data.cycle.cycle_id,
          p_milestone_id: data.snapshot.current_milestone_id,
          p_stable_key: `${data.cycle.cycle_id}:${data.snapshot.current_milestone_id}:active`,
          p_exact_move: input.exactMove,
          p_capacity_mode: input.capacityMode,
          p_done_enough: input.doneEnough,
          p_evidence: input.evidence,
          p_scheduled_date: input.scheduledDate,
        });
        if (result.error) throw result.error;
        await loadSuccessPath();
        return result.data;
      } catch (caught) {
        setError(safeErrorMessage(caught, 'Unable to save this action.'));
        throw caught;
      } finally {
        setIsSaving(false);
      }
    },
    [data, loadSuccessPath],
  );

  const recordCheckIn = useCallback(
    async (input: CheckInInput) => {
      if (!data?.action) throw new Error('Schedule your action first.');
      setIsSaving(true);
      setError(null);
      try {
        const result = await db.rpc('record_mastermind_success_path_check_in', {
          p_action_id: data.action.action_id,
          p_response: input.response,
          p_evidence: input.evidence,
          p_friction: input.friction,
        });
        if (result.error) throw result.error;
        return result.data;
      } catch (caught) {
        setError(safeErrorMessage(caught, 'Unable to save this check-in.'));
        throw caught;
      } finally {
        setIsSaving(false);
      }
    },
    [data?.action],
  );

  return {
    data,
    isLoading,
    isSaving,
    error,
    confirmStage,
    scheduleAction,
    recordCheckIn,
    refetch: loadSuccessPath,
  };
}
