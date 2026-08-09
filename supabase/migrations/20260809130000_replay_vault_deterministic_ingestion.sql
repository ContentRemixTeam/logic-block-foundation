-- Replay Vault deterministic ingestion and private editorial foundation.
-- Additive only. No source import, publication, or member-facing grant is performed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.replay_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_kind TEXT NOT NULL,
  source_system TEXT NOT NULL,
  collector_version_sha256 TEXT NOT NULL CHECK (collector_version_sha256 ~ '^[0-9a-f]{64}$'),
  source_snapshot_sha256 TEXT NOT NULL CHECK (source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  record_manifest_sha256 TEXT NOT NULL CHECK (record_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  record_count BIGINT NOT NULL CHECK (record_count >= 0),
  status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting','validated','accepted','failed','superseded')),
  parent_run_id UUID REFERENCES public.replay_ingestion_runs(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_class TEXT,
  report_path_private TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_snapshot_sha256),
  CHECK ((status IN ('validated','accepted','failed','superseded')) = (completed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.replay_source_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  source_native_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  asset_role TEXT NOT NULL CHECK (asset_role IN ('media_inventory','media_file','canonical_transcript','caption_evidence','metadata')),
  source_locator_private TEXT,
  byte_sha256 TEXT CHECK (byte_sha256 IS NULL OR byte_sha256 ~ '^[0-9a-f]{64}$'),
  dropbox_content_hash TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  duration_ms BIGINT CHECK (duration_ms IS NULL OR duration_ms >= 0),
  mime_type TEXT,
  title_raw TEXT,
  title_normalized TEXT,
  event_date DATE,
  created_at_source TIMESTAMPTZ,
  speaker_hints_private JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_privacy_flag TEXT NOT NULL DEFAULT 'clear' CHECK (source_privacy_flag IN ('clear','review_required','do_not_use','removed')),
  removed_at_source TIMESTAMPTZ,
  first_seen_run_id UUID NOT NULL REFERENCES public.replay_ingestion_runs(id),
  last_seen_run_id UUID NOT NULL REFERENCES public.replay_ingestion_runs(id),
  metadata_sha256 TEXT NOT NULL CHECK (metadata_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_native_id, source_version),
  CHECK ((source_privacy_flag = 'removed') = (removed_at_source IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS replay_source_assets_content_identity_idx
  ON public.replay_source_assets(source_system, byte_sha256)
  WHERE byte_sha256 IS NOT NULL AND asset_role IN ('media_file','canonical_transcript','caption_evidence');

ALTER TABLE public.mastermind_portal_resources
  ADD COLUMN IF NOT EXISTS canonical_resource_key UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS publication_state TEXT NOT NULL DEFAULT 'inventoried',
  ADD COLUMN IF NOT EXISTS privacy_state TEXT NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS pairing_state TEXT NOT NULL DEFAULT 'discovered',
  ADD COLUMN IF NOT EXISTS transcript_state TEXT NOT NULL DEFAULT 'evidence_only',
  ADD COLUMN IF NOT EXISTS media_state TEXT NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS approved_access_scope TEXT,
  ADD COLUMN IF NOT EXISTS editorial_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS editorial_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.mastermind_portal_resources(id);
CREATE UNIQUE INDEX IF NOT EXISTS mastermind_portal_resources_canonical_key_idx
  ON public.mastermind_portal_resources(canonical_resource_key);

DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_publication_state_chk
    CHECK (publication_state IN ('inventoried','quarantined','building','validated','editorial_ready','publishable','published','revoked','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_privacy_state_chk
    CHECK (privacy_state IN ('unreviewed','review_required','approved','blocked','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_pairing_state_chk
    CHECK (pairing_state IN ('discovered','fingerprinted','candidates_built','paired','quarantined','unmatched','source_revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_transcript_state_chk
    CHECK (transcript_state IN ('evidence_only','canonical_linked','parsed_staging','quality_validated','privacy_validated','active','quality_blocked','privacy_blocked','superseded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_media_state_chk
    CHECK (media_state IN ('planned','downloading','download_validated','uploading','remote_verified','playback_tested','approved','failed_retryable','dead_letter','remote_drift','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_published_binding_chk
    CHECK (
      (publication_state <> 'published' AND published_at IS NULL)
      OR (publication_state = 'published' AND published_at IS NOT NULL AND revoked_at IS NULL
          AND privacy_state = 'approved' AND pairing_state = 'paired'
          AND transcript_state = 'active' AND media_state = 'approved'
          AND approved_access_scope IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.replay_transcript_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.mastermind_portal_resources(id),
  source_asset_id UUID NOT NULL REFERENCES public.replay_source_assets(id),
  authority TEXT NOT NULL CHECK (authority IN ('crdb_master','reviewed_gap_fill','migration_caption_evidence')),
  source_record_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  raw_sha256 TEXT NOT NULL CHECK (raw_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_sha256 TEXT NOT NULL CHECK (normalized_sha256 ~ '^[0-9a-f]{64}$'),
  normalizer_version TEXT NOT NULL,
  cue_count INTEGER NOT NULL CHECK (cue_count >= 0),
  text_chars BIGINT NOT NULL CHECK (text_chars >= 0),
  first_ms BIGINT CHECK (first_ms IS NULL OR first_ms >= 0),
  last_ms BIGINT CHECK (last_ms IS NULL OR last_ms >= 0),
  coverage_ratio NUMERIC(10,6),
  quality_status TEXT NOT NULL DEFAULT 'pending' CHECK (quality_status IN ('pending','pass','blocked')),
  privacy_status TEXT NOT NULL DEFAULT 'pending' CHECK (privacy_status IN ('pending','pass','blocked')),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected','superseded')),
  quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_asset_id, normalized_sha256),
  CHECK (authority <> 'migration_caption_evidence' OR (is_active = false AND review_status <> 'approved')),
  CHECK (NOT is_active OR (authority IN ('crdb_master','reviewed_gap_fill') AND quality_status='pass' AND privacy_status='pass' AND review_status='approved'))
);
CREATE UNIQUE INDEX IF NOT EXISTS replay_transcript_versions_one_active_idx
  ON public.replay_transcript_versions(resource_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.replay_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_version_id UUID NOT NULL REFERENCES public.replay_transcript_versions(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
  starts_at_ms BIGINT NOT NULL CHECK (starts_at_ms >= 0),
  ends_at_ms BIGINT NOT NULL CHECK (ends_at_ms >= starts_at_ms),
  speaker_private TEXT,
  transcript_text_private TEXT NOT NULL CHECK (length(btrim(transcript_text_private)) > 0),
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(transcript_text_private,''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transcript_version_id, segment_index)
);
CREATE INDEX IF NOT EXISTS replay_transcript_segments_version_time_idx
  ON public.replay_transcript_segments(transcript_version_id, starts_at_ms);
CREATE INDEX IF NOT EXISTS replay_transcript_segments_search_idx
  ON public.replay_transcript_segments USING gin(search_vector);

ALTER TABLE public.mastermind_portal_resources
  ADD COLUMN IF NOT EXISTS active_transcript_version_id UUID REFERENCES public.replay_transcript_versions(id);

CREATE TABLE IF NOT EXISTS public.replay_pairing_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.mastermind_portal_resources(id),
  media_asset_id UUID NOT NULL REFERENCES public.replay_source_assets(id),
  transcript_asset_id UUID NOT NULL REFERENCES public.replay_source_assets(id),
  transcript_version_id UUID NOT NULL REFERENCES public.replay_transcript_versions(id),
  run_id UUID NOT NULL REFERENCES public.replay_ingestion_runs(id),
  stable_bridge_id TEXT,
  stable_bridge_exact BOOLEAN NOT NULL DEFAULT false,
  event_date_exact BOOLEAN,
  title_token_digest TEXT CHECK (title_token_digest IS NULL OR title_token_digest ~ '^[0-9a-f]{64}$'),
  media_duration_ms BIGINT CHECK (media_duration_ms IS NULL OR media_duration_ms > 0),
  duration_delta_ms BIGINT,
  duration_delta_percent NUMERIC(10,6),
  transcript_coverage_ratio NUMERIC(10,6),
  source_placement_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_version TEXT NOT NULL,
  candidate_rank INTEGER NOT NULL CHECK (candidate_rank > 0),
  candidate_count_at_key INTEGER NOT NULL CHECK (candidate_count_at_key > 0),
  decision TEXT NOT NULL DEFAULT 'candidate' CHECK (decision IN ('candidate','auto_approved','editor_approved','rejected','quarantined')),
  decision_reason TEXT NOT NULL,
  reviewer TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, media_asset_id, transcript_asset_id, rule_version),
  CHECK (decision <> 'auto_approved' OR (
    stable_bridge_exact AND candidate_count_at_key = 1
    AND media_duration_ms IS NOT NULL AND duration_delta_ms IS NOT NULL
    AND duration_delta_ms <= GREATEST(10000, round(media_duration_ms * 0.01))
    AND transcript_coverage_ratio BETWEEN 0.90 AND 1.05
  )),
  CHECK (decision NOT IN ('editor_approved','rejected') OR (reviewer IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.replay_media_migration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.replay_ingestion_runs(id),
  source_asset_id UUID NOT NULL REFERENCES public.replay_source_assets(id),
  manifest_sha256 TEXT NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  run_sha256 TEXT NOT NULL CHECK (run_sha256 ~ '^[0-9a-f]{64}$'),
  worker_sha256 TEXT NOT NULL CHECK (worker_sha256 ~ '^[0-9a-f]{64}$'),
  source_native_id TEXT NOT NULL,
  source_metadata_sha256 TEXT NOT NULL CHECK (source_metadata_sha256 ~ '^[0-9a-f]{64}$'),
  source_url_fingerprint TEXT NOT NULL CHECK (source_url_fingerprint ~ '^[0-9a-f]{64}$'),
  destination_policy_version TEXT NOT NULL,
  stable_destination_key TEXT NOT NULL,
  dropbox_file_id TEXT,
  dropbox_path_private TEXT,
  dropbox_content_hash TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  duration_ms BIGINT CHECK (duration_ms IS NULL OR duration_ms >= 0),
  container TEXT,
  codecs JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_stream_ok BOOLEAN,
  video_stream_ok BOOLEAN,
  full_decode_ok BOOLEAN,
  range_request_ok BOOLEAN,
  sample_seek_ok BOOLEAN,
  status TEXT NOT NULL CHECK (status IN ('planned','downloading','download_validated','uploading','uploaded_unverified','verified','failed_retryable','dead_letter','superseded','remote_drift')),
  error_class TEXT,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  next_retry_at TIMESTAMPTZ,
  prior_attempt_id UUID REFERENCES public.replay_media_migration_attempts(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  receipt_sha256 TEXT NOT NULL CHECK (receipt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_asset_id, attempt_number, manifest_sha256, worker_sha256),
  CHECK (status <> 'verified' OR (
    completed_at IS NOT NULL AND dropbox_file_id IS NOT NULL AND dropbox_content_hash IS NOT NULL
    AND size_bytes IS NOT NULL AND duration_ms IS NOT NULL AND full_decode_ok AND range_request_ok AND sample_seek_ok
  ))
);
ALTER TABLE public.mastermind_portal_resources
  ADD COLUMN IF NOT EXISTS active_playback_attempt_id UUID REFERENCES public.replay_media_migration_attempts(id);

CREATE TABLE IF NOT EXISTS public.replay_question_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_question_member_safe TEXT NOT NULL,
  stages TEXT[] NOT NULL DEFAULT '{}',
  milestones TEXT[] NOT NULL DEFAULT '{}',
  topics TEXT[] NOT NULL DEFAULT '{}',
  common_question_evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (common_question_evidence_count >= 0),
  canonical_answer_id UUID,
  editorial_status TEXT NOT NULL DEFAULT 'private_draft' CHECK (editorial_status IN ('private_draft','review','approved','archived')),
  freshness_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.replay_question_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.mastermind_portal_resources(id),
  transcript_version_id UUID NOT NULL REFERENCES public.replay_transcript_versions(id),
  question_segment_index INTEGER NOT NULL,
  question_start_ms BIGINT NOT NULL CHECK (question_start_ms >= 0),
  answer_start_ms BIGINT NOT NULL CHECK (answer_start_ms >= question_start_ms),
  answer_end_ms BIGINT NOT NULL CHECK (answer_end_ms >= answer_start_ms),
  raw_excerpt_private TEXT,
  raw_excerpt_sha256 TEXT NOT NULL CHECK (raw_excerpt_sha256 ~ '^[0-9a-f]{64}$'),
  extractor_version TEXT NOT NULL,
  evidence_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposed_question_private TEXT NOT NULL,
  proposed_summary_private TEXT,
  proposed_tags_private TEXT[] NOT NULL DEFAULT '{}',
  proposed_action_private TEXT,
  answerer_hint_private TEXT,
  sensitivity_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_privacy_flag TEXT NOT NULL DEFAULT 'clear',
  duplicate_cluster_candidate_id UUID REFERENCES public.replay_question_clusters(id),
  state TEXT NOT NULL DEFAULT 'extracted_private' CHECK (state IN ('extracted_private','dedupe_pending','privacy_review','privacy_blocked','editorial_review','seek_verification','approved','rejected','archived','reverify_required')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transcript_version_id, question_segment_index, extractor_version)
);

CREATE TABLE IF NOT EXISTS public.replay_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_cluster_id UUID NOT NULL REFERENCES public.replay_question_clusters(id),
  question_candidate_id UUID NOT NULL UNIQUE REFERENCES public.replay_question_candidates(id),
  resource_id UUID NOT NULL REFERENCES public.mastermind_portal_resources(id),
  transcript_version_id UUID NOT NULL REFERENCES public.replay_transcript_versions(id),
  playback_attempt_id UUID NOT NULL REFERENCES public.replay_media_migration_attempts(id),
  question_start_ms BIGINT NOT NULL,
  answer_start_ms BIGINT NOT NULL,
  answer_end_ms BIGINT NOT NULL,
  member_question TEXT NOT NULL,
  safe_answer_summary TEXT NOT NULL,
  safe_excerpt TEXT,
  answerer_attribution TEXT NOT NULL,
  situation_context_safe TEXT,
  quality_score NUMERIC(5,2),
  usefulness_score NUMERIC(5,2),
  specificity_score NUMERIC(5,2),
  current_alignment_score NUMERIC(5,2),
  av_quality_score NUMERIC(5,2),
  privacy_score NUMERIC(5,2),
  is_best_answer BOOLEAN NOT NULL DEFAULT false,
  related_answer_rank INTEGER,
  visibility_scope TEXT NOT NULL,
  privacy_approval TEXT NOT NULL DEFAULT 'pending' CHECK (privacy_approval IN ('pending','approved','blocked')),
  editorial_approval TEXT NOT NULL DEFAULT 'pending' CHECK (editorial_approval IN ('pending','approved','rejected')),
  seek_approval TEXT NOT NULL DEFAULT 'pending' CHECK (seek_approval IN ('pending','approved','failed')),
  privacy_reviewer TEXT,
  editorial_reviewer TEXT,
  seek_reviewer TEXT,
  privacy_reviewed_at TIMESTAMPTZ,
  editorial_reviewed_at TIMESTAMPTZ,
  seek_reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  supersedes_answer_id UUID REFERENCES public.replay_answers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (question_start_ms <= answer_start_ms AND answer_start_ms <= answer_end_ms),
  CHECK (published_at IS NULL OR (
    privacy_approval='approved' AND editorial_approval='approved' AND seek_approval='approved'
    AND privacy_reviewer IS NOT NULL AND editorial_reviewer IS NOT NULL AND seek_reviewer IS NOT NULL
    AND revoked_at IS NULL
  ))
);
DO $$ BEGIN
  ALTER TABLE public.replay_question_clusters
    ADD CONSTRAINT replay_question_clusters_canonical_answer_fk
    FOREIGN KEY (canonical_answer_id) REFERENCES public.replay_answers(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.replay_editorial_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('question_candidate','question_cluster','answer','transcript','resource')),
  subject_id UUID NOT NULL,
  before_sha256 TEXT NOT NULL CHECK (before_sha256 ~ '^[0-9a-f]{64}$'),
  after_sha256 TEXT NOT NULL CHECK (after_sha256 ~ '^[0-9a-f]{64}$'),
  actor TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  review_checklist_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.activate_replay_transcript_version(p_version_id UUID, p_actor TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v public.replay_transcript_versions%ROWTYPE;
  before_hash TEXT;
BEGIN
  IF p_actor IS NULL OR btrim(p_actor) = '' THEN RAISE EXCEPTION 'activation actor required'; END IF;
  SELECT * INTO v FROM public.replay_transcript_versions WHERE id=p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transcript version not found'; END IF;
  IF v.authority NOT IN ('crdb_master','reviewed_gap_fill') OR v.quality_status <> 'pass'
     OR v.privacy_status <> 'pass' OR v.review_status <> 'approved' THEN
    RAISE EXCEPTION 'transcript version failed activation gates';
  END IF;
  IF (SELECT count(*) FROM public.replay_transcript_segments WHERE transcript_version_id=v.id) <> v.cue_count THEN
    RAISE EXCEPTION 'transcript cue count mismatch';
  END IF;
  before_hash := encode(digest(to_jsonb(v)::text, 'sha256'), 'hex');
  UPDATE public.replay_transcript_versions SET is_active=false
    WHERE resource_id=v.resource_id AND is_active AND id<>v.id;
  UPDATE public.replay_transcript_versions SET is_active=true, activated_at=now() WHERE id=v.id;
  UPDATE public.mastermind_portal_resources
    SET active_transcript_version_id=v.id, transcript_state='active', updated_at=now()
    WHERE id=v.resource_id;
  SELECT * INTO v FROM public.replay_transcript_versions WHERE id=p_version_id;
  INSERT INTO public.replay_editorial_review_events(
    subject_type, subject_id, before_sha256, after_sha256, actor, decision, reason, review_checklist_version
  ) VALUES (
    'transcript', v.id, before_hash, encode(digest(to_jsonb(v)::text, 'sha256'), 'hex'),
    p_actor, 'activate', 'atomic full-version activation', 'canonical-transcript-activation-v1'
  );
END $$;
REVOKE ALL ON FUNCTION public.activate_replay_transcript_version(UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_replay_transcript_version(UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.replay_forbid_generated_question_publish()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.state::text = 'published' THEN RAISE EXCEPTION 'generated question candidates cannot publish'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS replay_question_candidates_no_publish ON public.replay_question_candidates;
CREATE TRIGGER replay_question_candidates_no_publish BEFORE INSERT OR UPDATE ON public.replay_question_candidates
FOR EACH ROW EXECUTE FUNCTION public.replay_forbid_generated_question_publish();

CREATE OR REPLACE FUNCTION public.replay_forbid_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END $$;
DROP TRIGGER IF EXISTS replay_media_attempts_append_only ON public.replay_media_migration_attempts;
CREATE TRIGGER replay_media_attempts_append_only BEFORE UPDATE OR DELETE ON public.replay_media_migration_attempts
FOR EACH ROW EXECUTE FUNCTION public.replay_forbid_immutable_mutation();
DROP TRIGGER IF EXISTS replay_editorial_events_append_only ON public.replay_editorial_review_events;
CREATE TRIGGER replay_editorial_events_append_only BEFORE UPDATE OR DELETE ON public.replay_editorial_review_events
FOR EACH ROW EXECUTE FUNCTION public.replay_forbid_immutable_mutation();

-- One calendar-date conversion authority. A paid-through/current-replay date is
-- inclusive in America/New_York and expires at the next local midnight. Views
-- expose this boundary, but only capability RPCs compare it with p_as_of.
CREATE OR REPLACE FUNCTION public.replay_vault_exclusive_end(p_inclusive_date date)
RETURNS timestamptz LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS $$
  SELECT CASE WHEN p_inclusive_date IS NULL THEN NULL::timestamptz
    ELSE (p_inclusive_date + 1)::timestamp AT TIME ZONE 'America/New_York' END
$$;

CREATE OR REPLACE VIEW public.replay_published_resource_projection
WITH (security_invoker=false) AS
SELECT r.id, r.portal_resource_id, r.title, r.product_title, r.category_title, r.portal_path,
       r.resource_type, r.approved_access_scope, r.stages, r.success_paths,
       tv.id AS transcript_version_id, tv.normalized_sha256 AS transcript_sha256,
       ma.id AS playback_attempt_id, ma.dropbox_file_id, ma.dropbox_content_hash,
       ma.size_bytes, ma.duration_ms,
       public.replay_vault_exclusive_end(r.available_until) AS availability_expires_at
FROM public.mastermind_portal_resources r
JOIN public.replay_transcript_versions tv ON tv.id=r.active_transcript_version_id
JOIN public.replay_media_migration_attempts ma ON ma.id=r.active_playback_attempt_id
WHERE r.publication_state='published' AND r.published_at IS NOT NULL AND r.revoked_at IS NULL
  AND r.privacy_state='approved' AND r.pairing_state='paired'
  AND r.transcript_state='active' AND r.media_state='approved'
  AND tv.resource_id=r.id AND tv.is_active AND tv.authority IN ('crdb_master','reviewed_gap_fill')
  AND tv.quality_status='pass' AND tv.privacy_status='pass' AND tv.review_status='approved'
  AND ma.status='verified' AND ma.full_decode_ok AND ma.range_request_ok AND ma.sample_seek_ok
  AND EXISTS (
    SELECT 1 FROM public.replay_pairing_candidates pc
    WHERE pc.resource_id=r.id AND pc.transcript_version_id=tv.id AND pc.media_asset_id=ma.source_asset_id
      AND pc.decision IN ('auto_approved','editor_approved')
  );

CREATE OR REPLACE VIEW public.replay_published_answers_projection
WITH (security_invoker=false) AS
SELECT a.id, a.question_cluster_id, a.resource_id, a.member_question, a.safe_answer_summary,
       a.safe_excerpt, a.answerer_attribution, a.situation_context_safe,
       a.question_start_ms, a.answer_start_ms, a.answer_end_ms, a.visibility_scope,
       a.is_best_answer, a.related_answer_rank
FROM public.replay_answers a
JOIN public.replay_published_resource_projection r
  ON r.id=a.resource_id AND r.transcript_version_id=a.transcript_version_id AND r.playback_attempt_id=a.playback_attempt_id
WHERE a.published_at IS NOT NULL AND a.revoked_at IS NULL
  AND a.privacy_approval='approved' AND a.editorial_approval='approved' AND a.seek_approval='approved';

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'replay_ingestion_runs','replay_source_assets','replay_transcript_versions','replay_transcript_segments',
    'replay_pairing_candidates','replay_media_migration_attempts','replay_question_clusters',
    'replay_question_candidates','replay_answers','replay_editorial_review_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END $$;
REVOKE ALL ON public.replay_published_resource_projection FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.replay_published_answers_projection FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.replay_published_resource_projection TO service_role;
GRANT SELECT ON public.replay_published_answers_projection TO service_role;

CREATE INDEX IF NOT EXISTS replay_pairing_candidates_resource_decision_idx ON public.replay_pairing_candidates(resource_id,decision);
CREATE INDEX IF NOT EXISTS replay_media_attempts_source_status_idx ON public.replay_media_migration_attempts(source_asset_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS replay_question_candidates_state_idx ON public.replay_question_candidates(state,created_at);
CREATE INDEX IF NOT EXISTS replay_answers_publication_idx ON public.replay_answers(published_at,revoked_at);


-- R2 canonical publication repair. This authority, not the legacy facet flags,
-- is the sole source for searchable/playable projections.
ALTER TABLE public.mastermind_portal_resources DROP CONSTRAINT IF EXISTS replay_resource_published_binding_chk;
ALTER TABLE public.mastermind_portal_resources ADD CONSTRAINT replay_resource_published_binding_chk CHECK (
 (publication_state='published' AND published_at IS NOT NULL AND revoked_at IS NULL) OR
 (publication_state='revoked' AND published_at IS NOT NULL AND revoked_at IS NOT NULL) OR
 (publication_state NOT IN ('published','revoked') AND published_at IS NULL AND revoked_at IS NULL));

CREATE TABLE public.replay_publication_controls(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),publication_enabled boolean NOT NULL DEFAULT false,changed_at timestamptz NOT NULL DEFAULT now(),changed_by text NOT NULL DEFAULT 'migration');
INSERT INTO public.replay_publication_controls(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE public.replay_publication_authority(
 resource_id uuid PRIMARY KEY REFERENCES public.mastermind_portal_resources(id),
 state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN('DRAFT','READY','APPROVED','PUBLISHED','REVOKED')),
 run_id uuid NOT NULL REFERENCES public.replay_ingestion_runs(id),package_sha256 text NOT NULL CHECK(package_sha256~'^[0-9a-f]{64}$'),
 transcript_source_asset_id uuid NOT NULL REFERENCES public.replay_source_assets(id),media_source_asset_id uuid NOT NULL REFERENCES public.replay_source_assets(id),
 transcript_version_id uuid NOT NULL REFERENCES public.replay_transcript_versions(id),playback_attempt_id uuid NOT NULL REFERENCES public.replay_media_migration_attempts(id),pairing_candidate_id uuid NOT NULL REFERENCES public.replay_pairing_candidates(id),
 transcript_content_sha256 text NOT NULL CHECK(transcript_content_sha256~'^[0-9a-f]{64}$'),media_evidence_sha256 text NOT NULL CHECK(media_evidence_sha256~'^[0-9a-f]{64}$'),source_identity_sha256 text NOT NULL CHECK(source_identity_sha256~'^[0-9a-f]{64}$'),
 ready_review_version text,ready_reviewer text,ready_at timestamptz,approval_review_version text,approval_reviewer text,approved_at timestamptz,published_by text,published_at timestamptz,revoked_by text,revoked_at timestamptz,revocation_reason text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state IN('READY','APPROVED','PUBLISHED','REVOKED'))=(ready_at IS NOT NULL)),CHECK((state IN('APPROVED','PUBLISHED','REVOKED'))=(approved_at IS NOT NULL)),CHECK((state IN('PUBLISHED','REVOKED'))=(published_at IS NOT NULL)),CHECK((state='REVOKED')=(revoked_at IS NOT NULL)));
ALTER TABLE public.replay_ingestion_runs ADD COLUMN package_sha256 text CHECK(package_sha256 IS NULL OR package_sha256~'^[0-9a-f]{64}$');
ALTER TABLE public.replay_source_assets ADD COLUMN source_system_normalized text GENERATED ALWAYS AS(lower(btrim(source_system))) STORED,ADD COLUMN source_native_id_normalized text GENERATED ALWAYS AS(lower(btrim(source_native_id))) STORED;
CREATE UNIQUE INDEX replay_source_assets_normalized_identity_idx ON public.replay_source_assets(source_system_normalized,source_native_id_normalized,source_version);
ALTER TABLE public.replay_media_migration_attempts ADD COLUMN verification_evidence_sha256 text CHECK(verification_evidence_sha256 IS NULL OR verification_evidence_sha256~'^[0-9a-f]{64}$');
ALTER TABLE public.replay_pairing_candidates ADD COLUMN binding_sha256 text CHECK(binding_sha256 IS NULL OR binding_sha256~'^[0-9a-f]{64}$');
ALTER TABLE public.replay_question_candidates ADD COLUMN origin text NOT NULL DEFAULT 'generated' CHECK(origin IN('generated','human_curated')),ADD COLUMN content_sha256 text CHECK(content_sha256 IS NULL OR content_sha256~'^[0-9a-f]{64}$');
ALTER TABLE public.replay_answers ADD COLUMN publication_state text NOT NULL DEFAULT 'DRAFT' CHECK(publication_state IN('DRAFT','READY','APPROVED','PUBLISHED','REVOKED')),ADD COLUMN content_sha256 text CHECK(content_sha256 IS NULL OR content_sha256~'^[0-9a-f]{64}$'),ADD COLUMN review_version text;

CREATE OR REPLACE FUNCTION public.replay_transcript_content_hash(p_version uuid) RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$ SELECT encode(digest(coalesce(string_agg(s.segment_index||':'||s.starts_at_ms||':'||s.ends_at_ms||':'||regexp_replace(btrim(s.transcript_text_private),E'\\s+',' ','g'),E'\n' ORDER BY s.segment_index),''),'sha256'),'hex') FROM public.replay_transcript_segments s WHERE s.transcript_version_id=p_version $$;
CREATE OR REPLACE FUNCTION public.replay_assert_actor(a text) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$BEGIN IF a IS NULL OR btrim(a)='' THEN RAISE EXCEPTION 'actor required'; END IF; END$$;
CREATE OR REPLACE FUNCTION public.replay_authority_transition_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$BEGIN
 IF current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid='public.replay_publication_authority'::regclass)) THEN RAISE EXCEPTION 'publication authority is function-only'; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication authority history is immutable'; END IF;
 IF OLD.state<>NEW.state AND NOT((OLD.state='DRAFT' AND NEW.state='READY')OR(OLD.state='READY' AND NEW.state='APPROVED')OR(OLD.state='APPROVED' AND NEW.state='PUBLISHED')OR(OLD.state='PUBLISHED' AND NEW.state='REVOKED')) THEN RAISE EXCEPTION 'illegal publication transition % -> %',OLD.state,NEW.state; END IF;
 IF OLD.state IN('PUBLISHED','REVOKED') AND NEW.state=OLD.state AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'published authority rows are immutable'; END IF; RETURN NEW; END$$;
CREATE TRIGGER replay_authority_transition_guard BEFORE UPDATE OR DELETE ON public.replay_publication_authority FOR EACH ROW EXECUTE FUNCTION public.replay_authority_transition_guard();

CREATE OR REPLACE FUNCTION public.replay_import_content_package(j jsonb,actor text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE rid uuid;runid uuid;tsa uuid;msa uuid;tv uuid;ma uuid;pc uuid;x jsonb;n int;raw text;nh text;rh text;sh text;mh text;ph text;ih text;ss text;sn text;sv text;mn text;mv text;md bigint;lastms bigint;prior text;
BEGIN PERFORM public.replay_assert_actor(actor);rid:=(j->>'resource_id')::uuid;IF NOT EXISTS(SELECT 1 FROM public.mastermind_portal_resources WHERE id=rid)THEN RAISE EXCEPTION 'resource not found';END IF;SELECT state INTO prior FROM public.replay_publication_authority WHERE resource_id=rid FOR UPDATE;IF prior IS NOT NULL AND prior<>'DRAFT'THEN RAISE EXCEPTION 'only DRAFT resources may be reimported';END IF;
 ss:=lower(btrim(j#>>'{source,system}'));sn:=lower(btrim(j#>>'{source,native_id}'));sv:=btrim(j#>>'{source,version}');mn:=lower(btrim(j#>>'{media,native_id}'));mv:=btrim(j#>>'{media,version}');IF ss=''OR sn=''OR sv=''OR mn=''OR mv=''THEN RAISE EXCEPTION 'normalized source identity required';END IF;IF j#>>'{source,privacy_flag}'<>'clear'THEN RAISE EXCEPTION 'source privacy is not clear';END IF;
 IF jsonb_typeof(j#>'{transcript,segments}')<>'array'OR jsonb_array_length(j#>'{transcript,segments}')=0 THEN RAISE EXCEPTION 'nonempty transcript required';END IF;
 SELECT count(*),string_agg(regexp_replace(btrim(q->>'text'),E'\\s+',' ','g'),E'\n' ORDER BY(q->>'index')::int),max((q->>'end_ms')::bigint) INTO n,raw,lastms FROM jsonb_array_elements(j#>'{transcript,segments}')q;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(j#>'{transcript,segments}')q WHERE(q->>'index')::int<0 OR(q->>'start_ms')::bigint<0 OR(q->>'end_ms')::bigint<=(q->>'start_ms')::bigint OR btrim(q->>'text')='')OR(SELECT count(DISTINCT(q->>'index')::int)FROM jsonb_array_elements(j#>'{transcript,segments}')q)<>n OR(SELECT min((q->>'index')::int)FROM jsonb_array_elements(j#>'{transcript,segments}')q)<>0 OR(SELECT max((q->>'index')::int)FROM jsonb_array_elements(j#>'{transcript,segments}')q)<>n-1 THEN RAISE EXCEPTION 'malformed, duplicate, or noncontiguous segment';END IF;
 IF raw~*'(PRIVATE_SENTINEL|[[:alnum:]._%+-]+@[[:alnum:].-]+\\.[A-Za-z]{2,})'THEN RAISE EXCEPTION 'private transcript sentinel';END IF;rh:=encode(digest(raw,'sha256'),'hex');sh:=encode(digest(jsonb_build_object('system',ss,'native_id',sn,'version',sv,'raw_sha256',rh,'metadata',j#>'{source,metadata}')::text,'sha256'),'hex');md:=(j#>>'{media,duration_ms}')::bigint;
 IF md IS NULL OR md<=0 OR(j#>>'{media,size_bytes}')::bigint<=0 OR coalesce(j#>>'{media,dropbox_file_id}','')='' OR coalesce(j#>>'{media,dropbox_content_hash}','')!~'^[0-9a-f]{64}$'OR coalesce(j#>>'{media,byte_sha256}','')!~'^[0-9a-f]{64}$'OR coalesce(j#>>'{media,decode_report_sha256}','')!~'^[0-9a-f]{64}$'OR coalesce(j#>>'{media,range_report_sha256}','')!~'^[0-9a-f]{64}$'OR coalesce(j#>>'{media,seek_report_sha256}','')!~'^[0-9a-f]{64}$'THEN RAISE EXCEPTION 'content-bound media evidence required';END IF;IF abs(md-lastms)>greatest(10000,round(md*.01))THEN RAISE EXCEPTION 'duration mismatch';END IF;
 mh:=encode(digest(jsonb_build_object('system',ss,'native_id',mn,'version',mv,'byte',j#>>'{media,byte_sha256}','dropbox',j#>>'{media,dropbox_content_hash}','size',(j#>>'{media,size_bytes}')::bigint,'duration',md,'decode',j#>>'{media,decode_report_sha256}','range',j#>>'{media,range_report_sha256}','seek',j#>>'{media,seek_report_sha256}')::text,'sha256'),'hex');ih:=encode(digest(ss||E'\n'||sn||E'\n'||sv||E'\n'||mn||E'\n'||mv,'sha256'),'hex');ph:=encode(digest(sh||mh||ih||rid,'sha256'),'hex');
 INSERT INTO public.replay_ingestion_runs(run_kind,source_system,collector_version_sha256,source_snapshot_sha256,record_manifest_sha256,record_count,status,completed_at,created_by,package_sha256)VALUES('content_bound_import',ss,encode(digest('sql-r2','sha256'),'hex'),ph,ph,2,'accepted',now(),actor,ph)RETURNING id INTO runid;
 INSERT INTO public.replay_source_assets(source_system,source_native_id,source_version,asset_role,byte_sha256,size_bytes,duration_ms,mime_type,title_raw,title_normalized,event_date,source_privacy_flag,first_seen_run_id,last_seen_run_id,metadata_sha256)VALUES(ss,sn,sv,'canonical_transcript',rh,octet_length(raw),lastms,'text/plain',j#>>'{source,title}',lower(btrim(j#>>'{source,title}')),(j#>>'{source,event_date}')::date,'clear',runid,runid,sh)RETURNING id INTO tsa;
 INSERT INTO public.replay_source_assets(source_system,source_native_id,source_version,asset_role,byte_sha256,dropbox_content_hash,size_bytes,duration_ms,mime_type,title_raw,title_normalized,event_date,source_privacy_flag,first_seen_run_id,last_seen_run_id,metadata_sha256)VALUES(ss,mn,mv,'media_file',j#>>'{media,byte_sha256}',j#>>'{media,dropbox_content_hash}',(j#>>'{media,size_bytes}')::bigint,md,j#>>'{media,mime_type}',j#>>'{source,title}',lower(btrim(j#>>'{source,title}')),(j#>>'{source,event_date}')::date,'clear',runid,runid,mh)RETURNING id INTO msa;
 UPDATE public.replay_transcript_versions SET is_active=false WHERE resource_id=rid;
 INSERT INTO public.replay_transcript_versions(resource_id,source_asset_id,authority,source_record_id,source_version,raw_sha256,normalized_sha256,normalizer_version,cue_count,text_chars,first_ms,last_ms,coverage_ratio,quality_status,privacy_status,review_status,quality_report,is_active,activated_at)VALUES(rid,tsa,'crdb_master',sn,sv,rh,rh,'sql-r2',n,length(raw),0,lastms,lastms::numeric/md,'pass','pass','approved',jsonb_build_object('computed_by','sql-r2'),true,now())RETURNING id INTO tv;
 FOR x IN SELECT value FROM jsonb_array_elements(j#>'{transcript,segments}')LOOP INSERT INTO public.replay_transcript_segments(transcript_version_id,segment_index,starts_at_ms,ends_at_ms,transcript_text_private)VALUES(tv,(x->>'index')::int,(x->>'start_ms')::bigint,(x->>'end_ms')::bigint,regexp_replace(btrim(x->>'text'),E'\\s+',' ','g'));END LOOP;nh:=public.replay_transcript_content_hash(tv);UPDATE public.replay_transcript_versions SET normalized_sha256=nh WHERE id=tv;
 INSERT INTO public.replay_media_migration_attempts(run_id,source_asset_id,manifest_sha256,run_sha256,worker_sha256,source_native_id,source_metadata_sha256,source_url_fingerprint,destination_policy_version,stable_destination_key,dropbox_file_id,dropbox_content_hash,size_bytes,duration_ms,container,codecs,audio_stream_ok,video_stream_ok,full_decode_ok,range_request_ok,sample_seek_ok,status,attempt_number,started_at,completed_at,receipt_sha256,verification_evidence_sha256)VALUES(runid,msa,ph,ph,encode(digest('sql-r2-worker','sha256'),'hex'),mn,mh,encode(digest(ss||':'||mn,'sha256'),'hex'),'sql-r2',ih,j#>>'{media,dropbox_file_id}',j#>>'{media,dropbox_content_hash}',(j#>>'{media,size_bytes}')::bigint,md,j#>>'{media,container}',coalesce(j#>'{media,codecs}','{}'),true,true,true,true,true,'verified',1,now(),now(),mh,mh)RETURNING id INTO ma;
 INSERT INTO public.replay_pairing_candidates(resource_id,media_asset_id,transcript_asset_id,transcript_version_id,run_id,stable_bridge_id,stable_bridge_exact,event_date_exact,media_duration_ms,duration_delta_ms,duration_delta_percent,transcript_coverage_ratio,rule_version,candidate_rank,candidate_count_at_key,decision,decision_reason,binding_sha256)VALUES(rid,msa,tsa,tv,runid,ih,true,true,md,abs(md-lastms),abs(md-lastms)::numeric/md,lastms::numeric/md,'sql-r2',1,1,'auto_approved','exact content-bound identity',encode(digest(rid::text||msa::text||tsa::text||tv::text||runid::text||ih,'sha256'),'hex'))RETURNING id INTO pc;
 UPDATE public.replay_transcript_versions SET is_active=false WHERE resource_id=rid AND id<>tv;UPDATE public.mastermind_portal_resources SET active_transcript_version_id=tv,active_playback_attempt_id=ma WHERE id=rid;
 INSERT INTO public.replay_publication_authority(resource_id,run_id,package_sha256,transcript_source_asset_id,media_source_asset_id,transcript_version_id,playback_attempt_id,pairing_candidate_id,transcript_content_sha256,media_evidence_sha256,source_identity_sha256)VALUES(rid,runid,ph,tsa,msa,tv,ma,pc,nh,mh,ih)ON CONFLICT(resource_id)DO UPDATE SET run_id=excluded.run_id,package_sha256=excluded.package_sha256,transcript_source_asset_id=excluded.transcript_source_asset_id,media_source_asset_id=excluded.media_source_asset_id,transcript_version_id=excluded.transcript_version_id,playback_attempt_id=excluded.playback_attempt_id,pairing_candidate_id=excluded.pairing_candidate_id,transcript_content_sha256=excluded.transcript_content_sha256,media_evidence_sha256=excluded.media_evidence_sha256,source_identity_sha256=excluded.source_identity_sha256,updated_at=now();RETURN runid;END$$;

CREATE OR REPLACE FUNCTION public.replay_assert_release_evidence(rid uuid)RETURNS public.replay_publication_authority LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE a public.replay_publication_authority%ROWTYPE;BEGIN SELECT*INTO a FROM public.replay_publication_authority WHERE resource_id=rid FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'authority missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.replay_ingestion_runs r WHERE r.id=a.run_id AND r.status='accepted'AND r.package_sha256=a.package_sha256)THEN RAISE EXCEPTION 'run evidence stale';END IF;IF public.replay_transcript_content_hash(a.transcript_version_id)<>a.transcript_content_sha256 THEN RAISE EXCEPTION 'transcript stale';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.replay_transcript_versions v JOIN public.replay_source_assets s ON s.id=v.source_asset_id WHERE v.id=a.transcript_version_id AND v.resource_id=a.resource_id AND v.is_active AND v.source_asset_id=a.transcript_source_asset_id AND v.quality_status='pass'AND v.privacy_status='pass'AND v.review_status='approved'AND v.normalized_sha256=a.transcript_content_sha256 AND s.source_privacy_flag='clear'AND s.last_seen_run_id=a.run_id)THEN RAISE EXCEPTION 'approved active transcript binding missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.replay_media_migration_attempts m JOIN public.replay_source_assets s ON s.id=m.source_asset_id WHERE m.id=a.playback_attempt_id AND m.run_id=a.run_id AND m.source_asset_id=a.media_source_asset_id AND m.status='verified'AND m.verification_evidence_sha256=a.media_evidence_sha256 AND m.full_decode_ok AND m.range_request_ok AND m.sample_seek_ok AND s.source_privacy_flag='clear'AND s.last_seen_run_id=a.run_id)THEN RAISE EXCEPTION 'verified media binding missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.replay_pairing_candidates p WHERE p.id=a.pairing_candidate_id AND p.resource_id=a.resource_id AND p.run_id=a.run_id AND p.transcript_asset_id=a.transcript_source_asset_id AND p.media_asset_id=a.media_source_asset_id AND p.transcript_version_id=a.transcript_version_id AND p.decision IN('auto_approved','editor_approved')AND p.binding_sha256 IS NOT NULL)THEN RAISE EXCEPTION 'pairing binding missing';END IF;RETURN a;END$$;
CREATE OR REPLACE FUNCTION public.replay_mark_resource_ready(rid uuid,actor text,rv text)RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE a public.replay_publication_authority%ROWTYPE;BEGIN PERFORM public.replay_assert_actor(actor);IF coalesce(btrim(rv),'')=''THEN RAISE EXCEPTION 'review version required';END IF;a:=public.replay_assert_release_evidence(rid);IF a.state<>'DRAFT'THEN RAISE EXCEPTION 'expected DRAFT';END IF;UPDATE public.replay_publication_authority SET state='READY',ready_review_version=rv,ready_reviewer=actor,ready_at=now(),updated_at=now()WHERE resource_id=rid;END$$;
CREATE OR REPLACE FUNCTION public.replay_approve_resource(rid uuid,actor text,rv text)RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE a public.replay_publication_authority%ROWTYPE;BEGIN PERFORM public.replay_assert_actor(actor);a:=public.replay_assert_release_evidence(rid);IF a.state<>'READY'THEN RAISE EXCEPTION 'expected READY';END IF;IF actor=a.ready_reviewer THEN RAISE EXCEPTION 'reviewers must differ';END IF;IF coalesce(btrim(rv),'')=''THEN RAISE EXCEPTION 'review version required';END IF;UPDATE public.replay_publication_authority SET state='APPROVED',approval_review_version=rv,approval_reviewer=actor,approved_at=now(),updated_at=now()WHERE resource_id=rid;END$$;
CREATE OR REPLACE FUNCTION public.replay_publish_resource(rid uuid,actor text)RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE a public.replay_publication_authority%ROWTYPE;BEGIN PERFORM public.replay_assert_actor(actor);a:=public.replay_assert_release_evidence(rid);IF a.state<>'APPROVED'THEN RAISE EXCEPTION 'expected APPROVED';END IF;IF NOT(SELECT publication_enabled FROM public.replay_publication_controls WHERE singleton)THEN RAISE EXCEPTION 'publication feature disabled';END IF;UPDATE public.replay_publication_authority SET state='PUBLISHED',published_by=actor,published_at=now(),updated_at=now()WHERE resource_id=rid;END$$;
CREATE OR REPLACE FUNCTION public.replay_revoke_resource(rid uuid,actor text,reason text)RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$BEGIN PERFORM public.replay_assert_actor(actor);IF coalesce(btrim(reason),'')=''THEN RAISE EXCEPTION 'reason required';END IF;IF NOT EXISTS(SELECT 1 FROM public.replay_publication_authority WHERE resource_id=rid AND state='PUBLISHED'FOR UPDATE)THEN RAISE EXCEPTION 'expected PUBLISHED';END IF;UPDATE public.replay_publication_authority SET state='REVOKED',revoked_by=actor,revoked_at=now(),revocation_reason=reason,updated_at=now()WHERE resource_id=rid;END$$;

CREATE OR REPLACE VIEW public.replay_published_resource_projection WITH(security_invoker=false)AS SELECT r.id,r.portal_resource_id,r.title,r.product_title,r.category_title,r.portal_path,r.resource_type,r.approved_access_scope,r.stages,r.success_paths,a.transcript_version_id,a.transcript_content_sha256 transcript_sha256,a.playback_attempt_id,m.dropbox_file_id,m.dropbox_content_hash,m.size_bytes,m.duration_ms,public.replay_vault_exclusive_end(r.available_until) availability_expires_at FROM public.replay_publication_authority a JOIN public.mastermind_portal_resources r ON r.id=a.resource_id JOIN public.replay_transcript_versions v ON v.id=a.transcript_version_id JOIN public.replay_media_migration_attempts m ON m.id=a.playback_attempt_id WHERE a.state='PUBLISHED'AND a.published_at IS NOT NULL AND a.revoked_at IS NULL AND v.resource_id=a.resource_id AND v.is_active AND v.normalized_sha256=a.transcript_content_sha256 AND m.source_asset_id=a.media_source_asset_id AND m.verification_evidence_sha256=a.media_evidence_sha256;
CREATE OR REPLACE VIEW public.replay_published_answers_projection WITH(security_invoker=false)AS SELECT a.id,a.question_cluster_id,a.resource_id,a.member_question,a.safe_answer_summary,a.safe_excerpt,a.answerer_attribution,a.situation_context_safe,a.question_start_ms,a.answer_start_ms,a.answer_end_ms,a.visibility_scope,a.is_best_answer,a.related_answer_rank FROM public.replay_answers a JOIN public.replay_question_candidates q ON q.id=a.question_candidate_id JOIN public.replay_published_resource_projection r ON r.id=a.resource_id AND r.transcript_version_id=a.transcript_version_id AND r.playback_attempt_id=a.playback_attempt_id WHERE a.publication_state='PUBLISHED'AND a.published_at IS NOT NULL AND a.revoked_at IS NULL AND q.state='approved'AND q.origin='human_curated'AND q.source_privacy_flag='clear'AND coalesce(q.raw_excerpt_private,'')!~*'PRIVATE_SENTINEL'AND q.proposed_question_private!~*'PRIVATE_SENTINEL'AND a.member_question!~*'PRIVATE_SENTINEL'AND a.safe_answer_summary!~*'PRIVATE_SENTINEL'AND coalesce(a.safe_excerpt,'')!~*'PRIVATE_SENTINEL';
DROP FUNCTION public.activate_replay_transcript_version(uuid,text);
DO $$DECLARE n text;BEGIN FOREACH n IN ARRAY ARRAY['replay_ingestion_runs','replay_source_assets','replay_transcript_versions','replay_transcript_segments','replay_pairing_candidates','replay_media_migration_attempts','replay_question_clusters','replay_question_candidates','replay_answers','replay_editorial_review_events','replay_publication_controls','replay_publication_authority']LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role',n);END LOOP;END$$;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.mastermind_portal_resources FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON public.replay_published_resource_projection,public.replay_published_answers_projection FROM PUBLIC,anon,authenticated;GRANT SELECT ON public.replay_published_resource_projection,public.replay_published_answers_projection TO service_role;
DO $$DECLARE f regprocedure;BEGIN FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'AND p.proname LIKE'replay_%'LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);END LOOP;END$$;
GRANT EXECUTE ON FUNCTION public.replay_import_content_package(jsonb,text),public.replay_mark_resource_ready(uuid,text,text),public.replay_approve_resource(uuid,text,text),public.replay_publish_resource(uuid,text),public.replay_revoke_resource(uuid,text,text)TO service_role;
COMMENT ON TABLE public.replay_publication_authority IS 'Exclusive content-bound publication authority; function-only transitions.';
