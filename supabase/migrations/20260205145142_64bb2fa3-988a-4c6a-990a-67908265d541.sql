-- Create time_entries table for detailed time tracking
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  estimated_minutes INTEGER,
  actual_minutes INTEGER NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance on common queries
CREATE INDEX idx_time_entries_user_logged ON public.time_entries(user_id, logged_at DESC);
CREATE INDEX idx_time_entries_parent_task ON public.time_entries(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access their own time entries
CREATE POLICY "Users can view own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create view for recurring task averages (pre-computed for performance)
CREATE VIEW public.recurring_task_averages AS
SELECT 
  parent_task_id,
  COUNT(*) as instance_count,
  AVG(actual_minutes)::NUMERIC(10,2) as avg_actual_minutes,
  AVG(estimated_minutes)::NUMERIC(10,2) as avg_estimated_minutes,
  STDDEV(actual_minutes)::NUMERIC(10,2) as stddev_minutes
FROM public.time_entries
WHERE parent_task_id IS NOT NULL
GROUP BY parent_task_id;

-- Add time_completion_modal setting to task_settings
ALTER TABLE public.task_settings 
ADD COLUMN IF NOT EXISTS time_completion_modal TEXT DEFAULT 'when_estimated' 
CHECK (time_completion_modal IN ('always', 'when_estimated', 'never'));