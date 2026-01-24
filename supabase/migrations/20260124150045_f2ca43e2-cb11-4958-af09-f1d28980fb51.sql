-- Create launch_debriefs table to store post-launch review data
CREATE TABLE public.launch_debriefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  launch_id UUID NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  actual_revenue NUMERIC,
  actual_sales INTEGER,
  conversion_rate NUMERIC,
  what_worked TEXT,
  what_to_improve TEXT,
  biggest_win TEXT,
  would_do_differently TEXT,
  energy_rating INTEGER CHECK (energy_rating >= 1 AND energy_rating <= 5),
  will_launch_again BOOLEAN,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(launch_id)
);

-- Enable RLS
ALTER TABLE public.launch_debriefs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own launch debriefs"
ON public.launch_debriefs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own launch debriefs"
ON public.launch_debriefs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own launch debriefs"
ON public.launch_debriefs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own launch debriefs"
ON public.launch_debriefs FOR DELETE
USING (auth.uid() = user_id);

-- Add dismissed_launch_debriefs to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS dismissed_launch_debriefs JSONB DEFAULT '[]'::jsonb;

-- Create trigger for updated_at
CREATE TRIGGER update_launch_debriefs_updated_at
BEFORE UPDATE ON public.launch_debriefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();