-- Fresh Start feature: additive archive columns.
-- Tasks and daily_plans get an archived_at timestamp so we can hide (never delete)
-- stale items and restore them later.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_archived_at
  ON public.tasks (user_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_active
  ON public.tasks (user_id)
  WHERE archived_at IS NULL;

ALTER TABLE public.daily_plans
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_daily_plans_user_archived_at
  ON public.daily_plans (user_id, archived_at)
  WHERE archived_at IS NOT NULL;
