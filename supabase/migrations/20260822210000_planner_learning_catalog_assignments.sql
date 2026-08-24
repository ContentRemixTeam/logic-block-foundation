-- Wave 2: versioned Planner Learning catalog and frozen per-cycle assignment authority.
-- This schema is intentionally separate from every Replay Vault catalog, interaction,
-- search, saved-video, transcript, and playback destination.

CREATE TABLE IF NOT EXISTS public.curriculum_media_assets_private (
  media_asset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text NOT NULL UNIQUE CHECK (btrim(asset_key) <> ''),
  canonical_resource_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (btrim(provider) <> ''),
  provider_asset_id text NOT NULL CHECK (btrim(provider_asset_id) <> ''),
  private_locator text NOT NULL CHECK (btrim(private_locator) <> ''),
  source_content_sha256 text NOT NULL CHECK (source_content_sha256 ~ '^[0-9a-f]{64}$'),
  transcript_version_id uuid NOT NULL,
  playback_attempt_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  UNIQUE(provider, provider_asset_id)
);

CREATE TABLE IF NOT EXISTS public.curriculum_catalog_versions (
  catalog_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_context text NOT NULL DEFAULT 'planner_learning'
    CHECK (catalog_context = 'planner_learning'),
  version_key text NOT NULL UNIQUE CHECK (btrim(version_key) <> ''),
  version_number bigint NOT NULL CHECK (version_number > 0),
  lifecycle_state text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_state IN ('draft', 'active', 'superseded', 'revoked')),
  supersedes_version_id uuid REFERENCES public.curriculum_catalog_versions(catalog_version_id) ON DELETE RESTRICT,
  superseded_by_version_id uuid REFERENCES public.curriculum_catalog_versions(catalog_version_id) ON DELETE RESTRICT,
  content_sha256 text CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  published_at timestamptz,
  superseded_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  UNIQUE(catalog_context, version_number),
  CHECK (supersedes_version_id IS NULL OR supersedes_version_id <> catalog_version_id),
  CHECK (superseded_by_version_id IS NULL OR superseded_by_version_id <> catalog_version_id),
  CHECK (
    lifecycle_state <> 'active'
    OR (published_at IS NOT NULL AND content_sha256 IS NOT NULL AND revoked_at IS NULL)
  ),
  CHECK (
    lifecycle_state <> 'superseded'
    OR (published_at IS NOT NULL AND superseded_at IS NOT NULL AND superseded_by_version_id IS NOT NULL)
  ),
  CHECK (
    lifecycle_state <> 'revoked'
    OR (revoked_at IS NOT NULL AND btrim(coalesce(revocation_reason, '')) <> '')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_catalog_versions_one_active_idx
  ON public.curriculum_catalog_versions(catalog_context)
  WHERE lifecycle_state = 'active';

CREATE TABLE IF NOT EXISTS public.curriculum_catalog_items (
  catalog_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_version_id uuid NOT NULL
    REFERENCES public.curriculum_catalog_versions(catalog_version_id) ON DELETE RESTRICT,
  stable_item_key text NOT NULL CHECK (btrim(stable_item_key) <> ''),
  item_state text NOT NULL CHECK (item_state IN (
    'gap', 'candidate', 'refresh_required', 'ready', 'revoked'
  )),
  stage text NOT NULL CHECK (stage IN ('offer', 'find', 'nurture', 'sell', 'deliver', 'leverage')),
  milestone_key text NOT NULL CHECK (btrim(milestone_key) <> ''),
  milestone_title text NOT NULL CHECK (btrim(milestone_title) <> ''),
  item_role text NOT NULL CHECK (item_role IN ('primary', 'supporting', 'optional')),
  item_order integer NOT NULL CHECK (item_order > 0),
  title text NOT NULL CHECK (btrim(title) <> ''),
  intended_output text NOT NULL CHECK (btrim(intended_output) <> ''),
  action_prompt text,
  evidence_prompt text,
  teacher_display_name text NOT NULL CHECK (btrim(teacher_display_name) <> ''),
  attribution_text text NOT NULL CHECK (btrim(attribution_text) <> ''),
  source_system text NOT NULL CHECK (btrim(source_system) <> ''),
  source_native_id text NOT NULL CHECK (btrim(source_native_id) <> ''),
  source_provenance text NOT NULL CHECK (btrim(source_provenance) <> ''),
  provenance_sha256 text CHECK (provenance_sha256 IS NULL OR provenance_sha256 ~ '^[0-9a-f]{64}$'),
  media_asset_id uuid REFERENCES public.curriculum_media_assets_private(media_asset_id) ON DELETE RESTRICT,
  canonical_resource_id uuid,
  transcript_version_id uuid,
  playback_attempt_id uuid,
  publication_sha256 text CHECK (publication_sha256 IS NULL OR publication_sha256 ~ '^[0-9a-f]{64}$'),
  transcript_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (transcript_qa_state IN ('pending', 'approved', 'rejected')),
  provenance_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (provenance_qa_state IN ('pending', 'approved', 'rejected')),
  rights_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (rights_qa_state IN ('pending', 'approved', 'rejected')),
  privacy_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (privacy_qa_state IN ('pending', 'approved', 'rejected')),
  edit_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (edit_qa_state IN ('pending', 'approved', 'rejected')),
  caption_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (caption_qa_state IN ('pending', 'approved', 'rejected')),
  playback_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (playback_qa_state IN ('pending', 'approved', 'rejected')),
  action_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (action_qa_state IN ('pending', 'approved', 'rejected')),
  evidence_qa_state text NOT NULL DEFAULT 'pending'
    CHECK (evidence_qa_state IN ('pending', 'approved', 'rejected')),
  qa_receipt_sha256 text CHECK (qa_receipt_sha256 IS NULL OR qa_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  qa_approved_at timestamptz,
  qa_approved_by text,
  required_capability text NOT NULL DEFAULT 'mastermind.learning.assigned'
    CHECK (required_capability = 'mastermind.learning.assigned'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  UNIQUE(catalog_version_id, stable_item_key),
  UNIQUE(catalog_version_id, stage, milestone_key, item_role, item_order),
  UNIQUE(catalog_version_id, catalog_item_id)
);

CREATE TABLE IF NOT EXISTS public.curriculum_catalog_item_revocations (
  revocation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL UNIQUE
    REFERENCES public.curriculum_catalog_items(catalog_item_id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  revoked_by text NOT NULL CHECK (btrim(revoked_by) <> ''),
  revoked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.curriculum_catalog_version_revocations (
  revocation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_version_id uuid NOT NULL UNIQUE
    REFERENCES public.curriculum_catalog_versions(catalog_version_id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  revoked_by text NOT NULL CHECK (btrim(revoked_by) <> ''),
  revoked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX IF NOT EXISTS cycle_plan_requests_v2_assignment_receipt_identity_idx
  ON public.cycle_plan_reconciliation_requests_v2(user_id, cycle_id, planner_receipt_id, ledger_id);

CREATE TABLE IF NOT EXISTS public.curriculum_cycle_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  planner_request_ledger_id uuid NOT NULL,
  planner_receipt_id uuid NOT NULL,
  catalog_version_id uuid NOT NULL
    REFERENCES public.curriculum_catalog_versions(catalog_version_id) ON DELETE RESTRICT,
  catalog_content_sha256 text NOT NULL CHECK (catalog_content_sha256 ~ '^[0-9a-f]{64}$'),
  context_key text NOT NULL DEFAULT 'success_path' CHECK (btrim(context_key) <> ''),
  assignment_version bigint NOT NULL CHECK (assignment_version > 0),
  assignment_status text NOT NULL
    CHECK (assignment_status IN ('pending_confirmation', 'active', 'superseded', 'revoked')),
  supersedes_assignment_id uuid REFERENCES public.curriculum_cycle_assignments(assignment_id) ON DELETE RESTRICT,
  superseded_by_assignment_id uuid REFERENCES public.curriculum_cycle_assignments(assignment_id) ON DELETE RESTRICT,
  rebuild_diff jsonb,
  rebuild_diff_sha256 text CHECK (rebuild_diff_sha256 IS NULL OR rebuild_diff_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by text NOT NULL CHECK (btrim(created_by) <> ''),
  confirmed_at timestamptz,
  confirmed_by text,
  superseded_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  UNIQUE(user_id, cycle_id, context_key, assignment_version),
  UNIQUE(user_id, cycle_id, assignment_id),
  CONSTRAINT curriculum_assignments_owner_cycle_fkey
    FOREIGN KEY (user_id, cycle_id)
    REFERENCES public.cycles_90_day(user_id, cycle_id) ON DELETE RESTRICT,
  CONSTRAINT curriculum_assignments_exact_receipt_fkey
    FOREIGN KEY (user_id, cycle_id, planner_receipt_id, planner_request_ledger_id)
    REFERENCES public.cycle_plan_reconciliation_requests_v2(user_id, cycle_id, planner_receipt_id, ledger_id)
    ON DELETE RESTRICT,
  CHECK (supersedes_assignment_id IS NULL OR supersedes_assignment_id <> assignment_id),
  CHECK (superseded_by_assignment_id IS NULL OR superseded_by_assignment_id <> assignment_id),
  CHECK (
    assignment_status <> 'pending_confirmation'
    OR (
      supersedes_assignment_id IS NOT NULL
      AND rebuild_diff IS NOT NULL
      AND jsonb_typeof(rebuild_diff) = 'object'
      AND rebuild_diff <> '{}'::jsonb
      AND rebuild_diff_sha256 IS NOT NULL
      AND confirmed_at IS NULL
      AND confirmed_by IS NULL
    )
  ),
  CHECK (
    assignment_status <> 'active'
    OR (confirmed_at IS NOT NULL AND btrim(coalesce(confirmed_by, '')) <> '')
  ),
  CHECK (
    assignment_status <> 'superseded'
    OR (superseded_by_assignment_id IS NOT NULL AND superseded_at IS NOT NULL)
  ),
  CHECK (
    assignment_status <> 'revoked'
    OR (revoked_at IS NOT NULL AND btrim(coalesce(revocation_reason, '')) <> '')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_assignments_one_active_idx
  ON public.curriculum_cycle_assignments(user_id, cycle_id, context_key)
  WHERE assignment_status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_assignments_one_pending_idx
  ON public.curriculum_cycle_assignments(user_id, cycle_id, context_key)
  WHERE assignment_status = 'pending_confirmation';

CREATE TABLE IF NOT EXISTS public.curriculum_cycle_assignment_items (
  assignment_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  cycle_id uuid NOT NULL,
  catalog_version_id uuid NOT NULL,
  catalog_item_id uuid NOT NULL,
  assignment_role text NOT NULL CHECK (assignment_role IN ('primary', 'supporting', 'optional')),
  assignment_order integer NOT NULL CHECK (assignment_order > 0),
  canonical_resource_id uuid NOT NULL,
  transcript_version_id uuid NOT NULL,
  playback_attempt_id uuid NOT NULL,
  publication_sha256 text NOT NULL CHECK (publication_sha256 ~ '^[0-9a-f]{64}$'),
  required_capability text NOT NULL CHECK (required_capability = 'mastermind.learning.assigned'),
  authority_snapshot jsonb NOT NULL CHECK (jsonb_typeof(authority_snapshot) = 'object'),
  authority_sha256 text NOT NULL CHECK (authority_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(assignment_id, catalog_item_id),
  UNIQUE(assignment_id, assignment_order),
  CONSTRAINT curriculum_assignment_items_owner_assignment_fkey
    FOREIGN KEY (user_id, cycle_id, assignment_id)
    REFERENCES public.curriculum_cycle_assignments(user_id, cycle_id, assignment_id) ON DELETE RESTRICT,
  CONSTRAINT curriculum_assignment_items_catalog_item_fkey
    FOREIGN KEY (catalog_version_id, catalog_item_id)
    REFERENCES public.curriculum_catalog_items(catalog_version_id, catalog_item_id) ON DELETE RESTRICT
);

ALTER TABLE public.curriculum_media_assets_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_catalog_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_catalog_item_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_catalog_version_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_cycle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_cycle_assignment_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.curriculum_media_assets_private
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_versions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_items
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_item_revocations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_catalog_version_revocations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_cycle_assignments
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.curriculum_cycle_assignment_items
  FROM PUBLIC, anon, authenticated, service_role;

-- Editorial/service workers may append private inputs, but lifecycle changes and
-- assignment creation remain RPC-only transactions.
GRANT SELECT, INSERT ON TABLE public.curriculum_media_assets_private TO service_role;
GRANT SELECT, INSERT ON TABLE public.curriculum_catalog_versions TO service_role;
GRANT SELECT, INSERT ON TABLE public.curriculum_catalog_items TO service_role;
GRANT SELECT, INSERT ON TABLE public.curriculum_catalog_item_revocations TO service_role;
GRANT SELECT ON TABLE public.curriculum_catalog_version_revocations TO service_role;

CREATE OR REPLACE FUNCTION public.curriculum_catalog_item_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_version_state text;
  v_old_version_state text;
  v_asset public.curriculum_media_assets_private%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT lifecycle_state INTO v_version_state
      FROM public.curriculum_catalog_versions
     WHERE catalog_version_id = OLD.catalog_version_id;
    IF v_version_state <> 'draft' THEN
      RAISE EXCEPTION 'published curriculum catalog items are immutable';
    END IF;
    RETURN OLD;
  END IF;

  SELECT lifecycle_state INTO v_version_state
    FROM public.curriculum_catalog_versions
   WHERE catalog_version_id = NEW.catalog_version_id;
  IF v_version_state IS NULL THEN
    RAISE EXCEPTION 'curriculum catalog version not found';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    SELECT lifecycle_state INTO v_old_version_state
      FROM public.curriculum_catalog_versions
     WHERE catalog_version_id = OLD.catalog_version_id;
    IF v_old_version_state <> 'draft' OR v_version_state <> 'draft' THEN
      RAISE EXCEPTION 'published curriculum catalog items are immutable';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' AND v_version_state <> 'draft' THEN
    RAISE EXCEPTION 'cannot append to a published curriculum catalog';
  END IF;

  IF NEW.item_state = 'ready' THEN
    IF btrim(coalesce(NEW.action_prompt, '')) = ''
       OR btrim(coalesce(NEW.evidence_prompt, '')) = ''
       OR NEW.provenance_sha256 IS NULL
       OR NEW.media_asset_id IS NULL
       OR NEW.canonical_resource_id IS NULL
       OR NEW.transcript_version_id IS NULL
       OR NEW.playback_attempt_id IS NULL
       OR NEW.publication_sha256 IS NULL
       OR NEW.qa_receipt_sha256 IS NULL
       OR NEW.qa_approved_at IS NULL
       OR btrim(coalesce(NEW.qa_approved_by, '')) = ''
       OR NEW.transcript_qa_state <> 'approved'
       OR NEW.provenance_qa_state <> 'approved'
       OR NEW.rights_qa_state <> 'approved'
       OR NEW.privacy_qa_state <> 'approved'
       OR NEW.edit_qa_state <> 'approved'
       OR NEW.caption_qa_state <> 'approved'
       OR NEW.playback_qa_state <> 'approved'
       OR NEW.action_qa_state <> 'approved'
       OR NEW.evidence_qa_state <> 'approved' THEN
      RAISE EXCEPTION 'ready curriculum item requires approved transcript, provenance, rights, privacy, edit, caption, playback, action, and evidence QA';
    END IF;

    SELECT * INTO v_asset
      FROM public.curriculum_media_assets_private
     WHERE media_asset_id = NEW.media_asset_id;
    IF NOT FOUND
       OR v_asset.canonical_resource_id <> NEW.canonical_resource_id
       OR v_asset.transcript_version_id <> NEW.transcript_version_id
       OR v_asset.playback_attempt_id <> NEW.playback_attempt_id THEN
      RAISE EXCEPTION 'ready curriculum item media authority does not match the private asset receipt';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS curriculum_catalog_item_guard
  ON public.curriculum_catalog_items;
CREATE TRIGGER curriculum_catalog_item_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.curriculum_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.curriculum_catalog_item_guard();

DROP TRIGGER IF EXISTS curriculum_media_assets_immutable
  ON public.curriculum_media_assets_private;
CREATE TRIGGER curriculum_media_assets_immutable
  BEFORE UPDATE OR DELETE ON public.curriculum_media_assets_private
  FOR EACH ROW EXECUTE FUNCTION public.mastermind_wave2_forbid_mutation();

DROP TRIGGER IF EXISTS curriculum_catalog_revocations_append_only
  ON public.curriculum_catalog_item_revocations;
CREATE TRIGGER curriculum_catalog_revocations_append_only
  BEFORE UPDATE OR DELETE ON public.curriculum_catalog_item_revocations
  FOR EACH ROW EXECUTE FUNCTION public.mastermind_wave2_forbid_mutation();

DROP TRIGGER IF EXISTS curriculum_catalog_version_revocations_append_only
  ON public.curriculum_catalog_version_revocations;
CREATE TRIGGER curriculum_catalog_version_revocations_append_only
  BEFORE UPDATE OR DELETE ON public.curriculum_catalog_version_revocations
  FOR EACH ROW EXECUTE FUNCTION public.mastermind_wave2_forbid_mutation();

CREATE OR REPLACE FUNCTION public.curriculum_catalog_version_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_state <> 'draft'
       OR NEW.content_sha256 IS NOT NULL
       OR NEW.published_at IS NOT NULL
       OR NEW.superseded_at IS NOT NULL
       OR NEW.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'new curriculum catalog versions must begin as unpublished drafts';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'curriculum catalog versions are immutable';
  END IF;

  IF OLD.lifecycle_state = 'draft' AND NEW.lifecycle_state = 'active' THEN
    IF (to_jsonb(NEW) - ARRAY['lifecycle_state', 'content_sha256', 'published_at']::text[])
       <> (to_jsonb(OLD) - ARRAY['lifecycle_state', 'content_sha256', 'published_at']::text[]) THEN
      RAISE EXCEPTION 'catalog publication may only set lifecycle and publication receipt';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.lifecycle_state = 'active' AND NEW.lifecycle_state = 'superseded' THEN
    IF (to_jsonb(NEW) - ARRAY['lifecycle_state', 'superseded_by_version_id', 'superseded_at']::text[])
       <> (to_jsonb(OLD) - ARRAY['lifecycle_state', 'superseded_by_version_id', 'superseded_at']::text[]) THEN
      RAISE EXCEPTION 'catalog supersession may only append supersession authority';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.lifecycle_state IN ('active', 'superseded') AND NEW.lifecycle_state = 'revoked' THEN
    IF (to_jsonb(NEW) - ARRAY['lifecycle_state', 'revoked_at', 'revocation_reason']::text[])
       <> (to_jsonb(OLD) - ARRAY['lifecycle_state', 'revoked_at', 'revocation_reason']::text[]) THEN
      RAISE EXCEPTION 'catalog revocation may only append revocation authority';
    END IF;
    IF NOT EXISTS (
      SELECT 1
        FROM public.curriculum_catalog_version_revocations r
       WHERE r.catalog_version_id = OLD.catalog_version_id
         AND r.reason = NEW.revocation_reason
         AND r.revoked_at = NEW.revoked_at
    ) THEN
      RAISE EXCEPTION 'catalog revocation requires its exact append-only audit event';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'curriculum catalog versions are immutable outside explicit publication, supersession, or revocation';
END;
$$;

DROP TRIGGER IF EXISTS curriculum_catalog_version_guard
  ON public.curriculum_catalog_versions;
CREATE TRIGGER curriculum_catalog_version_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.curriculum_catalog_versions
  FOR EACH ROW EXECUTE FUNCTION public.curriculum_catalog_version_guard();

CREATE OR REPLACE FUNCTION public.mastermind_wave2_jsonb_sha256(p_value jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog, public
AS $$
  SELECT encode(digest(convert_to(p_value::text, 'UTF8'), 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.curriculum_catalog_item_publication_authority(
  p_catalog_item_id uuid,
  p_published_at_override timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'encoding_contract', 'planner-learning-authority-jsonb-v1',
    'catalog', jsonb_build_object(
      'catalog_version_id', v.catalog_version_id,
      'catalog_context', v.catalog_context,
      'version_key', v.version_key,
      'version_number', v.version_number,
      'lifecycle_state_at_publication', 'active',
      'supersedes_version_id', v.supersedes_version_id,
      'created_at', v.created_at,
      'created_by', v.created_by,
      'published_at', coalesce(p_published_at_override, v.published_at)
    ),
    'item', jsonb_build_object(
      'catalog_item_id', i.catalog_item_id,
      'catalog_version_id', i.catalog_version_id,
      'stable_item_key', i.stable_item_key,
      'item_state', i.item_state,
      'stage', i.stage,
      'milestone_key', i.milestone_key,
      'milestone_title', i.milestone_title,
      'item_role', i.item_role,
      'item_order', i.item_order,
      'title', i.title,
      'intended_output', i.intended_output,
      'action_prompt', i.action_prompt,
      'evidence_prompt', i.evidence_prompt,
      'teacher_display_name', i.teacher_display_name,
      'attribution_text', i.attribution_text,
      'source_system', i.source_system,
      'source_native_id', i.source_native_id,
      'source_provenance', i.source_provenance,
      'provenance_sha256', i.provenance_sha256,
      'media_asset_id', i.media_asset_id,
      'canonical_resource_id', i.canonical_resource_id,
      'transcript_version_id', i.transcript_version_id,
      'playback_attempt_id', i.playback_attempt_id,
      'publication_sha256', i.publication_sha256,
      'transcript_qa_state', i.transcript_qa_state,
      'provenance_qa_state', i.provenance_qa_state,
      'rights_qa_state', i.rights_qa_state,
      'privacy_qa_state', i.privacy_qa_state,
      'edit_qa_state', i.edit_qa_state,
      'caption_qa_state', i.caption_qa_state,
      'playback_qa_state', i.playback_qa_state,
      'action_qa_state', i.action_qa_state,
      'evidence_qa_state', i.evidence_qa_state,
      'qa_receipt_sha256', i.qa_receipt_sha256,
      'qa_approved_at', i.qa_approved_at,
      'qa_approved_by', i.qa_approved_by,
      'required_capability', i.required_capability,
      'created_at', i.created_at,
      'created_by', i.created_by
    ),
    'media', CASE WHEN m.media_asset_id IS NULL THEN NULL ELSE jsonb_build_object(
      'media_asset_id', m.media_asset_id,
      'asset_key', m.asset_key,
      'canonical_resource_id', m.canonical_resource_id,
      'provider', m.provider,
      'provider_asset_id', m.provider_asset_id,
      'private_locator', m.private_locator,
      'source_content_sha256', m.source_content_sha256,
      'transcript_version_id', m.transcript_version_id,
      'playback_attempt_id', m.playback_attempt_id,
      'created_at', m.created_at,
      'created_by', m.created_by
    ) END
  )
    FROM public.curriculum_catalog_items i
    JOIN public.curriculum_catalog_versions v
      ON v.catalog_version_id = i.catalog_version_id
    LEFT JOIN public.curriculum_media_assets_private m
      ON m.media_asset_id = i.media_asset_id
   WHERE i.catalog_item_id = p_catalog_item_id
$$;

CREATE OR REPLACE FUNCTION public.curriculum_catalog_content_sha256(
  p_catalog_version_id uuid,
  p_published_at_override timestamptz DEFAULT NULL
) RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.mastermind_wave2_jsonb_sha256(jsonb_build_object(
    'encoding_contract', 'planner-learning-catalog-jsonb-v1',
    'catalog_version_id', p_catalog_version_id,
    'items', coalesce(jsonb_agg(
      public.curriculum_catalog_item_publication_authority(
        i.catalog_item_id, p_published_at_override
      ) ORDER BY i.stable_item_key, i.catalog_item_id
    ), '[]'::jsonb)
  ))
    FROM public.curriculum_catalog_items i
   WHERE i.catalog_version_id = p_catalog_version_id
$$;

CREATE OR REPLACE FUNCTION public.publish_curriculum_catalog_version(
  p_catalog_version_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_version public.curriculum_catalog_versions%ROWTYPE;
  v_active public.curriculum_catalog_versions%ROWTYPE;
  v_content_sha256 text;
  v_published_at timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO v_version
    FROM public.curriculum_catalog_versions
   WHERE catalog_version_id = p_catalog_version_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'curriculum catalog version not found';
  END IF;
  IF v_version.lifecycle_state <> 'draft' THEN
    RAISE EXCEPTION 'only a draft curriculum catalog version can be published';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.curriculum_catalog_items
     WHERE catalog_version_id = p_catalog_version_id
  ) THEN
    RAISE EXCEPTION 'curriculum catalog version cannot publish without items';
  END IF;

  v_content_sha256 := public.curriculum_catalog_content_sha256(
    p_catalog_version_id, v_published_at
  );

  SELECT * INTO v_active
    FROM public.curriculum_catalog_versions
   WHERE catalog_context = v_version.catalog_context
     AND lifecycle_state = 'active'
   FOR UPDATE;

  IF FOUND THEN
    IF v_version.supersedes_version_id IS DISTINCT FROM v_active.catalog_version_id THEN
      RAISE EXCEPTION 'new catalog must explicitly supersede the current active version';
    END IF;
    UPDATE public.curriculum_catalog_versions
       SET lifecycle_state = 'superseded',
           superseded_by_version_id = v_version.catalog_version_id,
           superseded_at = v_published_at
     WHERE catalog_version_id = v_active.catalog_version_id;
  ELSIF v_version.supersedes_version_id IS NOT NULL THEN
    RAISE EXCEPTION 'catalog supersession target is not the current active version';
  END IF;

  UPDATE public.curriculum_catalog_versions
     SET lifecycle_state = 'active',
         content_sha256 = v_content_sha256,
         published_at = v_published_at
   WHERE catalog_version_id = p_catalog_version_id;

  IF public.curriculum_catalog_content_sha256(p_catalog_version_id)
     IS DISTINCT FROM v_content_sha256 THEN
    RAISE EXCEPTION 'published curriculum authority does not match its final stored receipt';
  END IF;

  RETURN jsonb_build_object(
    'catalog_version_id', p_catalog_version_id,
    'version_key', v_version.version_key,
    'content_sha256', v_content_sha256,
    'published_at', v_published_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_curriculum_catalog_version(
  p_catalog_version_id uuid,
  p_reason text,
  p_evidence_sha256 text,
  p_revoked_by text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_version public.curriculum_catalog_versions%ROWTYPE;
  v_revocation_id uuid := gen_random_uuid();
  v_revoked_at timestamptz := clock_timestamp();
BEGIN
  IF btrim(coalesce(p_reason, '')) = ''
     OR p_evidence_sha256 IS NULL
     OR p_evidence_sha256 !~ '^[0-9a-f]{64}$'
     OR btrim(coalesce(p_revoked_by, '')) = '' THEN
    RAISE EXCEPTION 'catalog revocation requires reason, evidence receipt, and actor';
  END IF;

  SELECT * INTO v_version
    FROM public.curriculum_catalog_versions
   WHERE catalog_version_id = p_catalog_version_id
   FOR UPDATE;
  IF NOT FOUND OR v_version.lifecycle_state NOT IN ('active', 'superseded') THEN
    RAISE EXCEPTION 'only a published non-revoked curriculum catalog can be revoked';
  END IF;
  INSERT INTO public.curriculum_catalog_version_revocations(
    revocation_id, catalog_version_id, reason, evidence_sha256, revoked_by, revoked_at
  ) VALUES (
    v_revocation_id, p_catalog_version_id, p_reason, p_evidence_sha256,
    p_revoked_by, v_revoked_at
  );

  UPDATE public.curriculum_catalog_versions
     SET lifecycle_state = 'revoked',
         revoked_at = v_revoked_at,
         revocation_reason = p_reason
   WHERE catalog_version_id = p_catalog_version_id;

  RETURN jsonb_build_object(
    'catalog_version_id', p_catalog_version_id,
    'lifecycle_state', 'revoked',
    'revocation_id', v_revocation_id,
    'evidence_sha256', p_evidence_sha256,
    'revoked_at', v_revoked_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.curriculum_assignment_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'curriculum assignments are immutable';
  END IF;

  IF OLD.assignment_status = 'pending_confirmation' AND NEW.assignment_status = 'active' THEN
    IF (to_jsonb(NEW) - ARRAY['assignment_status', 'confirmed_at', 'confirmed_by']::text[])
       <> (to_jsonb(OLD) - ARRAY['assignment_status', 'confirmed_at', 'confirmed_by']::text[]) THEN
      RAISE EXCEPTION 'assignment confirmation may only activate the frozen assignment';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.assignment_status = 'active' AND NEW.assignment_status = 'superseded' THEN
    IF (to_jsonb(NEW) - ARRAY['assignment_status', 'superseded_by_assignment_id', 'superseded_at']::text[])
       <> (to_jsonb(OLD) - ARRAY['assignment_status', 'superseded_by_assignment_id', 'superseded_at']::text[]) THEN
      RAISE EXCEPTION 'assignment supersession may only append supersession authority';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.assignment_status IN ('pending_confirmation', 'active') AND NEW.assignment_status = 'revoked' THEN
    IF (to_jsonb(NEW) - ARRAY['assignment_status', 'revoked_at', 'revocation_reason']::text[])
       <> (to_jsonb(OLD) - ARRAY['assignment_status', 'revoked_at', 'revocation_reason']::text[]) THEN
      RAISE EXCEPTION 'assignment revocation may only append revocation authority';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'curriculum assignments are immutable outside explicit confirmation, supersession, or revocation';
END;
$$;

DROP TRIGGER IF EXISTS curriculum_assignment_guard
  ON public.curriculum_cycle_assignments;
CREATE TRIGGER curriculum_assignment_guard
  BEFORE UPDATE OR DELETE ON public.curriculum_cycle_assignments
  FOR EACH ROW EXECUTE FUNCTION public.curriculum_assignment_guard();

DROP TRIGGER IF EXISTS curriculum_assignment_items_immutable
  ON public.curriculum_cycle_assignment_items;
CREATE TRIGGER curriculum_assignment_items_immutable
  BEFORE UPDATE OR DELETE ON public.curriculum_cycle_assignment_items
  FOR EACH ROW EXECUTE FUNCTION public.mastermind_wave2_forbid_mutation();

CREATE OR REPLACE FUNCTION public.curriculum_assignment_frozen_projection(
  p_assignment_id uuid
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'assignment_id', a.assignment_id,
    'user_id', a.user_id,
    'cycle_id', a.cycle_id,
    'planner_request_ledger_id', a.planner_request_ledger_id,
    'planner_receipt_id', a.planner_receipt_id,
    'catalog_version_id', a.catalog_version_id,
    'catalog_content_sha256', a.catalog_content_sha256,
    'context_key', a.context_key,
    'assignment_version', a.assignment_version,
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'catalog_item_id', ai.catalog_item_id,
        'assignment_role', ai.assignment_role,
        'assignment_order', ai.assignment_order,
        'authority_sha256', ai.authority_sha256,
        'authority_snapshot', ai.authority_snapshot
      ) ORDER BY ai.assignment_order, ai.catalog_item_id)
        FROM public.curriculum_cycle_assignment_items ai
       WHERE ai.assignment_id = a.assignment_id
    ), '[]'::jsonb)
  )
    FROM public.curriculum_cycle_assignments a
   WHERE a.assignment_id = p_assignment_id
$$;

CREATE OR REPLACE FUNCTION public.curriculum_rebuild_diff_for_proposal(
  p_active_assignment_id uuid,
  p_pending_assignment_id uuid,
  p_user_id uuid,
  p_cycle_id uuid,
  p_planner_request_ledger_id uuid,
  p_planner_receipt_id uuid,
  p_catalog_version_id uuid,
  p_catalog_content_sha256 text,
  p_context_key text,
  p_assignment_version bigint,
  p_item_ids uuid[]
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'encoding_contract', 'planner-learning-rebuild-diff-jsonb-v1',
    'current', public.curriculum_assignment_frozen_projection(p_active_assignment_id),
    'proposed', jsonb_build_object(
      'assignment_id', p_pending_assignment_id,
      'user_id', p_user_id,
      'cycle_id', p_cycle_id,
      'planner_request_ledger_id', p_planner_request_ledger_id,
      'planner_receipt_id', p_planner_receipt_id,
      'catalog_version_id', p_catalog_version_id,
      'catalog_content_sha256', p_catalog_content_sha256,
      'context_key', p_context_key,
      'assignment_version', p_assignment_version,
      'items', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'catalog_item_id', i.catalog_item_id,
          'assignment_role', i.item_role,
          'assignment_order', requested.ordinality::integer,
          'authority_sha256', public.mastermind_wave2_jsonb_sha256(
            public.curriculum_catalog_item_publication_authority(i.catalog_item_id)
          ),
          'authority_snapshot', public.curriculum_catalog_item_publication_authority(i.catalog_item_id)
        ) ORDER BY requested.ordinality)
          FROM unnest(p_item_ids) WITH ORDINALITY requested(item_id, ordinality)
          JOIN public.curriculum_catalog_items i
            ON i.catalog_item_id = requested.item_id
      ), '[]'::jsonb)
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.curriculum_assignment_rebuild_diff(
  p_pending_assignment_id uuid
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'encoding_contract', 'planner-learning-rebuild-diff-jsonb-v1',
    'current', public.curriculum_assignment_frozen_projection(a.supersedes_assignment_id),
    'proposed', public.curriculum_assignment_frozen_projection(a.assignment_id)
  )
    FROM public.curriculum_cycle_assignments a
   WHERE a.assignment_id = p_pending_assignment_id
     AND a.assignment_status = 'pending_confirmation'
$$;

CREATE OR REPLACE FUNCTION public.curriculum_assignment_authority_is_valid(
  p_assignment_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce((
    SELECT v.lifecycle_state IN ('active', 'superseded')
       AND NOT EXISTS (
         SELECT 1 FROM public.curriculum_catalog_version_revocations vr
          WHERE vr.catalog_version_id = v.catalog_version_id
       )
       AND a.catalog_content_sha256 = v.content_sha256
       AND v.content_sha256 = public.curriculum_catalog_content_sha256(v.catalog_version_id)
       AND EXISTS (
         SELECT 1 FROM public.curriculum_cycle_assignment_items ai
          WHERE ai.assignment_id = a.assignment_id
       )
       AND NOT EXISTS (
         SELECT 1
           FROM public.curriculum_cycle_assignment_items ai
           LEFT JOIN public.curriculum_catalog_items i
             ON i.catalog_version_id = ai.catalog_version_id
            AND i.catalog_item_id = ai.catalog_item_id
          WHERE ai.assignment_id = a.assignment_id
            AND (
              i.catalog_item_id IS NULL
              OR i.item_state <> 'ready'
              OR ai.catalog_version_id <> a.catalog_version_id
              OR ai.required_capability <> 'mastermind.learning.assigned'
              OR ai.canonical_resource_id IS DISTINCT FROM i.canonical_resource_id
              OR ai.transcript_version_id IS DISTINCT FROM i.transcript_version_id
              OR ai.playback_attempt_id IS DISTINCT FROM i.playback_attempt_id
              OR ai.publication_sha256 IS DISTINCT FROM i.publication_sha256
              OR ai.authority_snapshot IS DISTINCT FROM
                 public.curriculum_catalog_item_publication_authority(i.catalog_item_id)
              OR ai.authority_sha256 IS DISTINCT FROM
                 public.mastermind_wave2_jsonb_sha256(ai.authority_snapshot)
              OR EXISTS (
                SELECT 1 FROM public.curriculum_catalog_item_revocations ir
                 WHERE ir.catalog_item_id = ai.catalog_item_id
              )
            )
       )
      FROM public.curriculum_cycle_assignments a
      JOIN public.curriculum_catalog_versions v
        ON v.catalog_version_id = a.catalog_version_id
     WHERE a.assignment_id = p_assignment_id
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.create_curriculum_cycle_assignment(
  p_user_id uuid,
  p_cycle_id uuid,
  p_planner_request_ledger_id uuid,
  p_planner_receipt_id uuid,
  p_catalog_version_id uuid,
  p_context_key text,
  p_item_ids uuid[],
  p_supersedes_assignment_id uuid DEFAULT NULL,
  p_rebuild_diff jsonb DEFAULT NULL,
  p_created_by text DEFAULT 'service_role'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_active public.curriculum_cycle_assignments%ROWTYPE;
  v_catalog public.curriculum_catalog_versions%ROWTYPE;
  v_assignment_id uuid := gen_random_uuid();
  v_assignment_version bigint;
  v_status text;
  v_rebuild_diff jsonb;
  v_diff_sha256 text;
  v_capability_state text;
  v_capability_reason text;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_user_id IS NULL OR p_cycle_id IS NULL OR p_planner_request_ledger_id IS NULL
     OR p_planner_receipt_id IS NULL OR p_catalog_version_id IS NULL THEN
    RAISE EXCEPTION 'assignment authority identifiers are required';
  END IF;
  IF btrim(coalesce(p_context_key, '')) = '' OR btrim(coalesce(p_created_by, '')) = '' THEN
    RAISE EXCEPTION 'assignment context and creator are required';
  END IF;
  IF p_item_ids IS NULL OR cardinality(p_item_ids) = 0 THEN
    RAISE EXCEPTION 'assignment requires at least one catalog item';
  END IF;
  IF (SELECT count(DISTINCT item_id) FROM unnest(p_item_ids) AS item_id) <> cardinality(p_item_ids) THEN
    RAISE EXCEPTION 'assignment catalog item list contains duplicates';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_user_id::text || ':' || p_cycle_id::text || ':' || p_context_key, 0
  ));

  SELECT c.decision_state, c.safe_reason
    INTO v_capability_state, v_capability_reason
    FROM public.mastermind_capability_state(
      p_user_id, 'mastermind.learning.assigned', v_now
    ) c;
  IF v_capability_state <> 'granted' THEN
    RAISE EXCEPTION 'learning capability is not granted: %', v_capability_reason;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.cycle_plan_reconciliation_requests_v2 r
     WHERE r.ledger_id = p_planner_request_ledger_id
       AND r.user_id = p_user_id
       AND r.cycle_id = p_cycle_id
       AND r.planner_receipt_id = p_planner_receipt_id
       AND r.status = 'complete'
  ) THEN
    RAISE EXCEPTION 'assignment does not bind an exact completed Planner receipt';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM public.cycle_plan_intents_v2 i
     WHERE i.user_id = p_user_id
       AND i.cycle_id = p_cycle_id
       AND i.last_planner_receipt_id = p_planner_receipt_id
  ) THEN
    RAISE EXCEPTION 'assignment Planner receipt is not current for the owner cycle';
  END IF;
  SELECT * INTO v_catalog
    FROM public.curriculum_catalog_versions v
   WHERE v.catalog_version_id = p_catalog_version_id
     AND v.lifecycle_state = 'active'
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assignment requires an active curriculum catalog version';
  END IF;
  IF v_catalog.content_sha256 IS NULL
     OR v_catalog.content_sha256 IS DISTINCT FROM
        public.curriculum_catalog_content_sha256(p_catalog_version_id) THEN
    RAISE EXCEPTION 'assignment requires valid immutable catalog publication authority';
  END IF;
  IF (
    SELECT count(*)
      FROM public.curriculum_catalog_items i
     WHERE i.catalog_version_id = p_catalog_version_id
       AND i.catalog_item_id = ANY(p_item_ids)
       AND i.item_state = 'ready'
       AND i.required_capability = 'mastermind.learning.assigned'
       AND NOT EXISTS (
         SELECT 1 FROM public.curriculum_catalog_item_revocations r
          WHERE r.catalog_item_id = i.catalog_item_id
       )
  ) <> cardinality(p_item_ids) THEN
    RAISE EXCEPTION 'assignment items must be ready, unrevoked, and bound to the selected catalog version';
  END IF;

  SELECT * INTO v_active
    FROM public.curriculum_cycle_assignments a
   WHERE a.user_id = p_user_id
     AND a.cycle_id = p_cycle_id
     AND a.context_key = p_context_key
     AND a.assignment_status = 'active'
   FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.curriculum_cycle_assignments a
     WHERE a.user_id = p_user_id
       AND a.cycle_id = p_cycle_id
       AND a.context_key = p_context_key
       AND a.assignment_status = 'pending_confirmation'
  ) THEN
    RAISE EXCEPTION 'a rebuild already awaits explicit confirmation';
  END IF;

  SELECT coalesce(max(a.assignment_version), 0) + 1
    INTO v_assignment_version
    FROM public.curriculum_cycle_assignments a
   WHERE a.user_id = p_user_id
     AND a.cycle_id = p_cycle_id
     AND a.context_key = p_context_key;

  IF FOUND AND v_active.assignment_id IS NOT NULL THEN
    IF p_supersedes_assignment_id IS DISTINCT FROM v_active.assignment_id THEN
      RAISE EXCEPTION 'rebuild must name the exact active assignment it proposes to supersede';
    END IF;
    v_status := 'pending_confirmation';
    v_rebuild_diff := public.curriculum_rebuild_diff_for_proposal(
      v_active.assignment_id, v_assignment_id, p_user_id, p_cycle_id,
      p_planner_request_ledger_id, p_planner_receipt_id, p_catalog_version_id,
      v_catalog.content_sha256, p_context_key, v_assignment_version, p_item_ids
    );
    v_diff_sha256 := public.mastermind_wave2_jsonb_sha256(v_rebuild_diff);
    IF p_rebuild_diff IS NOT NULL AND p_rebuild_diff IS DISTINCT FROM v_rebuild_diff THEN
      RAISE EXCEPTION 'caller expected rebuild diff does not match server-derived authority diff';
    END IF;
  ELSE
    IF p_supersedes_assignment_id IS NOT NULL OR p_rebuild_diff IS NOT NULL THEN
      RAISE EXCEPTION 'initial assignment cannot claim a supersession boundary';
    END IF;
    v_status := 'active';
  END IF;

  INSERT INTO public.curriculum_cycle_assignments(
    assignment_id, user_id, cycle_id, planner_request_ledger_id, planner_receipt_id,
    catalog_version_id, catalog_content_sha256, context_key, assignment_version, assignment_status,
    supersedes_assignment_id, rebuild_diff, rebuild_diff_sha256,
    created_by, confirmed_at, confirmed_by
  ) VALUES (
    v_assignment_id, p_user_id, p_cycle_id, p_planner_request_ledger_id,
    p_planner_receipt_id, p_catalog_version_id, v_catalog.content_sha256, p_context_key,
    v_assignment_version, v_status, p_supersedes_assignment_id,
    v_rebuild_diff, v_diff_sha256, p_created_by,
    CASE WHEN v_status = 'active' THEN v_now ELSE NULL END,
    CASE WHEN v_status = 'active' THEN p_created_by ELSE NULL END
  );

  INSERT INTO public.curriculum_cycle_assignment_items(
    assignment_id, user_id, cycle_id, catalog_version_id, catalog_item_id,
    assignment_role, assignment_order, canonical_resource_id,
    transcript_version_id, playback_attempt_id, publication_sha256,
    required_capability, authority_snapshot, authority_sha256
  )
  SELECT v_assignment_id, p_user_id, p_cycle_id, i.catalog_version_id,
         i.catalog_item_id, i.item_role, requested.ordinality::integer,
         i.canonical_resource_id, i.transcript_version_id,
         i.playback_attempt_id, i.publication_sha256, i.required_capability,
         public.curriculum_catalog_item_publication_authority(i.catalog_item_id),
         public.mastermind_wave2_jsonb_sha256(
           public.curriculum_catalog_item_publication_authority(i.catalog_item_id)
         )
    FROM unnest(p_item_ids) WITH ORDINALITY requested(item_id, ordinality)
    JOIN public.curriculum_catalog_items i
      ON i.catalog_item_id = requested.item_id
   ORDER BY requested.ordinality;

  IF NOT public.curriculum_assignment_authority_is_valid(v_assignment_id) THEN
    RAISE EXCEPTION 'frozen assignment authority does not match the publication receipt';
  END IF;
  IF v_status = 'pending_confirmation'
     AND public.curriculum_assignment_rebuild_diff(v_assignment_id)
         IS DISTINCT FROM v_rebuild_diff THEN
    RAISE EXCEPTION 'pending assignment does not match its server-derived rebuild diff';
  END IF;

  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'assignment_version', v_assignment_version,
    'assignment_status', v_status,
    'planner_receipt_id', p_planner_receipt_id,
    'confirmation_required', v_status = 'pending_confirmation',
    'rebuild_diff', v_rebuild_diff,
    'rebuild_diff_sha256', v_diff_sha256
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_curriculum_assignment_rebuild(
  p_assignment_id uuid,
  p_expected_rebuild_diff jsonb,
  p_expected_rebuild_diff_sha256 text,
  p_confirmed_by text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_pending public.curriculum_cycle_assignments%ROWTYPE;
  v_active public.curriculum_cycle_assignments%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_capability_state text;
  v_capability_reason text;
  v_server_diff jsonb;
  v_server_diff_sha256 text;
BEGIN
  IF p_expected_rebuild_diff IS NULL
     OR jsonb_typeof(p_expected_rebuild_diff) <> 'object'
     OR p_expected_rebuild_diff = '{}'::jsonb
     OR p_expected_rebuild_diff_sha256 IS NULL
     OR p_expected_rebuild_diff_sha256 !~ '^[0-9a-f]{64}$'
     OR btrim(coalesce(p_confirmed_by, '')) = '' THEN
    RAISE EXCEPTION 'exact server-derived rebuild diff, hash, and confirmer are required';
  END IF;

  SELECT * INTO v_pending
    FROM public.curriculum_cycle_assignments
   WHERE assignment_id = p_assignment_id
     AND assignment_status = 'pending_confirmation'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending curriculum assignment rebuild not found';
  END IF;
  v_server_diff := public.curriculum_assignment_rebuild_diff(v_pending.assignment_id);
  v_server_diff_sha256 := public.mastermind_wave2_jsonb_sha256(v_server_diff);
  IF v_pending.rebuild_diff IS DISTINCT FROM v_server_diff
     OR v_pending.rebuild_diff_sha256 IS DISTINCT FROM v_server_diff_sha256 THEN
    RAISE EXCEPTION 'pending assignment rebuild authority no longer matches its server-derived diff';
  END IF;
  IF p_expected_rebuild_diff IS DISTINCT FROM v_server_diff
     OR p_expected_rebuild_diff_sha256 IS DISTINCT FROM v_server_diff_sha256 THEN
    RAISE EXCEPTION 'rebuild diff confirmation does not match';
  END IF;

  SELECT * INTO v_active
    FROM public.curriculum_cycle_assignments
   WHERE assignment_id = v_pending.supersedes_assignment_id
     AND user_id = v_pending.user_id
     AND cycle_id = v_pending.cycle_id
     AND context_key = v_pending.context_key
     AND assignment_status = 'active'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'the assignment selected for supersession is no longer active';
  END IF;
  IF NOT public.curriculum_assignment_authority_is_valid(v_active.assignment_id)
     OR NOT public.curriculum_assignment_authority_is_valid(v_pending.assignment_id) THEN
    RAISE EXCEPTION 'current or proposed assignment authority is invalid or revoked';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cycle_plan_intents_v2 i
     WHERE i.user_id = v_pending.user_id
       AND i.cycle_id = v_pending.cycle_id
       AND i.last_planner_receipt_id = v_pending.planner_receipt_id
  ) THEN
    RAISE EXCEPTION 'pending assignment Planner receipt is no longer current';
  END IF;

  SELECT c.decision_state, c.safe_reason
    INTO v_capability_state, v_capability_reason
    FROM public.mastermind_capability_state(
      v_pending.user_id, 'mastermind.learning.assigned', v_now
    ) c;
  IF v_capability_state <> 'granted' THEN
    RAISE EXCEPTION 'learning capability is not granted: %', v_capability_reason;
  END IF;

  UPDATE public.curriculum_cycle_assignments
     SET assignment_status = 'superseded',
         superseded_by_assignment_id = v_pending.assignment_id,
         superseded_at = v_now
   WHERE assignment_id = v_active.assignment_id;

  UPDATE public.curriculum_cycle_assignments
     SET assignment_status = 'active', confirmed_at = v_now, confirmed_by = p_confirmed_by
   WHERE assignment_id = v_pending.assignment_id;

  RETURN jsonb_build_object(
    'assignment_id', v_pending.assignment_id,
    'assignment_status', 'active',
    'superseded_assignment_id', v_active.assignment_id,
    'rebuild_diff_sha256', v_server_diff_sha256,
    'confirmed_at', v_now,
    'confirmed_by', p_confirmed_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_assigned_learning(
  p_cycle_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_as_of timestamptz := clock_timestamp();
  v_capability_state text;
  v_capability_reason text;
  v_assignment public.curriculum_cycle_assignments%ROWTYPE;
  v_catalog_version_key text;
  v_items jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT c.decision_state, c.safe_reason
    INTO v_capability_state, v_capability_reason
    FROM public.mastermind_capability_state(
      v_user_id, 'mastermind.learning.assigned', v_as_of
    ) c;

  IF v_capability_state <> 'granted' THEN
    RETURN jsonb_build_object(
      'capability_state', v_capability_state,
      'reason', v_capability_reason,
      'assignment_state', NULL,
      'assignment', NULL,
      'items', '[]'::jsonb
    );
  END IF;

  IF p_cycle_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.cycles_90_day c
     WHERE c.cycle_id = p_cycle_id AND c.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'capability_state', 'denied',
      'reason', 'inaccessible',
      'assignment_state', NULL,
      'assignment', NULL,
      'items', '[]'::jsonb
    );
  END IF;

  SELECT * INTO v_assignment
    FROM public.curriculum_cycle_assignments a
   WHERE a.user_id = v_user_id
     AND a.cycle_id = p_cycle_id
     AND a.context_key = 'success_path'
     AND a.assignment_status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'capability_state', 'granted',
      'reason', 'no_active_assignment',
      'assignment_state', NULL,
      'assignment', NULL,
      'items', '[]'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cycle_plan_intents_v2 i
     WHERE i.user_id = v_user_id
       AND i.cycle_id = p_cycle_id
       AND i.last_planner_receipt_id = v_assignment.planner_receipt_id
  ) THEN
    RETURN jsonb_build_object(
      'capability_state', 'granted',
      'reason', 'planner_receipt_changed',
      'assignment_state', 'review_required',
      'assignment', NULL,
      'items', '[]'::jsonb
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.curriculum_catalog_versions v
     WHERE v.catalog_version_id = v_assignment.catalog_version_id
       AND (
         v.lifecycle_state = 'revoked'
         OR EXISTS (
           SELECT 1 FROM public.curriculum_catalog_version_revocations vr
            WHERE vr.catalog_version_id = v.catalog_version_id
         )
       )
  ) THEN
    RETURN jsonb_build_object(
      'capability_state', 'granted',
      'reason', 'assigned_catalog_revoked',
      'assignment_state', 'review_required',
      'assignment', NULL,
      'items', '[]'::jsonb
    );
  END IF;

  IF NOT public.curriculum_assignment_authority_is_valid(v_assignment.assignment_id) THEN
    RETURN jsonb_build_object(
      'capability_state', 'granted',
      'reason', 'assigned_learning_review_required',
      'assignment_state', 'review_required',
      'assignment', NULL,
      'items', '[]'::jsonb
    );
  END IF;

  SELECT v.version_key INTO v_catalog_version_key
    FROM public.curriculum_catalog_versions v
   WHERE v.catalog_version_id = v_assignment.catalog_version_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'assignment_item_id', ai.assignment_item_id,
      'item_key', ci.stable_item_key,
      'title', ci.title,
      'stage', ci.stage,
      'milestone_key', ci.milestone_key,
      'milestone_title', ci.milestone_title,
      'item_role', ai.assignment_role,
      'item_order', ai.assignment_order,
      'intended_output', ci.intended_output,
      'action_prompt', ci.action_prompt,
      'evidence_prompt', ci.evidence_prompt,
      'teacher', ci.teacher_display_name,
      'attribution', ci.attribution_text,
      'required_capability', ai.required_capability
    ) ORDER BY ai.assignment_order), '[]'::jsonb)
    INTO v_items
    FROM public.curriculum_cycle_assignment_items ai
    JOIN public.curriculum_catalog_items ci
      ON ci.catalog_version_id = ai.catalog_version_id
     AND ci.catalog_item_id = ai.catalog_item_id
   WHERE ai.assignment_id = v_assignment.assignment_id
     AND ai.user_id = v_user_id
     AND ai.cycle_id = p_cycle_id;

  RETURN jsonb_build_object(
    'capability_state', 'granted',
    'reason', 'assigned_learning_available',
    'assignment_state', 'active',
    'assignment', jsonb_build_object(
      'assignment_id', v_assignment.assignment_id,
      'assignment_version', v_assignment.assignment_version,
      'cycle_id', v_assignment.cycle_id,
      'planner_receipt_id', v_assignment.planner_receipt_id,
      'catalog_version_key', v_catalog_version_key,
      'context_key', v_assignment.context_key
    ),
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.curriculum_catalog_item_guard()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_catalog_version_guard()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_assignment_guard()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mastermind_wave2_jsonb_sha256(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_catalog_item_publication_authority(uuid,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_catalog_content_sha256(uuid,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_assignment_frozen_projection(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_rebuild_diff_for_proposal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint,uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_assignment_rebuild_diff(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curriculum_assignment_authority_is_valid(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_curriculum_catalog_version(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_curriculum_catalog_version(uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.revoke_curriculum_catalog_version(uuid,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_curriculum_catalog_version(uuid,text,text,text)
  TO service_role;
REVOKE ALL ON FUNCTION public.create_curriculum_cycle_assignment(uuid,uuid,uuid,uuid,uuid,text,uuid[],uuid,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_curriculum_cycle_assignment(uuid,uuid,uuid,uuid,uuid,text,uuid[],uuid,jsonb,text)
  TO service_role;
REVOKE ALL ON FUNCTION public.confirm_curriculum_assignment_rebuild(uuid,jsonb,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_curriculum_assignment_rebuild(uuid,jsonb,text,text)
  TO service_role;
REVOKE ALL ON FUNCTION public.resolve_my_assigned_learning(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_my_assigned_learning(uuid)
  TO authenticated;

COMMENT ON TABLE public.curriculum_media_assets_private IS
  'Private Planner Learning media authority. Provider locators are never member-readable.';
COMMENT ON TABLE public.curriculum_catalog_versions IS
  'Versioned Planner Learning catalog authority; publication, supersession, and audited terminal revocation are explicit transitions.';
COMMENT ON TABLE public.curriculum_catalog_version_revocations IS
  'Append-only evidence receipts for terminal server-authorized catalog revocation transitions.';
COMMENT ON TABLE public.curriculum_catalog_items IS
  'Normalized Planner Learning items. Ready requires all editorial, privacy, rights, media, action, and evidence QA.';
COMMENT ON TABLE public.curriculum_cycle_assignments IS
  'Frozen owner/cycle/Planner-receipt assignments. Rebuilds persist a server-derived exact authority diff and require separate exact confirmation.';
COMMENT ON FUNCTION public.resolve_my_assigned_learning(uuid) IS
  'Caller-only assigned Learning projection; denial and review states return no protected curriculum metadata.';
