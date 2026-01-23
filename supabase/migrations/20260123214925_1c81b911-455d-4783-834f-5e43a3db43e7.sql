-- Add missing columns to launches table to match LaunchWizardData

-- Launch duration
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS launch_duration text DEFAULT '7_days';

-- Has ads (boolean or 'maybe')
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS has_ads text DEFAULT 'false';

-- Social strategy array
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS social_strategy text[] DEFAULT '{}';

-- Offer breakdown as JSONB
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS offer_breakdown jsonb DEFAULT '{"emails": 0, "socialPosts": 0, "stories": 0, "dms": 0, "salesCalls": 0, "liveEvents": 0}';

-- Selected content IDs for reuse
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS selected_content_ids uuid[] DEFAULT '{}';