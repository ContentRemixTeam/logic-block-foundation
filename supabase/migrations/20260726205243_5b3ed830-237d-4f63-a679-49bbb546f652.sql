-- 1) check_feature_flag: no elevated privileges needed (tables are self-scoped by RLS)
CREATE OR REPLACE FUNCTION public.check_feature_flag(p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_override BOOLEAN;
  v_global_enabled BOOLEAN;
  v_rollout_percent INTEGER;
  v_user_hash INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT enabled INTO v_user_override
  FROM public.user_feature_flags
  WHERE user_id = v_user_id AND key = p_key;

  IF FOUND THEN
    RETURN v_user_override;
  END IF;

  SELECT enabled, rollout_percent INTO v_global_enabled, v_rollout_percent
  FROM public.feature_flags
  WHERE key = p_key;

  IF NOT FOUND OR NOT v_global_enabled THEN
    RETURN false;
  END IF;

  v_user_hash := abs(hashtext(v_user_id::text || p_key)) % 100;
  RETURN v_user_hash < v_rollout_percent;
END;
$function$;

-- 2) is_admin: only allow self-checks (or checks performed by an admin)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.user_id = check_user_id
  )
  AND (
    auth.uid() IS NULL
    OR check_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users b WHERE b.user_id = auth.uid())
  );
$function$;

-- 3) check_mastermind_entitlement: only allow callers to check their own email
CREATE OR REPLACE FUNCTION public.check_mastermind_entitlement(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_self_email text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_self_email FROM auth.users WHERE id = v_uid;
    IF LOWER(COALESCE(v_self_email, '')) <> LOWER(COALESCE(user_email, ''))
       AND NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = v_uid) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE LOWER(e.email) = LOWER(user_email)
      AND e.tier = 'mastermind'
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
  );
END;
$function$;