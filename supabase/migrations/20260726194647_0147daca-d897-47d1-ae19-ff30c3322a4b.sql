-- Backfill: link existing member_access rows to accounts by email
UPDATE public.member_access ma
SET user_id = u.id, updated_at = now()
FROM auth.users u
WHERE ma.user_id IS NULL AND lower(u.email) = lower(ma.email);

-- Extend signup handler to link any pre-purchased access to the new account
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trial_end TIMESTAMPTZ;
  v_user_type TEXT;
  has_entitlement BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE LOWER(email) = LOWER(new.email)
      AND tier = 'mastermind'
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
  ) INTO has_entitlement;

  IF has_entitlement THEN
    v_user_type := 'member';
    trial_end := NULL;
  ELSE
    v_user_type := 'guest';
    trial_end := now() + interval '3 days';
  END IF;

  INSERT INTO public.user_profiles (
    id, email, user_type, workshop_date, trial_started_at, trial_expires_at
  )
  VALUES (
    new.id,
    new.email,
    v_user_type,
    (new.raw_user_meta_data->>'workshop_date')::DATE,
    CASE WHEN v_user_type = 'guest' THEN now() ELSE NULL END,
    trial_end
  )
  ON CONFLICT (id) DO NOTHING;

  -- Attach any access granted before this account existed
  UPDATE public.member_access
  SET user_id = new.id, updated_at = now()
  WHERE user_id IS NULL AND LOWER(email) = LOWER(new.email);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$function$;