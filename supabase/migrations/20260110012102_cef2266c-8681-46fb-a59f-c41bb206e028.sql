-- Update handle_new_user to check entitlements FIRST before setting user_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
  v_user_type TEXT;
  v_raw_user_type TEXT;
  has_entitlement BOOLEAN;
BEGIN
  -- Get user type from metadata
  v_raw_user_type := new.raw_user_meta_data->>'user_type';
  
  -- CRITICAL: CHECK ENTITLEMENTS FIRST - this takes priority over everything
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE LOWER(email) = LOWER(new.email)
      AND tier = 'mastermind'
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
  ) INTO has_entitlement;
  
  -- If they have an active mastermind entitlement, they're a member - period
  IF has_entitlement THEN
    v_user_type := 'member';
    trial_end := NULL;  -- No trial for members
  ELSIF v_raw_user_type IS NOT NULL AND v_raw_user_type IN ('guest', 'member', 'admin') THEN
    v_user_type := v_raw_user_type;
    IF v_user_type = 'guest' THEN
      trial_end := now() + interval '3 days';
    ELSE
      trial_end := NULL;
    END IF;
  ELSE
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