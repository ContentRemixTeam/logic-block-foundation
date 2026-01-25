-- Add investment and check-in columns to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'USD';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS payment_plan_type TEXT; -- 'one_time', 'monthly', 'custom'
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS payment_plan_payments INTEGER; -- number of payments
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS payment_plan_amount DECIMAL(10,2); -- per-payment amount
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS payment_schedule JSONB DEFAULT '[]'::jsonb; -- [{date, amount, paid}]
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS add_to_expenses BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS checkin_frequency TEXT; -- 'daily', 'weekly', 'monthly', null
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS roi_deadline DATE; -- when ROI target should be hit

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_courses_checkin_frequency ON public.courses(user_id, checkin_frequency) WHERE checkin_frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_roi_deadline ON public.courses(user_id, roi_deadline) WHERE roi_deadline IS NOT NULL;