-- Add launch-specific columns to projects table
-- Enables countdown display in Daily Plan and fast launch filtering

-- Boolean flag to identify launch projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS is_launch BOOLEAN NOT NULL DEFAULT false;

-- Launch-specific dates (separate from generic start_date/end_date)
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS launch_start_date DATE;

ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS launch_end_date DATE;

-- Revenue and offer goals at project level
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS revenue_goal NUMERIC;

ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS offer_goal INTEGER;

-- Partial index for fast launch queries
-- Only indexes rows where is_launch = true (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_projects_is_launch 
  ON public.projects(is_launch) 
  WHERE is_launch = true;

-- Comments for documentation
COMMENT ON COLUMN public.projects.is_launch IS 'True if this project is a launch (wizard-generated)';
COMMENT ON COLUMN public.projects.launch_start_date IS 'Cart open date for launches';
COMMENT ON COLUMN public.projects.launch_end_date IS 'Cart close date for launches';
COMMENT ON COLUMN public.projects.revenue_goal IS 'Target revenue for this launch';
COMMENT ON COLUMN public.projects.offer_goal IS 'Target number of offers to make during launch';