-- Add RLS policies to entitlements table (RLS is already enabled)
-- Restrict all operations to admins only using the existing is_admin function

-- Drop existing policies if any (to ensure clean state)
DROP POLICY IF EXISTS "Admins can view all entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "Admins can insert entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "Admins can update entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "Admins can delete entitlements" ON public.entitlements;

-- SELECT: Only admins can view entitlements
CREATE POLICY "Admins can view all entitlements"
  ON public.entitlements
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- INSERT: Only admins can create entitlements
CREATE POLICY "Admins can insert entitlements"
  ON public.entitlements
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Only admins can update entitlements
CREATE POLICY "Admins can update entitlements"
  ON public.entitlements
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- DELETE: Only admins can delete entitlements
CREATE POLICY "Admins can delete entitlements"
  ON public.entitlements
  FOR DELETE
  USING (public.is_admin(auth.uid()));