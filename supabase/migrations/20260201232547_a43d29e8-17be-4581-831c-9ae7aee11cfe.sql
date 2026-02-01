-- Create launch_templates table for reusable launch configurations
CREATE TABLE public.launch_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_launch_id UUID REFERENCES public.launches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  
  -- Offer configuration
  offer_type TEXT,
  offer_name TEXT,
  price_point NUMERIC,
  
  -- Timeline configuration
  timeline_duration TEXT,
  revenue_goal_tier TEXT,
  custom_revenue_goal NUMERIC,
  
  -- Pre-launch config (stored as JSONB for flexibility)
  pre_launch_config JSONB DEFAULT '{}'::jsonb,
  
  -- Launch week config
  launch_week_config JSONB DEFAULT '{}'::jsonb,
  
  -- Post-launch config  
  post_launch_config JSONB DEFAULT '{}'::jsonb,
  
  -- Lessons learned from debrief (surfaced when reusing)
  lessons_what_worked TEXT,
  lessons_what_to_improve TEXT,
  lessons_would_do_differently TEXT,
  lessons_energy_rating INTEGER,
  
  -- Metadata
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per user
  UNIQUE(user_id, name)
);

-- Add template_id to launches table to track which template was used
ALTER TABLE public.launches 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.launch_templates(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.launch_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates"
  ON public.launch_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.launch_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.launch_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.launch_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_launch_templates_updated_at
  BEFORE UPDATE ON public.launch_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_launch_templates_user_id ON public.launch_templates(user_id);
CREATE INDEX idx_launch_templates_source_launch ON public.launch_templates(source_launch_id);