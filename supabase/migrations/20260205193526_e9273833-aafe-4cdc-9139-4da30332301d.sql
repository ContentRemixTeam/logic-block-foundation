-- Fix: Remove client access to google_calendar_secrets (service role only)
-- These are the actual policy names that exist

DROP POLICY IF EXISTS "Users can view their own calendar secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can insert their own calendar secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can update their own calendar secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can delete their own calendar secrets" ON public.google_calendar_secrets;

-- With no policies, only service_role can access this table
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY, so they bypass RLS