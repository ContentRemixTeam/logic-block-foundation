-- Create task_schedule_history table to track all schedule changes
CREATE TABLE public.task_schedule_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    previous_scheduled_at TIMESTAMPTZ NULL,
    new_scheduled_at TIMESTAMPTZ NULL,
    previous_due_date DATE NULL,
    new_due_date DATE NULL,
    change_source TEXT NULL -- 'weekly_planner_drag', 'task_drawer', 'tasks_list', 'api', etc.
);

-- Enable RLS
ALTER TABLE public.task_schedule_history ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/insert their own history
CREATE POLICY "Users can view their own schedule history"
ON public.task_schedule_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule history"
ON public.task_schedule_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule history"
ON public.task_schedule_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_task_schedule_history_task_id ON public.task_schedule_history(task_id);
CREATE INDEX idx_task_schedule_history_user_id ON public.task_schedule_history(user_id);
CREATE INDEX idx_task_schedule_history_changed_at ON public.task_schedule_history(changed_at);

-- Add reschedule tracking columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS original_scheduled_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS original_due_date DATE NULL,
ADD COLUMN IF NOT EXISTS reschedule_count_30d INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS reschedule_loop_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reschedule_nudge_dismissed_until TIMESTAMPTZ NULL;