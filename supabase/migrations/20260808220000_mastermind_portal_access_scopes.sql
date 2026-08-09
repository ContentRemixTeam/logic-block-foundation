-- One server-side access decision for the Mastermind portal and Replay Vault.
-- Monthly Mastermind members receive core + current 30-day replays.
-- Active annual/lifetime planner entitlements add full Replay Vault scopes.

CREATE OR REPLACE FUNCTION public.get_mastermind_portal_access_scopes(user_email text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.entitlements e
      WHERE lower(e.email) = lower(user_email)
        AND e.tier = 'mastermind'
        AND e.status = 'active'
        AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
    ) THEN ARRAY[]::text[]
    WHEN EXISTS (
      SELECT 1
      FROM public.entitlements e
      WHERE lower(e.email) = lower(user_email)
        AND e.tier = 'mastermind'
        AND e.status = 'active'
        AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
        AND e.planner_tier IN ('annual', 'lifetime')
        AND e.planner_status = 'active'
        AND (e.planner_ends_at IS NULL OR e.planner_ends_at >= CURRENT_DATE)
    ) THEN ARRAY['core_curriculum', 'current_replay_30_day', 'replay_vault', 'vault']::text[]
    ELSE ARRAY['core_curriculum', 'current_replay_30_day']::text[]
  END;
$$;

REVOKE ALL ON FUNCTION public.get_mastermind_portal_access_scopes(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_mastermind_portal_access_scopes(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_mastermind_portal_access_scopes(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_mastermind_portal_access_scopes(text) TO service_role;
