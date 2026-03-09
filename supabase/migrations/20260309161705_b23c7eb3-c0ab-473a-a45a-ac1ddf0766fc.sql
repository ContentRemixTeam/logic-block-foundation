
CREATE TABLE public.workshop_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  business_name TEXT,
  testimonial TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  engine_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public workshop form)
CREATE POLICY "Anyone can submit testimonials"
  ON public.workshop_testimonials FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Admins can view testimonials"
  ON public.workshop_testimonials FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
