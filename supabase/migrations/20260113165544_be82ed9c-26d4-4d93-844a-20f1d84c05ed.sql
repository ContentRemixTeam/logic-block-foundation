-- Add RLS policy to rate_limits table for service role access
-- This table is used internally for API rate limiting

CREATE POLICY "Service role has full access to rate_limits"
ON public.rate_limits
FOR ALL
USING (true)
WITH CHECK (true);