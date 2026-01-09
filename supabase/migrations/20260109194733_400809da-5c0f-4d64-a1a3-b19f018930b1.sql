-- Add email column for pre-registering admins before they sign up
ALTER TABLE public.admin_users 
ADD COLUMN email text UNIQUE;

-- Make user_id nullable for pre-registration
ALTER TABLE public.admin_users 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: must have either user_id or email
ALTER TABLE public.admin_users 
ADD CONSTRAINT admin_has_identifier 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Update is_admin function to check both user_id and email
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- First check by user_id
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = check_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get user's email and check pre-registered admins
  SELECT email INTO user_email FROM auth.users WHERE id = check_user_id;
  IF user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_users WHERE LOWER(admin_users.email) = LOWER(user_email)
  ) THEN
    -- Auto-fill the user_id for faster future lookups
    UPDATE public.admin_users 
    SET user_id = check_user_id 
    WHERE LOWER(admin_users.email) = LOWER(user_email) AND user_id IS NULL;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Pre-register info@faithmariah.com as admin
INSERT INTO public.admin_users (email) 
VALUES ('info@faithmariah.com');