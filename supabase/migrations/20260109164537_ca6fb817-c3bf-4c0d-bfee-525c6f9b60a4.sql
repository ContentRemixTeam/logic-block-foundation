-- Create coaching_entries table
CREATE TABLE public.coaching_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  context_summary TEXT,
  circumstance TEXT,
  thought TEXT,
  feeling TEXT,
  action TEXT,
  result TEXT,
  reframe_thought TEXT,
  tiny_next_action TEXT,
  create_tiny_task BOOLEAN DEFAULT false,
  schedule_tiny_task_at TIMESTAMP WITH TIME ZONE,
  shareable_post TEXT
);

-- Enable RLS
ALTER TABLE public.coaching_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only CRUD their own entries
CREATE POLICY "Users can view their own coaching entries"
ON public.coaching_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching entries"
ON public.coaching_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching entries"
ON public.coaching_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaching entries"
ON public.coaching_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX idx_coaching_entries_user_id ON public.coaching_entries(user_id);
CREATE INDEX idx_coaching_entries_task_id ON public.coaching_entries(task_id);
CREATE INDEX idx_coaching_entries_cycle_id ON public.coaching_entries(cycle_id);
CREATE INDEX idx_coaching_entries_created_at ON public.coaching_entries(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_coaching_entries_updated_at
BEFORE UPDATE ON public.coaching_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();