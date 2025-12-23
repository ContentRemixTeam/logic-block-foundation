-- Add Business Diagnostic columns to cycles_90_day table
ALTER TABLE public.cycles_90_day
ADD COLUMN discover_score INTEGER DEFAULT 5,
ADD COLUMN nurture_score INTEGER DEFAULT 5,
ADD COLUMN convert_score INTEGER DEFAULT 5,
ADD COLUMN focus_area TEXT DEFAULT NULL;

-- Add check constraints using triggers instead of CHECK constraints for flexibility
CREATE OR REPLACE FUNCTION public.validate_diagnostic_scores()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_diagnostic_scores_trigger
BEFORE INSERT OR UPDATE ON public.cycles_90_day
FOR EACH ROW
EXECUTE FUNCTION public.validate_diagnostic_scores();