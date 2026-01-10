
-- Fix the handle_new_user trigger to validate user_type and prevent constraint violations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
  v_user_type TEXT;
  v_raw_user_type TEXT;
BEGIN
  -- Get user type from metadata, with validation
  v_raw_user_type := new.raw_user_meta_data->>'user_type';
  
  -- Validate and sanitize user_type - only allow valid values
  -- If invalid or missing, default to 'guest'
  IF v_raw_user_type IS NULL OR v_raw_user_type NOT IN ('guest', 'member', 'admin') THEN
    v_user_type := 'guest';
  ELSE
    v_user_type := v_raw_user_type;
  END IF;
  
  -- Only set trial dates for guest users, not for members or admins
  IF v_user_type = 'guest' THEN
    trial_end := now() + interval '3 days';
  ELSE
    trial_end := NULL;
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
    -- Profile already exists, just return the new user
    RETURN new;
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;
