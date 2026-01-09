-- Create weekly_reflections table for shareable weekly reflections
CREATE TABLE public.weekly_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  wins text,
  went_well text,
  learned text,
  next_week_focus text,
  include_prompts boolean DEFAULT false,
  include_goal boolean DEFAULT true,
  shared_at timestamp with time zone,
  share_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_user_week_reflection UNIQUE (user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own reflections
CREATE POLICY "Users can view their own reflections"
ON public.weekly_reflections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own reflections
CREATE POLICY "Users can create their own reflections"
ON public.weekly_reflections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reflections
CREATE POLICY "Users can update their own reflections"
ON public.weekly_reflections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reflections
CREATE POLICY "Users can delete their own reflections"
ON public.weekly_reflections
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_weekly_reflections_updated_at
BEFORE UPDATE ON public.weekly_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();