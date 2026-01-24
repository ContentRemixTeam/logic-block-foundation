-- Add project_id to course_study_plans for linking study sessions to a project
ALTER TABLE public.course_study_plans 
ADD COLUMN IF NOT EXISTS project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add hours_per_week and hours_per_month options to study plans
ALTER TABLE public.course_study_plans 
ADD COLUMN IF NOT EXISTS study_hours_per_week NUMERIC(4,1) NULL,
ADD COLUMN IF NOT EXISTS study_hours_per_month NUMERIC(5,1) NULL,
ADD COLUMN IF NOT EXISTS study_mode TEXT NOT NULL DEFAULT 'sessions' CHECK (study_mode IN ('sessions', 'hours_weekly', 'hours_monthly'));

-- Add index for project-linked study plans
CREATE INDEX IF NOT EXISTS idx_study_plans_project ON public.course_study_plans(project_id) WHERE project_id IS NOT NULL;

-- Update comment to document the new schema
COMMENT ON COLUMN public.course_study_plans.study_mode IS 'Mode of study time allocation: sessions (per week), hours_weekly, or hours_monthly';
COMMENT ON COLUMN public.course_study_plans.study_hours_per_week IS 'Hours per week for hours_weekly mode';
COMMENT ON COLUMN public.course_study_plans.study_hours_per_month IS 'Hours per month for hours_monthly mode';
COMMENT ON COLUMN public.course_study_plans.project_id IS 'Optional project to organize study sessions under';