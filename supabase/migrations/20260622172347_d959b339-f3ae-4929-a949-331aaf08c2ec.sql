
-- 1. Lock down SECURITY DEFINER (and other) functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- Re-grant EXECUTE to authenticated only on RPCs the app actually calls from the client
GRANT EXECUTE ON FUNCTION public.check_feature_flag(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_mastermind_entitlement(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_monthly_challenge_if_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_project_board(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_challenge_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_habit(uuid, uuid, date) TO authenticated;

-- 2. Remove entitlements self-lookup enumeration vector.
-- Regular users read their membership through the SECURITY DEFINER RPC `check_mastermind_entitlement`,
-- which still works (we just granted EXECUTE to authenticated above).
DROP POLICY IF EXISTS "Users can view their own entitlement" ON public.entitlements;

-- 3. Fix realtime channel substring bypass: require exact match on the user's UUID
DROP POLICY IF EXISTS "Authenticated users can only join their own topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can only broadcast their own topics" ON realtime.messages;

CREATE POLICY "Authenticated users can only join their own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() = (auth.uid())::text);

CREATE POLICY "Authenticated users can only broadcast their own topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() = (auth.uid())::text);
