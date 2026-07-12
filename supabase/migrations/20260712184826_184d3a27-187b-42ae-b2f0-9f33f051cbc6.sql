
-- ============================================================
-- 1) SECURITY DEFINER function lockdown
-- Revoke EXECUTE from PUBLIC/anon/authenticated on all public
-- SECURITY DEFINER functions, then re-grant only those the
-- client actually calls via supabase.rpc().
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated only on client-callable RPCs
GRANT EXECUTE ON FUNCTION public.check_feature_flag(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_mastermind_entitlement(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_monthly_challenge_if_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_project_board(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_course_study_sessions(uuid, uuid, uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_cycle(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_week(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_challenge_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_habit(uuid, uuid, date) TO authenticated;

-- ============================================================
-- 2) weekly_reviews: stop exposing shared reviews to every
-- authenticated user via the client. Community feed is served
-- by the get-community-reviews edge function (service role),
-- which returns only wins/challenges/adjustments.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view shared reviews" ON public.weekly_reviews;
-- "Users can view their own weekly reviews" policy remains and covers owner reads.

-- ============================================================
-- 3) entitlements: defense in depth — ensure anon has zero
-- privileges on the members table.
-- ============================================================

REVOKE ALL ON TABLE public.entitlements FROM anon;
