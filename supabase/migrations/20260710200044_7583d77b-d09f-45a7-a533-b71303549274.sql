-- Low Battery signature features: additive schema
-- 1) daily_battery_checkins table
CREATE TABLE public.daily_battery_checkins (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_battery_checkins TO authenticated;
GRANT ALL ON public.daily_battery_checkins TO service_role;

ALTER TABLE public.daily_battery_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own battery checkins"
  ON public.daily_battery_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own battery checkins"
  ON public.daily_battery_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own battery checkins"
  ON public.daily_battery_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own battery checkins"
  ON public.daily_battery_checkins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- validate enum via trigger (not CHECK — allow future values, restores)
CREATE OR REPLACE FUNCTION public.validate_battery_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level IS NULL OR NEW.level NOT IN ('full','half','low','empty') THEN
    RAISE EXCEPTION 'battery level must be one of full|half|low|empty (got %)', NEW.level;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_battery_level
BEFORE INSERT OR UPDATE ON public.daily_battery_checkins
FOR EACH ROW EXECUTE FUNCTION public.validate_battery_level();

CREATE TRIGGER trg_daily_battery_checkins_updated_at
BEFORE UPDATE ON public.daily_battery_checkins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) additive columns on tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS energy_cost text,
  ADD COLUMN IF NOT EXISTS is_bare_minimum boolean NOT NULL DEFAULT false;

-- 3) bare-minimum template on user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS bare_minimum_template jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4) low battery day fields on daily_plans
ALTER TABLE public.daily_plans
  ADD COLUMN IF NOT EXISTS low_battery_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deferred_task_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
