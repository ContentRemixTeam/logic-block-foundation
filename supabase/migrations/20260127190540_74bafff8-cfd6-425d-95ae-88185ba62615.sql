-- Add new columns to daily_plans
ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS 
  alignment_score integer;

ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS 
  brain_dump text;

ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS 
  end_of_day_reflection text;

-- Add last_activity_date to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS 
  last_activity_date date;

-- Create validation trigger for daily_plans fields
CREATE OR REPLACE FUNCTION public.validate_daily_plan_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate alignment_score (1-10)
  IF NEW.alignment_score IS NOT NULL AND (NEW.alignment_score < 1 OR NEW.alignment_score > 10) THEN
    RAISE EXCEPTION 'alignment_score must be between 1 and 10';
  END IF;
  
  -- Validate brain_dump length (max 10000 chars)
  IF NEW.brain_dump IS NOT NULL AND char_length(NEW.brain_dump) > 10000 THEN
    RAISE EXCEPTION 'brain_dump cannot exceed 10000 characters';
  END IF;
  
  -- Validate end_of_day_reflection length (max 1000 chars)
  IF NEW.end_of_day_reflection IS NOT NULL AND char_length(NEW.end_of_day_reflection) > 1000 THEN
    RAISE EXCEPTION 'end_of_day_reflection cannot exceed 1000 characters';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the validation trigger
DROP TRIGGER IF EXISTS validate_daily_plan_fields_trigger ON public.daily_plans;
CREATE TRIGGER validate_daily_plan_fields_trigger
  BEFORE INSERT OR UPDATE ON public.daily_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_daily_plan_fields();

-- Create function to update last_activity_date
CREATE OR REPLACE FUNCTION public.update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles 
  SET last_activity_date = CURRENT_DATE
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the activity tracking trigger
DROP TRIGGER IF EXISTS daily_plan_activity_trigger ON public.daily_plans;
CREATE TRIGGER daily_plan_activity_trigger
  AFTER INSERT OR UPDATE ON public.daily_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_activity();