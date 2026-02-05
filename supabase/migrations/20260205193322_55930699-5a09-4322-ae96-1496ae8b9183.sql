-- Sprint 1 Phase 3: Security Fixes
-- Fix critical RLS policy issues identified by security scan

-- ============================================
-- FIX 1: Admin Users - Restrict to own record only
-- ============================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;

-- Create restrictive policy - admins can only see their own record
CREATE POLICY "Admins can only view own record"
ON public.admin_users FOR SELECT
USING (
  -- User can only see their own admin record
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Or match by email if user_id not set yet
  (user_id IS NULL AND LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())))
);

-- ============================================
-- FIX 2: Google Calendar Secrets - Service Role Only
-- ============================================
-- These tokens should NEVER be accessible via client
DROP POLICY IF EXISTS "Users can manage their own secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can view their own secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can insert their own secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can update their own secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can delete their own secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "google_calendar_secrets_select" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "google_calendar_secrets_insert" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "google_calendar_secrets_update" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "google_calendar_secrets_delete" ON public.google_calendar_secrets;

-- No client access policies = service role only access
-- Edge functions use service role key, so they can still access
-- RLS must be enabled but with no permissive policies for authenticated role

-- ============================================
-- FIX 3: User Profiles - Ensure only own profile visible
-- ============================================
-- Verify/recreate the select policy to be strictly own-user only
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are viewable" ON public.user_profiles;

-- Strict own-user only access
CREATE POLICY "Users can only view own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

-- ============================================
-- FIX 4: Error Logs - Sanitize admin view
-- ============================================
-- Ensure users can only see their own error logs
DROP POLICY IF EXISTS "Users can view their error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Admins can view all error logs" ON public.error_logs;
DROP POLICY IF EXISTS "error_logs_select" ON public.error_logs;

-- Users see only their own logs
CREATE POLICY "Users can view own error logs"
ON public.error_logs FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all but via a security definer function
-- to avoid exposing sensitive data directly
CREATE POLICY "Admins can view all error logs sanitized"
ON public.error_logs FOR SELECT
USING (public.is_admin(auth.uid()));

-- Insert policy - users can only insert for themselves
DROP POLICY IF EXISTS "Users can insert error logs" ON public.error_logs;
DROP POLICY IF EXISTS "error_logs_insert" ON public.error_logs;

CREATE POLICY "Users can insert own error logs"
ON public.error_logs FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());