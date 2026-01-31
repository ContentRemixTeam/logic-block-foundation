-- Add new columns for Launch Planner V2
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  launch_experience TEXT CHECK (launch_experience IN ('first-time', 'launched-before', 'launched-recently'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  previous_launch_learnings TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  what_went_well TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  what_to_improve TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  email_list_status TEXT CHECK (email_list_status IN ('comfortable', 'small-nervous', 'starting-zero', 'building'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  offer_type TEXT CHECK (offer_type IN ('course', 'coaching', 'product', 'membership', 'other'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  other_offer_type TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  ideal_customer TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  main_bonus TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  has_limitations TEXT CHECK (has_limitations IN ('none', 'existing-clients', 'limited-spots'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  limitation_details TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  spot_limit INTEGER;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  has_payment_plan BOOLEAN DEFAULT false;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  payment_plan_details TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  launch_timeline TEXT CHECK (launch_timeline IN ('2-weeks', '3-4-weeks', '5-6-weeks'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  revenue_goal_tier TEXT CHECK (revenue_goal_tier IN ('first-sale', '500-1000', '1000-2500', '2500-plus', 'testing'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  main_reach_method TEXT CHECK (main_reach_method IN ('email', 'social', 'direct-outreach', 'combination', 'unsure'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  social_platform TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  combination_details TEXT;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  content_creation_status TEXT CHECK (content_creation_status IN ('ready', 'partial', 'from-scratch'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  content_volume TEXT CHECK (content_volume IN ('light', 'medium', 'heavy'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  launch_method TEXT CHECK (launch_method IN ('email-only', 'social-email', 'outreach-email', 'in-person', 'combination'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  offer_frequency TEXT CHECK (offer_frequency IN ('once', 'daily', 'multiple-daily', 'every-other-day', 'unsure'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  live_component TEXT CHECK (live_component IN ('none', 'one', 'multiple', 'considering'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  promotion_duration TEXT CHECK (promotion_duration IN ('1-week', '2-weeks', 'until-goal', 'ongoing', 'unsure'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  follow_up_willingness TEXT CHECK (follow_up_willingness IN ('one-email', 'multiple-emails', 'personal-outreach', 'simple', 'unsure'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  biggest_fears TEXT[];

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  zero_sales_meaning TEXT CHECK (zero_sales_meaning IN ('offer-problem', 'not-enough-promotion', 'nobody-wants', 'unsure', 'just-data'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  zero_sales_plan TEXT CHECK (zero_sales_plan IN ('figure-out-retry', 'adjust-relaunch', 'take-break', 'no-plan', 'unsure'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  gap_overlap_detected BOOLEAN DEFAULT false;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  gap_acknowledged BOOLEAN DEFAULT false;

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  gap_support_type TEXT CHECK (gap_support_type IN ('daily-motivation', 'mid-week-check', 'thought-work', 'keep-tasks', 'decide-later'));

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  readiness_score INTEGER CHECK (readiness_score >= 1 AND readiness_score <= 10);

ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  what_they_need TEXT CHECK (what_they_need IN ('task-list', 'offer-help', 'confidence', 'accountability', 'nothing'));

-- Add index for experience-based queries
CREATE INDEX IF NOT EXISTS idx_launches_experience ON public.launches(launch_experience);

-- Add index for active launches
CREATE INDEX IF NOT EXISTS idx_launches_status ON public.launches(status);