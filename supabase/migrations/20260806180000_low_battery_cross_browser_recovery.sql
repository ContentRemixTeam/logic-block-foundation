-- Additive durability layer for the Low-Battery workshop planner.
-- Existing submissions and answers are preserved.

ALTER TABLE public.low_battery_workshop_submissions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS low_battery_workshop_submissions_user_updated_idx
  ON public.low_battery_workshop_submissions (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.low_battery_workshop_answer_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.low_battery_workshop_submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  reason text NOT NULL DEFAULT 'checkpoint',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS low_battery_workshop_versions_submission_idx
  ON public.low_battery_workshop_answer_versions (submission_id, created_at DESC);

ALTER TABLE public.low_battery_workshop_answer_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their low battery answer history"
  ON public.low_battery_workshop_answer_versions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.load_low_battery_workshop_answers(
  p_submission_id uuid,
  p_submission_token uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'answers', answers,
    'current_step', current_step,
    'completed_at', completed_at,
    'updated_at', updated_at
  )
  FROM public.low_battery_workshop_submissions
  WHERE id = p_submission_id AND submission_token = p_submission_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.load_my_latest_low_battery_workshop()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_row public.low_battery_workshop_submissions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_row
  FROM public.low_battery_workshop_submissions
  WHERE user_id = v_user_id OR lower(email) = v_email
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.low_battery_workshop_submissions
  SET user_id = v_user_id
  WHERE id = v_row.id AND user_id IS NULL AND lower(email) = v_email;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'token', v_row.submission_token,
    'first_name', v_row.first_name,
    'email', v_row.email,
    'answers', v_row.answers,
    'current_step', v_row.current_step,
    'completed_at', v_row.completed_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_low_battery_workshop_answers(
  p_submission_id uuid,
  p_submission_token uuid,
  p_answers jsonb,
  p_current_step integer,
  p_completed boolean DEFAULT false
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Answers must be a JSON object.';
  END IF;

  UPDATE public.low_battery_workshop_submissions
  SET answers = p_answers,
      current_step = greatest(1, least(7, p_current_step)),
      completed_at = CASE WHEN p_completed THEN coalesce(completed_at, now()) ELSE completed_at END,
      user_id = CASE WHEN v_user_id IS NOT NULL AND lower(email) = v_email THEN v_user_id ELSE user_id END,
      updated_at = now()
  WHERE id = p_submission_id AND submission_token = p_submission_token;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.checkpoint_low_battery_workshop_answers(
  p_submission_id uuid,
  p_submission_token uuid,
  p_reason text DEFAULT 'checkpoint'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.low_battery_workshop_submissions;
BEGIN
  SELECT * INTO v_row
  FROM public.low_battery_workshop_submissions
  WHERE id = p_submission_id AND submission_token = p_submission_token;

  IF v_row.id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.low_battery_workshop_answer_versions
    (submission_id, user_id, answers, current_step, reason)
  VALUES
    (v_row.id, v_row.user_id, v_row.answers, v_row.current_step, left(coalesce(p_reason, 'checkpoint'), 80));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.load_low_battery_workshop_answers(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.load_my_latest_low_battery_workshop() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkpoint_low_battery_workshop_answers(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_low_battery_workshop_answers(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_my_latest_low_battery_workshop() TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkpoint_low_battery_workshop_answers(uuid, uuid, text) TO anon, authenticated;

-- Never trust client metadata to grant paid membership. The entitlement ledger is authoritative.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_end timestamptz;
  v_user_type text;
  v_raw_user_type text := new.raw_user_meta_data ->> 'user_type';
  has_entitlement boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE lower(email) = lower(new.email)
      AND tier = 'mastermind'
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at >= current_date)
  ) INTO has_entitlement;

  IF has_entitlement THEN
    v_user_type := 'member';
    trial_end := NULL;
  ELSE
    v_user_type := 'guest';
    trial_end := now() + interval '3 days';
  END IF;

  INSERT INTO public.user_profiles (
    id, email, user_type, workshop_date, trial_started_at, trial_expires_at
  ) VALUES (
    new.id, new.email, v_user_type,
    CASE WHEN (new.raw_user_meta_data ->> 'workshop_date') ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (new.raw_user_meta_data ->> 'workshop_date')::date ELSE NULL END,
    CASE WHEN v_user_type = 'guest' THEN now() ELSE NULL END,
    trial_end
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;
