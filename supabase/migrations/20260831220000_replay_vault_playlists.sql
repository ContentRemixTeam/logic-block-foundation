-- Private, entitlement-aware Replay Vault playlists.
-- This migration preserves the 17 Membership.io source playlists and creates
-- draft curated collection records. It does not publish a playlist or item.

CREATE TABLE IF NOT EXISTS public.replay_vault_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 320),
  playlist_kind text NOT NULL CHECK (playlist_kind IN ('source', 'curated', 'hybrid')),
  source_system text,
  source_playlist_id text,
  source_title text,
  source_position integer CHECK (source_position IS NULL OR source_position > 0),
  primary_stage text CHECK (primary_stage IS NULL OR primary_stage IN (
    'Foundation', 'Offer', 'Find', 'Nurture', 'Sell', 'Deliver', 'Leverage', 'Cross-stage'
  )),
  question_cluster_key text,
  access_scope text NOT NULL DEFAULT 'replay_vault' CHECK (access_scope = 'replay_vault'),
  editorial_status text NOT NULL DEFAULT 'draft' CHECK (
    editorial_status IN ('draft', 'review', 'approved', 'retired', 'blocked')
  ),
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (playlist_kind = 'source' AND source_system IS NOT NULL AND source_playlist_id IS NOT NULL
      AND source_title IS NOT NULL AND source_position IS NOT NULL)
    OR playlist_kind IN ('curated', 'hybrid')
  ),
  CHECK (
    (published_at IS NULL AND revoked_at IS NULL)
    OR (published_at IS NOT NULL AND editorial_status = 'approved')
  ),
  UNIQUE (source_system, source_playlist_id),
  UNIQUE (source_system, source_position)
);

CREATE TABLE IF NOT EXISTS public.replay_vault_playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.replay_vault_playlists(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.mastermind_portal_resources(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position > 0),
  start_ms bigint CHECK (start_ms IS NULL OR start_ms >= 0),
  end_ms bigint CHECK (end_ms IS NULL OR end_ms > 0),
  why_this_resource text NOT NULL CHECK (length(trim(why_this_resource)) BETWEEN 1 AND 320),
  source_item_id text,
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (
    match_status IN ('exact', 'probable', 'unmatched', 'duplicate', 'blocked')
  ),
  editorial_status text NOT NULL DEFAULT 'draft' CHECK (
    editorial_status IN ('draft', 'review', 'approved', 'retired', 'blocked')
  ),
  speaker_attribution text,
  rights_status text NOT NULL DEFAULT 'pending' CHECK (
    rights_status IN ('pending', 'approved', 'not_required', 'blocked')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_ms IS NULL OR (start_ms IS NOT NULL AND end_ms > start_ms)),
  UNIQUE (playlist_id, resource_id),
  UNIQUE (playlist_id, position)
);

ALTER TABLE public.replay_vault_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_vault_playlist_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.replay_vault_playlists FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.replay_vault_playlist_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.replay_vault_playlists TO service_role;
GRANT ALL ON public.replay_vault_playlist_items TO service_role;

DROP POLICY IF EXISTS "Service role manages replay vault playlists" ON public.replay_vault_playlists;
CREATE POLICY "Service role manages replay vault playlists"
  ON public.replay_vault_playlists FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages replay vault playlist items" ON public.replay_vault_playlist_items;
CREATE POLICY "Service role manages replay vault playlist items"
  ON public.replay_vault_playlist_items FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS replay_vault_playlists_member_shelf_idx
  ON public.replay_vault_playlists(is_featured DESC, source_position, title)
  WHERE editorial_status = 'approved' AND published_at IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS replay_vault_playlist_items_order_idx
  ON public.replay_vault_playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS replay_vault_playlist_items_resource_idx
  ON public.replay_vault_playlist_items(resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS replay_vault_playlist_items_source_item_idx
  ON public.replay_vault_playlist_items(playlist_id, source_item_id)
  WHERE source_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.replay_vault_validate_playlist_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.published_at IS NOT NULL AND NEW.revoked_at IS NULL THEN
    IF NEW.editorial_status <> 'approved' THEN
      RAISE EXCEPTION 'playlist publication requires editorial approval';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.replay_vault_playlist_items i WHERE i.playlist_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'playlist publication requires at least one item';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.replay_vault_playlist_items i
      LEFT JOIN public.mastermind_portal_resources r ON r.id = i.resource_id
      WHERE i.playlist_id = NEW.id
        AND (
          i.editorial_status <> 'approved'
          OR i.match_status NOT IN ('exact', 'probable')
          OR i.rights_status NOT IN ('approved', 'not_required')
          OR r.id IS NULL
          OR r.publication_state <> 'published'
          OR r.published_at IS NULL
          OR r.revoked_at IS NOT NULL
          OR r.privacy_state <> 'approved'
          OR r.pairing_state <> 'paired'
          OR r.transcript_state <> 'active'
          OR r.media_state <> 'approved'
          OR r.approved_access_scope IS NULL
        )
    ) THEN
      RAISE EXCEPTION 'playlist publication blocked by unresolved item or resource gate';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.replay_vault_validate_playlist_publication() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_validate_playlist_publication() TO service_role;

DROP TRIGGER IF EXISTS replay_vault_playlist_publication_guard ON public.replay_vault_playlists;
CREATE TRIGGER replay_vault_playlist_publication_guard
BEFORE INSERT OR UPDATE ON public.replay_vault_playlists
FOR EACH ROW EXECUTE FUNCTION public.replay_vault_validate_playlist_publication();

CREATE OR REPLACE FUNCTION public.replay_vault_guard_published_playlist_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_playlist_id uuid := coalesce(NEW.playlist_id, OLD.playlist_id);
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.replay_vault_playlists p
    WHERE p.id = v_playlist_id
      AND p.published_at IS NOT NULL
      AND p.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'revoke playlist before changing published items';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.replay_vault_guard_published_playlist_items() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_guard_published_playlist_items() TO service_role;

DROP TRIGGER IF EXISTS replay_vault_published_playlist_items_guard ON public.replay_vault_playlist_items;
CREATE TRIGGER replay_vault_published_playlist_items_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.replay_vault_playlist_items
FOR EACH ROW EXECUTE FUNCTION public.replay_vault_guard_published_playlist_items();

CREATE OR REPLACE FUNCTION public.replay_vault_playlists_authorized(
  p_user_id uuid,
  p_email text,
  p_preview boolean DEFAULT false
)
RETURNS TABLE(
  playlist_id uuid,
  slug text,
  title text,
  description text,
  playlist_kind text,
  primary_stage text,
  is_featured boolean,
  item_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.id, p.slug, p.title, p.description, p.playlist_kind,
         p.primary_stage, p.is_featured, count(i.id)::bigint
  FROM public.replay_vault_playlists p
  JOIN public.replay_vault_playlist_items i ON i.playlist_id = p.id
  JOIN public.replay_published_resource_projection r ON r.id = i.resource_id
  WHERE coalesce((public.replay_vault_access_decision(
          p_user_id, p_email, NULL, 'access', p_preview
        )->>'allowed')::boolean, false)
    AND p.editorial_status = 'approved'
    AND p.published_at IS NOT NULL
    AND p.revoked_at IS NULL
    AND i.editorial_status = 'approved'
    AND i.match_status IN ('exact', 'probable')
    AND i.rights_status IN ('approved', 'not_required')
    AND coalesce((public.replay_vault_access_decision(
          p_user_id, p_email, r.portal_resource_id, 'playback', p_preview
        )->>'allowed')::boolean, false)
  GROUP BY p.id, p.slug, p.title, p.description, p.playlist_kind,
           p.primary_stage, p.is_featured, p.source_position
  ORDER BY p.is_featured DESC, p.source_position NULLS FIRST, p.title;
$$;

CREATE OR REPLACE FUNCTION public.replay_vault_playlist_items_authorized(
  p_user_id uuid,
  p_email text,
  p_playlist_slug text,
  p_preview boolean DEFAULT false
)
RETURNS TABLE(
  playlist_id uuid,
  playlist_slug text,
  playlist_title text,
  resource_id text,
  resource_title text,
  product_title text,
  category_title text,
  item_position integer,
  start_ms bigint,
  end_ms bigint,
  why_this_resource text,
  speaker_attribution text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.id, p.slug, p.title, r.portal_resource_id, r.title,
         r.product_title, r.category_title, i.position, i.start_ms,
         i.end_ms, i.why_this_resource, i.speaker_attribution
  FROM public.replay_vault_playlists p
  JOIN public.replay_vault_playlist_items i ON i.playlist_id = p.id
  JOIN public.replay_published_resource_projection r ON r.id = i.resource_id
  WHERE p.slug = p_playlist_slug
    AND coalesce((public.replay_vault_access_decision(
          p_user_id, p_email, NULL, 'access', p_preview
        )->>'allowed')::boolean, false)
    AND p.editorial_status = 'approved'
    AND p.published_at IS NOT NULL
    AND p.revoked_at IS NULL
    AND i.editorial_status = 'approved'
    AND i.match_status IN ('exact', 'probable')
    AND i.rights_status IN ('approved', 'not_required')
    AND coalesce((public.replay_vault_access_decision(
          p_user_id, p_email, r.portal_resource_id, 'playback', p_preview
        )->>'allowed')::boolean, false)
  ORDER BY i.position;
$$;

REVOKE ALL ON FUNCTION public.replay_vault_playlists_authorized(uuid,text,boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replay_vault_playlist_items_authorized(uuid,text,text,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_vault_playlists_authorized(uuid,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.replay_vault_playlist_items_authorized(uuid,text,text,boolean) TO service_role;

INSERT INTO public.replay_vault_playlists (
  slug, title, description, playlist_kind, source_system, source_playlist_id,
  source_title, source_position, editorial_status, is_featured
)
VALUES
  ('source-replays-2026', 'Replays 2026', '', 'source', 'membership.io', 'qQLjKy5dOB', 'REPLAYS 2026', 1, 'draft', false),
  ('source-sales-marketing', 'Sales & Marketing', '', 'source', 'membership.io', 'yYON8wNwbD', 'Sales & Marketing', 2, 'draft', false),
  ('source-content-visibility', 'Content & Visibility', '', 'source', 'membership.io', 'qQLjKG2xOB', 'Content & Visibility', 3, 'draft', false),
  ('source-email', 'Email', '', 'source', 'membership.io', 'nrOZDYv8bP', 'Email', 4, 'draft', false),
  ('source-money-finance', 'Money & Finance', '', 'source', 'membership.io', 'ZWLGYzRZoy', 'Money & Finance', 5, 'draft', false),
  ('source-mindset', 'Mindset', '', 'source', 'membership.io', 'WwO9lpN3L2', 'Mindset', 6, 'draft', false),
  ('source-ask-faith', 'Ask Faith', '', 'source', 'membership.io', 'QRLa59PPLM', 'ASK FAITH', 7, 'draft', false),
  ('source-guest-workshops', 'Guest Workshops & Co-Coaching Calls', '', 'source', 'membership.io', '5Eoq7n6nL0', 'GUEST WORKSHOPS & CO-COACHING CALLS', 8, 'draft', false),
  ('source-fix-my-offer', 'Fix My Offer', '', 'source', 'membership.io', 'y4b14kdPoX', 'Fix My Offer', 9, 'draft', false),
  ('source-make-money-this-week', 'Make Money This Week', '', 'source', 'membership.io', 'nrOZD1KlbP', 'Make Money This Week', 10, 'draft', false),
  ('source-sell-without-spiraling', 'Sell Without Spiraling', '', 'source', 'membership.io', 'Y0bkn7vYo1', 'Sell Without Spiraling', 11, 'draft', false),
  ('source-when-i-feel-overwhelmed', 'When I Feel Overwhelmed', '', 'source', 'membership.io', 'K8oyGpzMLj', 'When I Feel Overwhelmed', 12, 'draft', false),
  ('source-systems-admin', 'Systems & Admin', '', 'source', 'membership.io', '4mOQjdxPo1', 'Systems & Admin', 13, 'draft', false),
  ('source-launch-promo-support', 'Launch & Promo Support', '', 'source', 'membership.io', 'PdODz7BDby', 'Launch / Promo Support', 14, 'draft', false),
  ('source-bundles-summits-collabs', 'Bundles, Summits & Collaborations', '', 'source', 'membership.io', 'QRLajmZeOM', 'Bundles, Summits & Collabs', 15, 'draft', false),
  ('source-productivity-capacity', 'Productivity & Capacity', '', 'source', 'membership.io', '8moXEkq0bj', 'Productivity + Capacity', 16, 'draft', false),
  ('source-business-planning', 'Business Planning', '', 'source', 'membership.io', 'JBopnqlvLa', 'Biz Planning', 17, 'draft', false)
ON CONFLICT (source_system, source_playlist_id) DO UPDATE SET
  source_title = EXCLUDED.source_title,
  source_position = EXCLUDED.source_position,
  updated_at = now();

INSERT INTO public.replay_vault_playlists (
  slug, title, description, playlist_kind, primary_stage,
  question_cluster_key, editorial_status, is_featured
)
VALUES
  ('focus-next', 'What Should I Focus on Next?', 'Choose the one move that matters now and protect it long enough to learn.', 'curated', 'Foundation', 'focus_next', 'draft', true),
  ('offer-pricing', 'What Should I Sell and Charge?', 'Choose, package, price, and validate an offer before overbuilding it.', 'curated', 'Offer', 'offer_pricing', 'draft', true),
  ('find-buyers', 'How Do I Find the Right Buyers?', 'Find the right people and choose one discovery lane that can create a signal.', 'curated', 'Find', 'buyer_discovery', 'draft', true),
  ('content-email', 'What Should I Say in My Content and Emails?', 'Create useful content and emails that prepare the right people to buy.', 'curated', 'Nurture', 'content_nurture', 'draft', true),
  ('make-sales', 'How Do I Make More Sales?', 'Use sales math, invitations, follow-up, and evidence when sales feel slow.', 'curated', 'Sell', 'sales_conversion', 'draft', true),
  ('capacity', 'How Do I Keep Going When Life Gets Loud?', 'Make a smaller useful move, recover quickly, and adjust from evidence.', 'curated', 'Foundation', 'capacity_mindset', 'draft', true),
  ('customer-results', 'How Do I Help Customers Get Results?', 'Design delivery, support, proof, and retention around the customer result.', 'curated', 'Deliver', 'customer_results', 'draft', true),
  ('systems', 'What Should I Systemize, Delegate, or Automate?', 'Decide what to remove, document, delegate, or automate next.', 'curated', 'Leverage', 'systems_delegation', 'draft', true),
  ('start-here', 'Start Here: Best of the Vault', 'A short path from a 90-day result to weekly action and useful evaluation.', 'curated', 'Cross-stage', NULL, 'draft', true),
  ('guest-workshops', 'Guest Expert Workshops', 'Find rights-cleared guest teaching organized by the problem it helps solve.', 'curated', 'Cross-stage', NULL, 'draft', true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  primary_stage = EXCLUDED.primary_stage,
  question_cluster_key = EXCLUDED.question_cluster_key,
  updated_at = now();

COMMENT ON TABLE public.replay_vault_playlists IS
  'Private source and curated Replay Vault collections; source provenance is preserved separately from member display fields.';
COMMENT ON FUNCTION public.replay_vault_playlists_authorized(uuid,text,boolean) IS
  'Returns no playlist metadata unless the caller passes the canonical Replay Vault entry decision and each counted item is playable.';
