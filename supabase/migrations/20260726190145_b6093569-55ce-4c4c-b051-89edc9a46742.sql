CREATE OR REPLACE FUNCTION public.set_task_energy_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  IF NEW.energy_cost IS NOT NULL THEN
    RETURN NEW;
  END IF;

  t := lower(coalesce(NEW.task_text, ''));

  IF t ~ '(schedule|post |posting|publish|share|reply|respond|check|update|send|confirm|upload|tidy|clean up|log |archive|celebrate|reflect|remind)'
     AND coalesce(NEW.estimated_minutes, 0) < 60 THEN
    NEW.energy_cost := 'low';
  ELSIF t ~ '(record|film|video|live|webinar|workshop|launch|pitch|call|coaching|interview|present|sales page|write|outline|create|build|design|draft|strategy|masterclass|summit|speak|sequence|onboard)' THEN
    NEW.energy_cost := 'high';
  ELSIF NEW.estimated_minutes IS NOT NULL AND NEW.estimated_minutes <= 15 THEN
    NEW.energy_cost := 'low';
  ELSIF NEW.estimated_minutes IS NOT NULL AND NEW.estimated_minutes >= 90 THEN
    NEW.energy_cost := 'high';
  ELSE
    NEW.energy_cost := 'medium';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_task_energy_cost ON public.tasks;
CREATE TRIGGER trg_set_task_energy_cost
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_energy_cost();