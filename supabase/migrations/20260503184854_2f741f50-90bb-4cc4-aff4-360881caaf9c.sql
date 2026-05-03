
-- 1. workshop_testimonials: tighten INSERT with validation
DROP POLICY IF EXISTS "Anyone can submit testimonials" ON public.workshop_testimonials;
CREATE POLICY "Anyone can submit validated testimonials"
ON public.workshop_testimonials
FOR INSERT
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(coalesce(name, '')) BETWEEN 1 AND 200
  AND length(coalesce(testimonial, '')) BETWEEN 1 AND 5000
);

-- 2. entitlements: allow self-read by email
CREATE POLICY "Users can view their own entitlement"
ON public.entitlements
FOR SELECT
USING (
  lower(email) = lower((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text)
);

-- 3. emergency_saves: add INSERT policy
CREATE POLICY "Users can insert own emergency saves"
ON public.emergency_saves
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. user_settings: remove plaintext ai_api_key (no rows present)
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS ai_api_key;

-- 5. admin_users: consolidate duplicate policies
DROP POLICY IF EXISTS "Admins can delete admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON public.admin_users;

-- 6. is_admin: split side-effect out of STABLE function
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = check_user_id) THEN
    RETURN true;
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = check_user_id;
  IF user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_users WHERE LOWER(admin_users.email) = LOWER(user_email)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- Side-effect function for backfilling user_id on admin_users (called explicitly when needed)
CREATE OR REPLACE FUNCTION public.backfill_admin_user_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_email TEXT;
BEGIN
  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
  IF current_email IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.admin_users
  SET user_id = auth.uid()
  WHERE LOWER(admin_users.email) = LOWER(current_email)
    AND user_id IS NULL;
END;
$function$;

-- 7. Realtime channel authorization: restrict subscriptions to own user channels
-- Users must subscribe to a topic that includes their own auth.uid()
CREATE POLICY "Authenticated users can only join their own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

CREATE POLICY "Authenticated users can only broadcast their own topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
