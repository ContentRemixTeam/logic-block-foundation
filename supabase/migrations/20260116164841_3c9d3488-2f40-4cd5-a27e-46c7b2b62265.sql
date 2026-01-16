-- Fix rate_limits RLS policy to restrict access to service_role only
-- The previous policy allowed ALL access to everyone, defeating rate limiting

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role has full access to rate_limits" ON public.rate_limits;

-- Revoke all privileges from public roles
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;

-- Grant full access only to service_role (edge functions use this)
GRANT ALL ON public.rate_limits TO service_role;

-- Create a properly scoped policy for service_role only
-- Note: RLS policies don't apply to service_role by default when using the service key,
-- but we add this for defense in depth and documentation
CREATE POLICY "Only service_role can access rate_limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);