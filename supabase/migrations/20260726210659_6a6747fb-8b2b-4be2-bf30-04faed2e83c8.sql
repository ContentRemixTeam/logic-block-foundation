DROP POLICY IF EXISTS "Authenticated users can submit validated testimonials" ON public.workshop_testimonials;
DROP POLICY IF EXISTS "Anyone can submit testimonials" ON public.workshop_testimonials;
REVOKE INSERT ON public.workshop_testimonials FROM anon;
REVOKE INSERT ON public.workshop_testimonials FROM authenticated;
GRANT ALL ON public.workshop_testimonials TO service_role;