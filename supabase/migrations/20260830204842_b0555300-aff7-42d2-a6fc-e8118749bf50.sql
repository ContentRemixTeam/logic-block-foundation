CREATE TABLE IF NOT EXISTS public.replay_launch_case_collision_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excluded_portal_resource_id text NOT NULL UNIQUE,
  retained_portal_resource_id text NOT NULL,
  origin_batch_key text NOT NULL,
  review_state text NOT NULL DEFAULT 'pending_review',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.replay_launch_case_collision_reviews TO service_role;
ALTER TABLE public.replay_launch_case_collision_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.replay_launch_batch_derivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_batch_key text NOT NULL,
  origin_batch_sha256 text NOT NULL,
  derived_batch_key text NOT NULL UNIQUE,
  derived_batch_sha256 text NOT NULL,
  omitted_portal_resource_ids text[] NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.replay_launch_batch_derivations TO service_role;
ALTER TABLE public.replay_launch_batch_derivations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER replay_launch_case_collision_reviews_touch
  BEFORE UPDATE ON public.replay_launch_case_collision_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();