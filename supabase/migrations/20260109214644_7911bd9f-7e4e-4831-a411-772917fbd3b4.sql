-- Update the handle_new_user trigger to skip trial dates for members
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
  v_user_type TEXT;
BEGIN
  -- Get user type from metadata
  v_user_type := COALESCE(new.raw_user_meta_data->>'user_type', 'guest');
  
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
END;
$$;