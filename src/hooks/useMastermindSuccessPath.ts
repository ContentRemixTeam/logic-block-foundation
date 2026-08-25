import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getMastermindStage,
  inferMastermindSuccessPath,
  type MastermindPlanCycle,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';

// The Replay Vault / success-path snapshot tables are not present in the generated
// Supabase types yet, so use a loosely typed handle for those queries only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

const CYCLE_SELECT = 'cycle_id,goal,start_date,end_date,focus_area,biggest_bottleneck,discover_score,nurture_score,convert_score,audience_target,audience_frustration,signature_message,why,low_energy_version,medium_energy_version,high_energy_version,updated_at';
const SNAPSHOT_SELECT = 'snapshot_id,user_id,cycle_id,recommended_stage,confirmed_stage,recommendation_reason,recommendation_evidence,current_milestone_id,current_milestone_title,capacity_mode,curriculum_version,confirmed_at,created_at,updated_at';

interface MastermindSuccessPathSnapshot {
  snapshot_id: string;
  user_id: string;
  cycle_id: string;
  recommended_stage: MastermindStageId;
  confirmed_stage: MastermindStageId;
  recommendation_reason: string | null;
  recommendation_evidence: string | null;
  current_milestone_id: string | null;
  current_milestone_title: string | null;
  capacity_mode: 'minimum' | 'normal' | 'expansion' | null;
  curriculum_version: string;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
}

interface MastermindSuccessPathData {
  cycle: MastermindPlanCycle;
  successPath: MastermindSuccessPathOutput | null;
  snapshot: MastermindSuccessPathSnapshot | null;
  selectedStageId: MastermindStageId;
  hasConfirmedStage: boolean;
}

function isMastermindStageId(value: string): value is MastermindStageId {
  return ['offer', 'find', 'nurture', 'sell', 'deliver', 'leverage'].includes(value);
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

      const { data: cycleRow, error: cycleError } = await cycleQuery.maybeSingle();
      if (cycleError) throw cycleError;
      if (!cycleRow) {
        setData(null);
        return;
      }

      const cycle = cycleRow as MastermindPlanCycle;
      const successPath = inferMastermindSuccessPath(cycle);

      const { data: snapshotRow, error: snapshotError } = await db
        .from('cycle_success_path_snapshots')
        .select(SNAPSHOT_SELECT)
        .eq('user_id', authData.user.id)
        .eq('cycle_id', cycle.cycle_id)
        .maybeSingle();

      if (snapshotError) throw snapshotError;

      const rawSnapshot = snapshotRow as Omit<MastermindSuccessPathSnapshot, 'recommended_stage' | 'confirmed_stage'> & {
        recommended_stage: string;
        confirmed_stage: string;
      } | null;

      const snapshot = rawSnapshot
        && isMastermindStageId(rawSnapshot.recommended_stage)
        && isMastermindStageId(rawSnapshot.confirmed_stage)
        ? rawSnapshot as MastermindSuccessPathSnapshot
        : null;

      const selectedStageId = snapshot?.confirmed_stage ?? successPath?.stageId ?? 'offer';

      setData({
        cycle,
        successPath,
        snapshot,
        selectedStageId,
        hasConfirmedStage: Boolean(snapshot),
      });
    } catch (err) {
      console.error('Error loading Mastermind Success Path:', err);
      setError(err instanceof Error ? err.message : 'Unable to load your Success Path.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    void loadSuccessPath();
  }, [loadSuccessPath]);

  const saveSelection = useCallback(async (stageId: MastermindStageId, milestoneId: string) => {
    if (!data?.cycle) {
      throw new Error('Complete your 90-day plan before choosing a Success Path focus.');
    }

    const stage = getMastermindStage(stageId);
    const milestone = stage.milestones.find((item) => item.id === milestoneId);
    if (!milestone) throw new Error('Choose a milestone from your current Success Path focus.');

    setIsSaving(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign in to save your Success Path.');

      const recommendedStage = data.successPath?.stageId ?? stageId;
      const now = new Date().toISOString();

      const { data: savedRow, error: saveError } = await db
        .from('cycle_success_path_snapshots')
        .upsert({
          user_id: authData.user.id,
          cycle_id: data.cycle.cycle_id,
          recommended_stage: recommendedStage,
          confirmed_stage: stageId,
          recommendation_reason: data.successPath?.reason ?? 'Selected by the member.',
          recommendation_evidence: data.successPath?.evidenceLabel ?? null,
          current_milestone_id: milestone.id,
          current_milestone_title: milestone.label,
          curriculum_version: 'success-path-v1',
          confirmed_at: now,
        }, { onConflict: 'user_id,cycle_id' })
        .select(SNAPSHOT_SELECT)
        .single();

      if (saveError) throw saveError;

      const snapshot = savedRow as unknown as MastermindSuccessPathSnapshot;
      setData((current) => current ? {
        ...current,
        snapshot,
        selectedStageId: stageId,
        hasConfirmedStage: true,
      } : current);

      return snapshot;
    } catch (err) {
      console.error('Error saving Mastermind Success Path:', err);
      const message = err instanceof Error ? err.message : 'Unable to save your Success Path.';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  const confirmStage = useCallback(async (stageId: MastermindStageId) => {
    const firstMilestone = getMastermindStage(stageId).milestones[0];
    return saveSelection(stageId, firstMilestone.id);
  }, [saveSelection]);

  const selectMilestone = useCallback(async (milestoneId: string) => {
    const stageId = data?.selectedStageId ?? data?.successPath?.stageId ?? 'offer';
    return saveSelection(stageId, milestoneId);
  }, [data?.selectedStageId, data?.successPath?.stageId, saveSelection]);

  return {
    data,
    isLoading,
    isSaving,
    error,
    confirmStage,
    selectMilestone,
    refetch: loadSuccessPath,
  };
}
