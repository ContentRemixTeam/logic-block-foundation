-- Create daily_launch_reflections table for quick daily launch insights
CREATE TABLE public.daily_launch_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  launch_id UUID NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  phase TEXT NOT NULL, -- 'runway', 'pre-launch', 'live', 'post-launch'
  -- Quick reflection lists (array of strings)
  what_worked JSONB DEFAULT '[]'::jsonb,
  what_didnt_work JSONB DEFAULT '[]'::jsonb,
  quick_note TEXT,
  energy_level INTEGER CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 5)),
  -- Metrics (live phase)
  offers_made INTEGER DEFAULT 0,
  sales_today INTEGER DEFAULT 0,
  revenue_today NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, launch_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_launch_reflections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own launch reflections"
  ON public.daily_launch_reflections FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_daily_launch_reflections_lookup 
  ON public.daily_launch_reflections(user_id, launch_id, date);

-- Trigger for updated_at
CREATE TRIGGER update_daily_launch_reflections_updated_at
  BEFORE UPDATE ON public.daily_launch_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();