-- 1) google_calendar_secrets: service-role only
DROP POLICY IF EXISTS "Users can view own calendar secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can insert own calendar secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can update own calendar secrets" ON public.google_calendar_secrets;
DROP POLICY IF EXISTS "Users can delete own calendar secrets" ON public.google_calendar_secrets;

-- 2) Add WITH CHECK owner guards
DROP POLICY IF EXISTS "Users can manage own frameworks" ON public.messaging_frameworks;
CREATE POLICY "Users can manage own frameworks" ON public.messaging_frameworks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own selling points" ON public.selling_points;
CREATE POLICY "Users can manage own selling points" ON public.selling_points
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own plans" ON public.content_plans;
CREATE POLICY "Users can manage own plans" ON public.content_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own plan items" ON public.content_plan_items;
CREATE POLICY "Users can manage own plan items" ON public.content_plan_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own launch reflections" ON public.daily_launch_reflections;
CREATE POLICY "Users can manage their own launch reflections" ON public.daily_launch_reflections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) workshop_testimonials: require login to submit
DROP POLICY IF EXISTS "Anyone can submit validated testimonials" ON public.workshop_testimonials;
CREATE POLICY "Authenticated users can submit validated testimonials"
  ON public.workshop_testimonials
  FOR INSERT TO authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) >= 3 AND length(email) <= 255
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(COALESCE(name, '')) >= 1 AND length(COALESCE(name, '')) <= 200
    AND length(COALESCE(testimonial, '')) >= 1 AND length(COALESCE(testimonial, '')) <= 5000
  );