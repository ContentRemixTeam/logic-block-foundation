
-- 1) Remove duplicate email-only admin rows when a linked row already exists
DELETE FROM public.admin_users a
USING auth.users u
WHERE a.user_id IS NULL
  AND lower(a.email) = lower(u.email)
  AND EXISTS (SELECT 1 FROM public.admin_users a2 WHERE a2.user_id = u.id);

UPDATE public.admin_users a
SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL AND lower(a.email) = lower(u.email);

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = check_user_id
  );
$$;

DROP POLICY IF EXISTS "Admins can only view own record" ON public.admin_users;
CREATE POLICY "Admins can only view own record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 2) integration_tokens: replace broken WITH CHECK; lock token_hash via column privileges
DROP POLICY IF EXISTS "Users update their own tokens" ON public.integration_tokens;
CREATE POLICY "Users update their own tokens"
ON public.integration_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE ON public.integration_tokens FROM authenticated;
GRANT UPDATE (name, revoked_at, last_used_at) ON public.integration_tokens TO authenticated;

-- 3) user_feature_flags: write policies scoped to owner
CREATE POLICY "Users insert their own feature flags"
ON public.user_feature_flags FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own feature flags"
ON public.user_feature_flags FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own feature flags"
ON public.user_feature_flags FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4) Convert user-scoped SECURITY DEFINER helpers to SECURITY INVOKER
ALTER FUNCTION public.get_current_cycle(uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.get_current_week(uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.get_dashboard_summary(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_monthly_challenge_progress(uuid) SECURITY INVOKER;
ALTER FUNCTION public.toggle_habit(uuid, uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.create_default_project_board(uuid) SECURITY INVOKER;
ALTER FUNCTION public.complete_monthly_challenge_if_ready(uuid) SECURITY INVOKER;
ALTER FUNCTION public.generate_course_study_sessions(uuid, uuid, uuid, date, integer) SECURITY INVOKER;
