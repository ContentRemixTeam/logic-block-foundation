-- Durable, cycle-specific Success Path confirmation.
-- The planner remains the source of the cycle; this table stores only the
-- member-confirmed curriculum orientation layered on top of that plan.

CREATE TABLE IF NOT EXISTS public.cycle_success_path_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  recommended_stage text NOT NULL CHECK (recommended_stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage')),
  confirmed_stage text NOT NULL CHECK (confirmed_stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage')),
  recommendation_reason text,
  recommendation_evidence text,
  current_milestone_id text,
  current_milestone_title text,
  capacity_mode text CHECK (capacity_mode IS NULL OR capacity_mode IN ('minimum', 'normal', 'expansion')),
  curriculum_version text NOT NULL DEFAULT 'success-path-v1',
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS cycle_success_path_snapshots_cycle_idx
  ON public.cycle_success_path_snapshots(cycle_id);

ALTER TABLE public.cycle_success_path_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own cycle success path" ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can view own cycle success path"
  ON public.cycle_success_path_snapshots
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.cycles_90_day cycle
      WHERE cycle.cycle_id = cycle_success_path_snapshots.cycle_id
        AND cycle.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create own cycle success path" ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can create own cycle success path"
  ON public.cycle_success_path_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.cycles_90_day cycle
      WHERE cycle.cycle_id = cycle_success_path_snapshots.cycle_id
        AND cycle.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own cycle success path" ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can update own cycle success path"
  ON public.cycle_success_path_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.cycles_90_day cycle
      WHERE cycle.cycle_id = cycle_success_path_snapshots.cycle_id
        AND cycle.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.cycles_90_day cycle
      WHERE cycle.cycle_id = cycle_success_path_snapshots.cycle_id
        AND cycle.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete own cycle success path" ON public.cycle_success_path_snapshots;
CREATE POLICY "Members can delete own cycle success path"
  ON public.cycle_success_path_snapshots
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.cycles_90_day cycle
      WHERE cycle.cycle_id = cycle_success_path_snapshots.cycle_id
        AND cycle.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS update_cycle_success_path_snapshots_updated_at
  ON public.cycle_success_path_snapshots;
CREATE TRIGGER update_cycle_success_path_snapshots_updated_at
  BEFORE UPDATE ON public.cycle_success_path_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
