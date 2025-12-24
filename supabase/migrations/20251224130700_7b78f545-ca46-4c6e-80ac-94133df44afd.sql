-- Create tasks table
CREATE TABLE public.tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  daily_plan_id UUID REFERENCES public.daily_plans(day_id) ON DELETE SET NULL,
  
  -- Task content
  task_text TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  
  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Scheduling
  scheduled_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  tags JSONB DEFAULT '[]'::jsonb
);

-- Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, scheduled_date);
CREATE INDEX idx_tasks_completed ON public.tasks(user_id, is_completed);