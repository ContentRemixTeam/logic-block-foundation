-- Create lead_magnets table for the Lead Magnet Creator Wizard
CREATE TABLE public.lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  
  -- Core info
  name TEXT NOT NULL,
  description TEXT,
  format TEXT, -- pdf, video, template, quiz, etc.
  
  -- Target audience
  ideal_subscriber TEXT,
  main_problem TEXT,
  transformation TEXT,
  platforms TEXT[], -- where they hang out online
  
  -- Content/Deliverables
  deliverables JSONB DEFAULT '[]',
  estimated_length TEXT, -- pages, minutes, etc.
  has_bonus BOOLEAN DEFAULT false,
  bonus_description TEXT,
  
  -- Copy elements
  headline TEXT,
  subheadline TEXT,
  bullets JSONB DEFAULT '[]',
  result_promise TEXT,
  
  -- Tech setup
  landing_page_platform TEXT,
  landing_page_status TEXT, -- existing, need-to-create, platform-default
  email_provider TEXT,
  delivery_method TEXT, -- email, redirect, both
  landing_page_url TEXT,
  
  -- Email sequence
  email_sequence_length INTEGER DEFAULT 5,
  email_sequence_purpose TEXT, -- value, soft-sell, discovery-call, paid-offer
  email_sequence_status TEXT, -- existing, need-to-create
  email_sequence_deadline DATE,
  
  -- Promotion
  promotion_method TEXT,
  promotion_platforms TEXT[],
  promotion_start_date DATE,
  promotion_duration TEXT,
  weekly_commitment INTEGER,
  
  -- Status tracking
  status TEXT DEFAULT 'planning', -- planning, in-progress, live, paused
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_magnets ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_magnets
CREATE POLICY "Users can view own lead magnets"
  ON public.lead_magnets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lead magnets"
  ON public.lead_magnets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead magnets"
  ON public.lead_magnets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead magnets"
  ON public.lead_magnets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_lead_magnets_updated_at
  BEFORE UPDATE ON public.lead_magnets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for user queries
CREATE INDEX idx_lead_magnets_user_id ON public.lead_magnets(user_id);
CREATE INDEX idx_lead_magnets_project_id ON public.lead_magnets(project_id);
CREATE INDEX idx_lead_magnets_status ON public.lead_magnets(status);