GRANT SELECT ON public.member_access TO authenticated;
GRANT ALL ON public.member_access TO service_role;

DROP POLICY IF EXISTS "Users can view their own access" ON public.member_access;
CREATE POLICY "Users can view their own access"
ON public.member_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());