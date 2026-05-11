
DO $$ BEGIN
  CREATE TYPE public.momentum_type AS ENUM ('revenue', 'audience', 'delivery', 'operations', 'mindset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS momentum_type public.momentum_type,
  ADD COLUMN IF NOT EXISTS is_maintenance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS done_enough_definition TEXT,
  ADD COLUMN IF NOT EXISTS connection_swept_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_momentum_type ON public.tasks(user_id, momentum_type);
CREATE INDEX IF NOT EXISTS idx_tasks_unconnected ON public.tasks(user_id) WHERE momentum_type IS NULL AND goal_id IS NULL AND connection_swept_at IS NULL;

ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS weekly_outcome TEXT,
  ADD COLUMN IF NOT EXISTS minimum_viable_week JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS life_happens_plan TEXT,
  ADD COLUMN IF NOT EXISTS weekly_capacity_planned_minutes INTEGER;

ALTER TABLE public.daily_plans
  ADD COLUMN IF NOT EXISTS brave_move_task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS low_energy_task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS not_today TEXT;
