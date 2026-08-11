DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE auth.users (id uuid PRIMARY KEY, email text UNIQUE);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
$$;

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id)
);
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = check_user_id)
$$;

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id), email text, first_name text
);
CREATE TABLE public.cycles_90_day (
  cycle_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id), start_date date NOT NULL,
  end_date date NOT NULL, goal text NOT NULL, focus_area text,
  biggest_bottleneck text, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycle_success_path_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id), current_milestone_title text,
  capacity_mode text
);
CREATE TABLE public.weekly_reviews (
  review_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
  wins text, challenges text, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.tasks (
  task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id), task_text text NOT NULL,
  task_description text, source text, system_source text, external_id text,
  is_system_generated boolean DEFAULT false, priority text, scheduled_date date,
  due_date date, status text, is_completed boolean DEFAULT false
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT SELECT ON public.admin_users, public.user_profiles, public.cycles_90_day,
  public.cycle_success_path_snapshots, public.weekly_reviews, public.tasks TO authenticated;
