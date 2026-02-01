-- Launch System Phase 1: Database Schema Updates
-- Adds launch_id FK to tasks, phase columns to launches, and active_launch_id to daily/weekly plans

-- 1. Add launch_id to tasks table with CASCADE delete
-- When a launch is deleted, all associated tasks are removed automatically
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS launch_id UUID REFERENCES public.launches(id) ON DELETE CASCADE;

-- Index for efficient launch task queries
CREATE INDEX IF NOT EXISTS idx_tasks_launch_id ON public.tasks(launch_id) WHERE launch_id IS NOT NULL;

-- 2. Add phase date columns to launches table for 4-phase timeline system
-- Runway -> Pre-Launch -> Cart Open -> Post-Launch
ALTER TABLE public.launches 
ADD COLUMN IF NOT EXISTS runway_start_date DATE,
ADD COLUMN IF NOT EXISTS runway_end_date DATE,
ADD COLUMN IF NOT EXISTS pre_launch_start_date DATE,
ADD COLUMN IF NOT EXISTS pre_launch_end_date DATE,
ADD COLUMN IF NOT EXISTS post_launch_end_date DATE;

-- 3. Add timeline customization tracking
ALTER TABLE public.launches 
ADD COLUMN IF NOT EXISTS use_custom_timeline BOOLEAN DEFAULT false;

-- 4. Add free event fields to launches table
ALTER TABLE public.launches 
ADD COLUMN IF NOT EXISTS has_free_event BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_event_type TEXT,
ADD COLUMN IF NOT EXISTS free_event_date DATE,
ADD COLUMN IF NOT EXISTS free_event_time TEXT,
ADD COLUMN IF NOT EXISTS free_event_phase TEXT;

-- 5. Add active_launch_id to daily_plans (SET NULL on delete - preserve historical data)
ALTER TABLE public.daily_plans 
ADD COLUMN IF NOT EXISTS active_launch_id UUID REFERENCES public.launches(id) ON DELETE SET NULL;

-- 6. Add active_launch_id to weekly_plans (SET NULL on delete - preserve historical data)
ALTER TABLE public.weekly_plans 
ADD COLUMN IF NOT EXISTS active_launch_id UUID REFERENCES public.launches(id) ON DELETE SET NULL;

-- 7. Add launch-specific weekly metrics fields
ALTER TABLE public.weekly_plans 
ADD COLUMN IF NOT EXISTS launch_offers_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS launch_sales_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS launch_revenue_logged NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS launch_conversion_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS launch_phase_this_week TEXT,
ADD COLUMN IF NOT EXISTS launch_week_reflection TEXT,
ADD COLUMN IF NOT EXISTS launch_confidence_rating INTEGER;

-- 8. Add constraint for launch_confidence_rating (1-10)
ALTER TABLE public.weekly_plans 
ADD CONSTRAINT check_launch_confidence_rating 
CHECK (launch_confidence_rating IS NULL OR (launch_confidence_rating >= 1 AND launch_confidence_rating <= 10));

-- 9. Add offer_goal field to launches if it doesn't exist (for getDailyOfferGoal calculation)
ALTER TABLE public.launches 
ADD COLUMN IF NOT EXISTS offer_goal INTEGER DEFAULT 0;