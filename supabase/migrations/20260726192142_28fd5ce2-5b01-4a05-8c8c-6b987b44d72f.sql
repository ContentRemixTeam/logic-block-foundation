-- 1) Protect entitlement columns on user_profiles from self-service edits
CREATE OR REPLACE FUNCTION public.protect_user_profile_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- service_role / backend (no JWT) and admins may change entitlement columns
  IF v_uid IS NULL
     OR current_user IN ('service_role', 'supabase_admin', 'postgres')
     OR public.is_admin(v_uid) THEN
    RETURN NEW;
  END IF;

  -- Everyone else: silently keep the stored values
  NEW.user_type         := OLD.user_type;
  NEW.membership_status := OLD.membership_status;
  NEW.membership_tier   := OLD.membership_tier;
  NEW.trial_expires_at  := OLD.trial_expires_at;
  NEW.trial_started_at  := OLD.trial_started_at;
  NEW.upgraded_at       := OLD.upgraded_at;
  NEW.id                := OLD.id;
  NEW.email             := OLD.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profile_entitlements ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_entitlements
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_profile_entitlements();

-- 2) New signups never trust client-supplied user_type / membership metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
  v_user_type TEXT;
  has_entitlement BOOLEAN;
BEGIN
  -- Server-verified entitlement is the ONLY way to start as a member
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
    -- Client metadata is ignored: everyone else starts on a 3-day trial
    v_user_type := 'guest';
    trial_end := now() + interval '3 days';
  END IF;

  INSERT INTO public.user_profiles (
    id,
    email,
    user_type,
    workshop_date,
    trial_started_at,
    trial_expires_at
  )
  VALUES (
    new.id,
    new.email,
    v_user_type,
    (new.raw_user_meta_data->>'workshop_date')::DATE,
    CASE WHEN v_user_type = 'guest' THEN now() ELSE NULL END,
    trial_end
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;