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

CREATE OR REPLACE VIEW public.replay_published_resource_projection
WITH (security_invoker=true) AS
SELECT r.id, r.portal_resource_id, r.title, r.product_title, r.category_title, r.portal_path,
       r.resource_type, r.approved_access_scope, r.stages, r.success_paths,
       tv.id AS transcript_version_id, tv.normalized_sha256 AS transcript_sha256,
       ma.id AS playback_attempt_id, ma.dropbox_file_id, ma.dropbox_content_hash,
       ma.size_bytes, ma.duration_ms
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
  )
  AND (r.approved_access_scope <> 'current_replay_30_day' OR r.available_until >= CURRENT_DATE);

CREATE OR REPLACE VIEW public.replay_published_answers_projection
WITH (security_invoker=true) AS
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
