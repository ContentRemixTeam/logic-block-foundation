-- Create office_hours table for storing user office hour blocks
CREATE TABLE public.office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Use trigger-based validation instead of CHECK constraint for time validation
CREATE OR REPLACE FUNCTION public.validate_office_hours_times()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'end_time must be greater than start_time';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_office_hours_times_trigger
BEFORE INSERT OR UPDATE ON public.office_hours
FOR EACH ROW
EXECUTE FUNCTION public.validate_office_hours_times();

-- Index for fast lookup by user and day
CREATE INDEX idx_office_hours_user_day ON public.office_hours(user_id, day_of_week);

-- Enable RLS
ALTER TABLE public.office_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own office hours" 
ON public.office_hours 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own office hours" 
ON public.office_hours 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own office hours" 
ON public.office_hours 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own office hours" 
ON public.office_hours 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_office_hours_updated_at
BEFORE UPDATE ON public.office_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();