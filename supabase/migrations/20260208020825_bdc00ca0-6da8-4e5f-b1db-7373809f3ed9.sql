-- Create webinars table for Webinar/Masterclass Planner Wizard
CREATE TABLE public.webinars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  
  -- Event basics
  name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'webinar', -- webinar, masterclass, workshop, training
  topic TEXT,
  description TEXT,
  event_date DATE,
  event_time TIME,
  timezone TEXT DEFAULT 'America/New_York',
  duration_minutes INTEGER DEFAULT 60,
  is_live BOOLEAN DEFAULT true,
  has_replay BOOLEAN DEFAULT true,
  replay_duration_hours INTEGER DEFAULT 48,
  
  -- Target audience
  ideal_attendee TEXT,
  main_problem TEXT,
  transformation TEXT,
  experience_level TEXT, -- beginner, intermediate, advanced, all
  
  -- Content structure
  content_outline JSONB DEFAULT '[]'::jsonb, -- Array of teaching points
  offer_timing TEXT DEFAULT 'last-15', -- first-10, middle, last-15, last-20, throughout
  content_style TEXT DEFAULT 'teaching', -- teaching, demo, qa, hybrid
  include_qa BOOLEAN DEFAULT true,
  qa_duration_minutes INTEGER DEFAULT 15,
  
  -- Tech setup
  platform TEXT, -- zoom, webinarjam, demio, streamyard, crowdcast, other
  registration_platform TEXT, -- same, convertkit, leadpages, other
  registration_url TEXT,
  has_practice_run BOOLEAN DEFAULT true,
  practice_date DATE,
  
  -- Registration flow
  registration_open_date DATE,
  registration_headline TEXT,
  registration_bullets JSONB DEFAULT '[]'::jsonb,
  confirmation_email_status TEXT DEFAULT 'need-to-create', -- existing, need-to-create
  reminder_sequence_count INTEGER DEFAULT 3, -- how many reminder emails
  
  -- Offer/Pitch
  offer_name TEXT,
  offer_price NUMERIC(10,2),
  offer_description TEXT,
  has_attendee_bonus BOOLEAN DEFAULT false,
  attendee_bonus_description TEXT,
  attendee_bonus_deadline TEXT, -- 24h, 48h, 72h, end-of-week
  has_payment_plan BOOLEAN DEFAULT false,
  payment_plan_details TEXT,
  sales_page_url TEXT,
  checkout_url TEXT,
  
  -- Follow-up sequence
  followup_sequence_length INTEGER DEFAULT 5,
  replay_access_hours INTEGER DEFAULT 48,
  cart_close_date DATE,
  followup_email_status TEXT DEFAULT 'need-to-create',
  
  -- Tracking
  registration_goal INTEGER,
  show_up_goal_percent INTEGER DEFAULT 30,
  conversion_goal_percent INTEGER DEFAULT 5,
  
  -- Status
  status TEXT DEFAULT 'planning', -- planning, registration-open, upcoming, live, post-event, completed
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own webinars"
  ON public.webinars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webinars"
  ON public.webinars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webinars"
  ON public.webinars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webinars"
  ON public.webinars FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_webinars_updated_at
  BEFORE UPDATE ON public.webinars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();