CREATE TABLE public.low_battery_workshop_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 320),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  completed_at timestamptz,
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX low_battery_workshop_submissions_email_idx
  ON public.low_battery_workshop_submissions (lower(email));
CREATE INDEX low_battery_workshop_submissions_created_at_idx
  ON public.low_battery_workshop_submissions (created_at DESC);

ALTER TABLE public.low_battery_workshop_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view low battery workshop submissions"
  ON public.low_battery_workshop_submissions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete low battery workshop submissions"
  ON public.low_battery_workshop_submissions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.register_low_battery_workshop(
  p_first_name text,
  p_email text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.low_battery_workshop_submissions;
  v_name text := trim(p_first_name);
  v_email text := lower(trim(p_email));
BEGIN
  IF char_length(v_name) < 1 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your name.';
  END IF;
  IF char_length(v_email) < 5 OR char_length(v_email) > 320 OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;

  INSERT INTO public.low_battery_workshop_submissions (first_name, email)
  VALUES (v_name, v_email)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('id', v_row.id, 'token', v_row.submission_token, 'first_name', v_row.first_name, 'email', v_row.email);
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
BEGIN
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Answers must be a JSON object.';
  END IF;

  UPDATE public.low_battery_workshop_submissions
  SET answers = p_answers,
      current_step = greatest(1, least(7, p_current_step)),
      completed_at = CASE WHEN p_completed THEN coalesce(completed_at, now()) ELSE completed_at END,
      updated_at = now()
  WHERE id = p_submission_id AND submission_token = p_submission_token;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.register_low_battery_workshop(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_low_battery_workshop_answers(uuid, uuid, jsonb, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_low_battery_workshop(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_low_battery_workshop_answers(uuid, uuid, jsonb, integer, boolean) TO anon, authenticated;
