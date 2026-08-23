DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text UNIQUE);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
$$;

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycles_90_day (
  cycle_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
  start_date date NOT NULL, end_date date NOT NULL, goal text NOT NULL, why text, identity text,
  target_feeling text, supporting_projects jsonb DEFAULT '[]', discover_score integer, nurture_score integer,
  convert_score integer, focus_area text, biggest_bottleneck text, audience_target text, audience_frustration text,
  signature_message text, wish text, outcome text, obstacle text, if_then_plan text, low_energy_version text,
  medium_energy_version text, high_energy_version text, things_to_remember jsonb DEFAULT '[]',
  metric_1_name text, metric_1_start numeric, metric_1_goal numeric, metric_2_name text, metric_2_start numeric,
  metric_2_goal numeric, metric_3_name text, metric_3_start numeric, metric_3_goal numeric, metric_4_name text,
  metric_4_start numeric, metric_4_goal numeric, metric_5_name text, metric_5_start numeric, metric_5_goal numeric,
  weekly_planning_day text, weekly_debrief_day text, office_hours_start time, office_hours_end time,
  office_hours_days jsonb DEFAULT '[]', biggest_fear text, fear_response text, commitment_statement text,
  accountability_person text, day1_top3 jsonb DEFAULT '[]', day1_why text, day2_top3 jsonb DEFAULT '[]',
  day2_why text, day3_top3 jsonb DEFAULT '[]', day3_why text, promotions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycle_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE, draft_data jsonb NOT NULL DEFAULT '{}',
  current_step integer DEFAULT 1, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.cycle_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own drafts" ON public.cycle_drafts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts" ON public.cycle_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.cycle_drafts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.cycle_drafts
  FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE public.cycle_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cycle_id uuid NOT NULL UNIQUE REFERENCES public.cycles_90_day(cycle_id),
  user_id uuid NOT NULL, lead_primary_platform text, lead_content_type text, lead_frequency text,
  lead_committed_90_days boolean DEFAULT false, nurture_method text, nurture_frequency text, free_transformation text,
  proof_methods jsonb DEFAULT '[]', posting_days jsonb DEFAULT '[]', posting_time text, batch_day text,
  batch_frequency text, lead_gen_content_audit text, nurture_posting_days jsonb DEFAULT '[]', nurture_posting_time text,
  nurture_batch_day text, nurture_batch_frequency text, nurture_content_audit text, secondary_platforms jsonb DEFAULT '[]',
  nurture_platforms jsonb DEFAULT '[]', updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycle_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id),
  user_id uuid NOT NULL, offer_name text NOT NULL, price numeric, sales_frequency text, transformation text,
  sort_order integer DEFAULT 0, is_primary boolean DEFAULT false, updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycle_limited_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id),
  user_id uuid NOT NULL, name text NOT NULL, offer_id uuid REFERENCES public.cycle_offers(id), start_date date NOT NULL,
  end_date date NOT NULL, promo_type text, discount text, notes text, sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycle_revenue_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cycle_id uuid NOT NULL UNIQUE REFERENCES public.cycles_90_day(cycle_id),
  user_id uuid NOT NULL, revenue_goal numeric, price_per_sale numeric, sales_needed numeric, launch_schedule text,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.cycle_month_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id),
  user_id uuid NOT NULL, month_number integer NOT NULL, month_name text, projects_text text, sales_promos_text text,
  main_focus text, updated_at timestamptz DEFAULT now(), UNIQUE(cycle_id, month_number)
);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, cycle_id uuid REFERENCES public.cycles_90_day(cycle_id),
  name text NOT NULL, description text, status text NOT NULL DEFAULT 'active', color text, start_date date, end_date date,
  is_template boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.habits (
  habit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, cycle_id uuid REFERENCES public.cycles_90_day(cycle_id),
  habit_name text NOT NULL, category text, display_order integer DEFAULT 0, is_active boolean DEFAULT true,
  deleted_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.tasks (
  task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, project_id uuid REFERENCES public.projects(id),
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id), task_text text NOT NULL, task_description text,
  scheduled_date date, planned_day date, priority text, status text NOT NULL DEFAULT 'todo', category text,
  context_tags text[] DEFAULT '{}', is_system_generated boolean DEFAULT false, system_source text,
  is_completed boolean DEFAULT false, deleted_at timestamptz, created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.daily_plans (
  day_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, cycle_id uuid REFERENCES public.cycles_90_day(cycle_id),
  date date NOT NULL, top_3_today jsonb DEFAULT '[]', thought text, feeling text,
  selected_weekly_priorities jsonb DEFAULT '[]', deep_mode_notes jsonb DEFAULT '{}', made_offer boolean DEFAULT false,
  daily_wins jsonb DEFAULT '[]', scratch_pad_content text, one_thing text, alignment_score integer,
  brain_dump text, end_of_day_reflection text, active_launch_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(), UNIQUE(user_id, date)
);

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
