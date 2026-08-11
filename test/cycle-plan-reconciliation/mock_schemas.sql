DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
$$;

CREATE TABLE public.cycles_90_day (
  cycle_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  goal text NOT NULL,
  why text,
  identity text,
  target_feeling text,
  supporting_projects jsonb,
  discover_score integer,
  nurture_score integer,
  convert_score integer,
  focus_area text,
  biggest_bottleneck text,
  audience_target text,
  audience_frustration text,
  signature_message text,
  low_energy_version text,
  medium_energy_version text,
  high_energy_version text,
  day1_top3 jsonb,
  day1_why text,
  day2_top3 jsonb,
  day2_why text,
  day3_top3 jsonb,
  day3_why text,
  weekly_planning_day text,
  weekly_debrief_day text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  is_template boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.tasks (
  task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  task_text text NOT NULL,
  task_description text,
  scheduled_date date,
  planned_day date,
  priority text,
  status text NOT NULL DEFAULT 'todo',
  category text,
  context_tags text[],
  is_system_generated boolean NOT NULL DEFAULT false,
  system_source text,
  is_completed boolean NOT NULL DEFAULT false
);

CREATE TABLE public.cycle_success_path_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  recommended_stage text NOT NULL CHECK (recommended_stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage')),
  confirmed_stage text NOT NULL CHECK (confirmed_stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage')),
  recommendation_reason text,
  recommendation_evidence text,
  current_milestone_id text,
  current_milestone_title text,
  capacity_mode text,
  curriculum_version text NOT NULL DEFAULT 'success-path-v1',
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cycle_id)
);

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
