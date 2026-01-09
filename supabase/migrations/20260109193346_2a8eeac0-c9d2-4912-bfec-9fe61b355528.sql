-- Create entitlements table for Mastermind access management
CREATE TABLE public.entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'mastermind',
  status TEXT NOT NULL DEFAULT 'active',
  first_name TEXT,
  last_name TEXT,
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on lowercase email
CREATE UNIQUE INDEX entitlements_email_lower_idx ON public.entitlements (LOWER(email));

-- Add membership fields to user_profiles if not exists
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS membership_tier TEXT,
ADD COLUMN IF NOT EXISTS membership_status TEXT;

-- Enable RLS
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using the is_admin function
CREATE POLICY "Admins can view all entitlements" 
ON public.entitlements 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert entitlements" 
ON public.entitlements 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update entitlements" 
ON public.entitlements 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete entitlements" 
ON public.entitlements 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create function to check mastermind entitlement by email
CREATE OR REPLACE FUNCTION public.check_mastermind_entitlement(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE LOWER(email) = LOWER(user_email)
      AND tier = 'mastermind'
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
  );
$$;

-- Create function to get entitlement details for a user
CREATE OR REPLACE FUNCTION public.get_user_entitlement(user_email TEXT)
RETURNS TABLE(
  id UUID,
  tier TEXT,
  status TEXT,
  starts_at DATE,
  ends_at DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.tier, e.status, e.starts_at, e.ends_at
  FROM public.entitlements e
  WHERE LOWER(e.email) = LOWER(user_email)
    AND e.status = 'active'
    AND (e.ends_at IS NULL OR e.ends_at >= CURRENT_DATE)
  LIMIT 1;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_entitlements_updated_at
BEFORE UPDATE ON public.entitlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();