-- Create summits table
CREATE TABLE public.summits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Basics
  name TEXT NOT NULL,
  experience_level TEXT,
  primary_goal TEXT,
  
  -- Structure
  num_days INTEGER DEFAULT 5,
  sessions_per_day INTEGER DEFAULT 5,
  session_format TEXT,
  session_length TEXT,
  
  -- Speakers
  target_speaker_count INTEGER DEFAULT 20,
  speaker_recruitment_deadline DATE,
  speakers_are_affiliates TEXT,
  affiliate_commission INTEGER,
  
  -- All-Access Pass
  has_all_access_pass BOOLEAN DEFAULT true,
  all_access_price NUMERIC(10,2),
  all_access_has_payment_plan BOOLEAN DEFAULT false,
  all_access_payment_plan_details TEXT,
  all_access_includes JSONB DEFAULT '[]'::jsonb,
  has_vip_tier BOOLEAN DEFAULT false,
  vip_price NUMERIC(10,2),
  vip_includes TEXT,
  
  -- Timeline
  registration_opens DATE,
  summit_start_date DATE NOT NULL,
  summit_end_date DATE NOT NULL,
  cart_closes DATE,
  replay_period TEXT,
  
  -- Tech
  hosting_platform TEXT,
  email_platform TEXT,
  checkout_platform TEXT,
  streaming_platform TEXT,
  
  -- Marketing
  promotion_methods JSONB DEFAULT '[]'::jsonb,
  registration_goal INTEGER,
  speaker_email_requirement TEXT,
  swipe_emails_count INTEGER DEFAULT 5,
  has_social_kit BOOLEAN DEFAULT true,
  
  -- Engagement
  community_type TEXT,
  engagement_activities JSONB DEFAULT '[]'::jsonb,
  has_post_summit_offer BOOLEAN DEFAULT false,
  post_summit_offer_details TEXT,
  post_summit_nurture TEXT,
  
  -- Status
  status TEXT DEFAULT 'planning',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.summits ENABLE ROW LEVEL SECURITY;

-- RLS policies for summits
CREATE POLICY "Users can view their own summits"
  ON public.summits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own summits"
  ON public.summits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summits"
  ON public.summits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summits"
  ON public.summits FOR DELETE
  USING (auth.uid() = user_id);

-- Create summit_speakers table
CREATE TABLE public.summit_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summit_id UUID NOT NULL REFERENCES public.summits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Speaker Info
  name TEXT NOT NULL,
  email TEXT,
  topic TEXT,
  session_title TEXT,
  session_order INTEGER,
  
  -- Assets Status
  bio_received BOOLEAN DEFAULT false,
  headshot_received BOOLEAN DEFAULT false,
  swipe_copy_sent BOOLEAN DEFAULT false,
  recording_received BOOLEAN DEFAULT false,
  affiliate_link_sent BOOLEAN DEFAULT false,
  
  -- Deadlines
  recording_deadline DATE,
  
  -- Affiliate Tracking
  is_affiliate BOOLEAN DEFAULT false,
  affiliate_commission INTEGER,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.summit_speakers ENABLE ROW LEVEL SECURITY;

-- RLS policies for summit_speakers
CREATE POLICY "Users can view their own summit speakers"
  ON public.summit_speakers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own summit speakers"
  ON public.summit_speakers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summit speakers"
  ON public.summit_speakers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summit speakers"
  ON public.summit_speakers FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_summit_speakers_summit ON public.summit_speakers(summit_id);
CREATE INDEX idx_summits_user ON public.summits(user_id);

-- Add summit columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_summit BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS summit_id UUID REFERENCES public.summits(id) ON DELETE SET NULL;

-- Add wizard template for summit
INSERT INTO public.wizard_templates (template_name, display_name, description, icon)
VALUES (
  'summit-planner',
  'Summit Planner',
  'Plan your virtual summit from speaker recruitment to all-access pass sales. The complete summit blueprint.',
  'Users'
);

-- Updated at trigger for summits
CREATE TRIGGER update_summits_updated_at
  BEFORE UPDATE ON public.summits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated at trigger for summit_speakers
CREATE TRIGGER update_summit_speakers_updated_at
  BEFORE UPDATE ON public.summit_speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();