-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.update_wizard_drafts_updated_at()
RETURNS TRIGGER 
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;