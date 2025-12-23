-- Fix search_path for validate_diagnostic_scores function
CREATE OR REPLACE FUNCTION public.validate_diagnostic_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.discover_score IS NOT NULL AND (NEW.discover_score < 1 OR NEW.discover_score > 10) THEN
    RAISE EXCEPTION 'discover_score must be between 1 and 10';
  END IF;
  IF NEW.nurture_score IS NOT NULL AND (NEW.nurture_score < 1 OR NEW.nurture_score > 10) THEN
    RAISE EXCEPTION 'nurture_score must be between 1 and 10';
  END IF;
  IF NEW.convert_score IS NOT NULL AND (NEW.convert_score < 1 OR NEW.convert_score > 10) THEN
    RAISE EXCEPTION 'convert_score must be between 1 and 10';
  END IF;
  RETURN NEW;
END;
$$;