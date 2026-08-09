DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE public.admin_users(user_id uuid PRIMARY KEY);
CREATE FUNCTION public.is_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_user_id)
$$;
CREATE TABLE public.entitlements(
  email text NOT NULL,tier text NOT NULL,status text NOT NULL,starts_at date,ends_at date
);
CREATE TABLE public.mastermind_portal_resources(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portal_resource_id text NOT NULL UNIQUE,
  product_id text,product_title text NOT NULL,category_id text,category_title text,lesson_id text,
  title text NOT NULL,portal_path text NOT NULL,resource_type text NOT NULL DEFAULT 'video',
  access_scope text NOT NULL DEFAULT 'core_curriculum',member_visible_default boolean NOT NULL DEFAULT false,
  is_current_replay boolean NOT NULL DEFAULT false,replay_date date,available_until date,
  success_paths text[] NOT NULL DEFAULT '{}',stages text[] NOT NULL DEFAULT '{}',search_summary text,
  ingestion_status text NOT NULL DEFAULT 'metadata_only_needs_source_review',transcript_evidence text NOT NULL DEFAULT 'no',
  video_source_type text NOT NULL DEFAULT 'no_video_url',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mastermind_portal_source_evidence(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id),
  source_system text NOT NULL,source_fingerprint text NOT NULL,source_ref text,source_url text,dropbox_path text,
  ghl_video_url text,bunny_video_id text,youtube_video_id text,transcript_path text,transcript_source text,
  match_confidence text,match_score numeric,review_status text NOT NULL DEFAULT 'needs_review',notes text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mastermind_portal_transcript_segments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id),
  source_evidence_id uuid,segment_index integer NOT NULL,starts_at_seconds integer,ends_at_seconds integer,speaker text,
  transcript_text text NOT NULL,search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english',coalesce(transcript_text,''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(resource_id,segment_index)
);
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
