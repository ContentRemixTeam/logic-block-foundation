-- Add new fields to weekly_plans table for the redesigned worksheet
ALTER TABLE weekly_plans 
ADD COLUMN IF NOT EXISTS weekly_scratch_pad TEXT,
ADD COLUMN IF NOT EXISTS goal_checkin_notes TEXT,
ADD COLUMN IF NOT EXISTS alignment_reflection TEXT,
ADD COLUMN IF NOT EXISTS alignment_rating INTEGER;

-- Add constraint for rating (using trigger instead of CHECK for Supabase compatibility)
CREATE OR REPLACE FUNCTION public.validate_alignment_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.alignment_rating IS NOT NULL AND (NEW.alignment_rating < 1 OR NEW.alignment_rating > 5) THEN
    RAISE EXCEPTION 'alignment_rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_alignment_rating_trigger ON weekly_plans;
CREATE TRIGGER validate_alignment_rating_trigger
  BEFORE INSERT OR UPDATE ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_alignment_rating();