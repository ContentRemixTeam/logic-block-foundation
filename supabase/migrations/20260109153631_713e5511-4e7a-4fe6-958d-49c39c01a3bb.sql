-- Add system-generated tracking fields to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS is_system_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_source text,
  ADD COLUMN IF NOT EXISTS template_key text;

-- Create unique index on template_key for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_template_key ON public.tasks (template_key) WHERE template_key IS NOT NULL;

-- Create cycle_metric_updates table for tracking metric changes over time
CREATE TABLE IF NOT EXISTS public.cycle_metric_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE NOT NULL,
  metric_number integer NOT NULL CHECK (metric_number IN (1, 2, 3)),
  value numeric NOT NULL,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cycle_metric_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for cycle_metric_updates
CREATE POLICY "Users can view their own metric updates"
  ON public.cycle_metric_updates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metric updates"
  ON public.cycle_metric_updates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metric updates"
  ON public.cycle_metric_updates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metric updates"
  ON public.cycle_metric_updates FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_cycle_metric_updates_cycle ON public.cycle_metric_updates (cycle_id, metric_number, logged_at);
CREATE INDEX IF NOT EXISTS idx_cycle_metric_updates_user ON public.cycle_metric_updates (user_id);