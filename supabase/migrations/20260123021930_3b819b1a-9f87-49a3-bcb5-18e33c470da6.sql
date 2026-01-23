-- Launches table (created by Launch Planner Wizard)
CREATE TABLE public.launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id),
  name TEXT NOT NULL,
  cart_opens DATE NOT NULL,
  cart_closes DATE NOT NULL,
  revenue_goal NUMERIC,
  price_per_sale NUMERIC,
  sales_needed INTEGER,
  offer_goal INTEGER DEFAULT 50,
  has_waitlist BOOLEAN DEFAULT false,
  waitlist_opens DATE,
  waitlist_incentive TEXT,
  has_lead_magnet BOOLEAN DEFAULT false,
  lead_magnet_topic TEXT,
  lead_magnet_due_date DATE,
  email_sequences TEXT[] DEFAULT '{}',
  live_events JSONB DEFAULT '[]',
  ads_budget NUMERIC,
  ads_platform TEXT[] DEFAULT '{}',
  social_posts_per_day INTEGER DEFAULT 1,
  belief TEXT,
  limiting_thought TEXT,
  useful_thought TEXT,
  post_purchase_flow TEXT[] DEFAULT '{}',
  non_buyer_followup TEXT,
  debrief_date DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','pre-launch','live','closed','debriefed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id),
  name TEXT NOT NULL,
  goal TEXT CHECK (goal IN ('nurture','sell','welcome','reengage')),
  audience TEXT CHECK (audience IN ('cold','warm','customers','event')),
  email_count INTEGER DEFAULT 5,
  problem_solved TEXT,
  transformation TEXT,
  main_cta TEXT,
  send_frequency TEXT CHECK (send_frequency IN ('daily','every_2_days','every_3_days','weekly','custom')),
  custom_frequency TEXT,
  offer_count INTEGER DEFAULT 0,
  reused_content_ids UUID[] DEFAULT '{}',
  emails_to_write INTEGER DEFAULT 0,
  start_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content sprints table
CREATE TABLE public.content_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id),
  name TEXT,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  piece_count INTEGER NOT NULL,
  timeline TEXT CHECK (timeline IN ('1_week','2_week','1_month','ongoing')),
  theme TEXT,
  reused_content_ids UUID[] DEFAULT '{}',
  new_pieces_count INTEGER DEFAULT 0,
  creation_method TEXT CHECK (creation_method IN ('batch_one_day','weekly_batch','as_you_go','mixed')),
  batch_date DATE,
  edit_date DATE,
  schedule_date DATE,
  posting_frequency TEXT,
  first_post_date DATE,
  last_post_date DATE,
  needs_help TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','creating','posting','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sprints ENABLE ROW LEVEL SECURITY;

-- RLS policies for launches
CREATE POLICY "launches_select_own" ON public.launches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "launches_insert_own" ON public.launches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "launches_update_own" ON public.launches FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "launches_delete_own" ON public.launches FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for email_campaigns
CREATE POLICY "email_campaigns_select_own" ON public.email_campaigns FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "email_campaigns_insert_own" ON public.email_campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_campaigns_update_own" ON public.email_campaigns FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "email_campaigns_delete_own" ON public.email_campaigns FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for content_sprints
CREATE POLICY "content_sprints_select_own" ON public.content_sprints FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "content_sprints_insert_own" ON public.content_sprints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_sprints_update_own" ON public.content_sprints FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "content_sprints_delete_own" ON public.content_sprints FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_launches_updated_at
  BEFORE UPDATE ON public.launches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_sprints_updated_at
  BEFORE UPDATE ON public.content_sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed additional wizard templates
INSERT INTO public.wizard_templates (template_name, display_name, description, icon, estimated_time_minutes, questions)
VALUES 
  ('launch-planner', 'Launch Planner', 'Plan your next product launch. Cart dates, offers, email sequences, and all the things.', 'Rocket', 15, '[]'),
  ('email-campaign', 'Email Campaign', 'Build email sequences that nurture and convert. Welcome series, sales campaigns, re-engagement.', 'Mail', 10, '[]'),
  ('content-sprint', 'Content Sprint', 'Batch create content for one platform. Reels sprint. Blog sprint. Whatever you''re making.', 'Zap', 8, '[]')
ON CONFLICT (template_name) DO NOTHING;