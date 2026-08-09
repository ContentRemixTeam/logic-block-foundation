-- Questions Answered R1: private, human-reviewed, function-only workflow.
-- Additive only. Publication remains disabled and no member/client role receives access.

ALTER TABLE public.replay_question_candidates
  ADD COLUMN IF NOT EXISTS playback_attempt_id uuid REFERENCES public.replay_media_migration_attempts(id),
  ADD COLUMN IF NOT EXISTS transcript_snapshot_sha256 text CHECK (transcript_snapshot_sha256 IS NULL OR transcript_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS media_snapshot_sha256 text CHECK (media_snapshot_sha256 IS NULL OR media_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS privacy_reviewer text,
  ADD COLUMN IF NOT EXISTS privacy_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_checklist_version text,
  ADD COLUMN IF NOT EXISTS editorial_reviewer text,
  ADD COLUMN IF NOT EXISTS editorial_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS editorial_checklist_version text,
  ADD COLUMN IF NOT EXISTS seek_reviewer text,
  ADD COLUMN IF NOT EXISTS seek_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seek_checklist_version text;

ALTER TABLE public.replay_answers
  ADD COLUMN IF NOT EXISTS transcript_snapshot_sha256 text CHECK (transcript_snapshot_sha256 IS NULL OR transcript_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS media_snapshot_sha256 text CHECK (media_snapshot_sha256 IS NULL OR media_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS publication_reason text,
  ADD COLUMN IF NOT EXISTS revoked_by text,
  ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE public.replay_answers DROP CONSTRAINT IF EXISTS replay_answers_check1;
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid='public.replay_answers'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%published_at IS NULL OR%'
      AND pg_get_constraintdef(oid) LIKE '%revoked_at IS NULL%'
  LOOP EXECUTE format('ALTER TABLE public.replay_answers DROP CONSTRAINT %I',c.conname); END LOOP;
END
$$;
ALTER TABLE public.replay_answers ADD CONSTRAINT replay_answers_r1_publication_lifecycle_chk CHECK (
  (publication_state IN ('DRAFT','READY','APPROVED') AND published_at IS NULL AND revoked_at IS NULL)
  OR (publication_state='PUBLISHED' AND published_at IS NOT NULL AND revoked_at IS NULL
      AND privacy_approval='approved' AND editorial_approval='approved' AND seek_approval='approved'
      AND privacy_reviewer IS NOT NULL AND editorial_reviewer IS NOT NULL AND seek_reviewer IS NOT NULL)
  OR (publication_state='REVOKED' AND published_at IS NOT NULL AND revoked_at IS NOT NULL
      AND privacy_approval='approved' AND editorial_approval='approved' AND seek_approval='approved'
      AND privacy_reviewer IS NOT NULL AND editorial_reviewer IS NOT NULL AND seek_reviewer IS NOT NULL)
);

CREATE TABLE public.replay_question_publication_controls (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  publication_enabled boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL DEFAULT 'migration'
);
INSERT INTO public.replay_question_publication_controls(singleton) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.replay_question_publication_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.replay_question_publication_controls FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.replay_forbid_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_actor(p_actor text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE v text := btrim(coalesce(p_actor,''));
BEGIN
  IF v = '' OR length(v) > 200 THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  RETURN v;
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_required(p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE v text := btrim(coalesce(p_value,''));
BEGIN
  IF v = '' OR length(v) > 1000 THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  RETURN v;
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_excerpt(
  p_transcript_version_id uuid, p_question_start_ms bigint, p_answer_end_ms bigint
) RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT string_agg(
    s.segment_index::text || ':' || s.starts_at_ms::text || ':' || s.ends_at_ms::text || ':' ||
      regexp_replace(btrim(s.transcript_text_private), E'\\s+', ' ', 'g'),
    E'\n' ORDER BY s.segment_index)
  FROM public.replay_transcript_segments s
  WHERE s.transcript_version_id = p_transcript_version_id
    AND s.starts_at_ms < p_answer_end_ms
    AND s.ends_at_ms > p_question_start_ms
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_candidate_hash(p_candidate_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT encode(digest(jsonb_build_object(
    'id',q.id,'resource_id',q.resource_id,'transcript_version_id',q.transcript_version_id,
    'playback_attempt_id',q.playback_attempt_id,'question_segment_index',q.question_segment_index,
    'question_start_ms',q.question_start_ms,'answer_start_ms',q.answer_start_ms,'answer_end_ms',q.answer_end_ms,
    'raw_excerpt_sha256',q.raw_excerpt_sha256,'extractor_version',q.extractor_version,
    'proposed_question_private',q.proposed_question_private,'proposed_summary_private',q.proposed_summary_private,
    'proposed_tags_private',q.proposed_tags_private,'proposed_action_private',q.proposed_action_private,
    'answerer_hint_private',q.answerer_hint_private,'sensitivity_findings',q.sensitivity_findings,
    'source_privacy_flag',q.source_privacy_flag,'origin',q.origin,
    'transcript_snapshot_sha256',q.transcript_snapshot_sha256,'media_snapshot_sha256',q.media_snapshot_sha256
  )::text,'sha256'),'hex')
  FROM public.replay_question_candidates q WHERE q.id=p_candidate_id
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_answer_hash(p_answer_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT encode(digest(jsonb_build_object(
    'id',a.id,'question_cluster_id',a.question_cluster_id,'question_candidate_id',a.question_candidate_id,
    'resource_id',a.resource_id,'transcript_version_id',a.transcript_version_id,
    'playback_attempt_id',a.playback_attempt_id,'question_start_ms',a.question_start_ms,
    'answer_start_ms',a.answer_start_ms,'answer_end_ms',a.answer_end_ms,
    'member_question',a.member_question,'safe_answer_summary',a.safe_answer_summary,
    'safe_excerpt',a.safe_excerpt,'answerer_attribution',a.answerer_attribution,
    'situation_context_safe',a.situation_context_safe,'visibility_scope',a.visibility_scope,
    'transcript_snapshot_sha256',a.transcript_snapshot_sha256,'media_snapshot_sha256',a.media_snapshot_sha256
  )::text,'sha256'),'hex')
  FROM public.replay_answers a WHERE a.id=p_answer_id
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_assert_binding(p_candidate_id uuid, p_expected_state text DEFAULT NULL)
RETURNS public.replay_question_candidates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  q public.replay_question_candidates%ROWTYPE;
  a public.replay_publication_authority%ROWTYPE;
  v public.replay_transcript_versions%ROWTYPE;
  m public.replay_media_migration_attempts%ROWTYPE;
  exact_excerpt text;
BEGIN
  SELECT * INTO q FROM public.replay_question_candidates WHERE id=p_candidate_id FOR UPDATE;
  IF NOT FOUND OR (p_expected_state IS NOT NULL AND q.state<>p_expected_state) THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  SELECT * INTO a FROM public.replay_publication_authority WHERE resource_id=q.resource_id;
  SELECT * INTO v FROM public.replay_transcript_versions WHERE id=q.transcript_version_id;
  SELECT * INTO m FROM public.replay_media_migration_attempts WHERE id=q.playback_attempt_id;
  IF a.state<>'PUBLISHED' OR a.revoked_at IS NOT NULL
    OR a.transcript_version_id<>q.transcript_version_id OR a.playback_attempt_id<>q.playback_attempt_id
    OR NOT EXISTS (SELECT 1 FROM public.mastermind_portal_resources r WHERE r.id=q.resource_id
      AND r.active_transcript_version_id=q.transcript_version_id AND r.active_playback_attempt_id=q.playback_attempt_id)
    OR v.resource_id<>q.resource_id OR NOT v.is_active OR v.normalized_sha256<>q.transcript_snapshot_sha256
    OR public.replay_transcript_content_hash(v.id)<>q.transcript_snapshot_sha256
    OR m.status<>'verified' OR NOT m.full_decode_ok OR NOT m.range_request_ok OR NOT m.sample_seek_ok
    OR m.verification_evidence_sha256<>q.media_snapshot_sha256
    OR q.question_start_ms<0 OR q.question_start_ms>q.answer_start_ms OR q.answer_start_ms>q.answer_end_ms
    OR q.answer_end_ms>v.last_ms OR q.answer_end_ms>m.duration_ms
    OR NOT EXISTS (SELECT 1 FROM public.replay_transcript_segments s
      WHERE s.transcript_version_id=q.transcript_version_id AND s.segment_index=q.question_segment_index
        AND q.question_start_ms>=s.starts_at_ms AND q.question_start_ms<s.ends_at_ms)
  THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  exact_excerpt:=public.replay_questions_excerpt(q.transcript_version_id,q.question_start_ms,q.answer_end_ms);
  IF exact_excerpt IS NULL OR encode(digest(exact_excerpt,'sha256'),'hex')<>q.raw_excerpt_sha256
    OR public.replay_questions_candidate_hash(q.id)<>q.content_sha256
  THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  RETURN q;
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_event(
  p_subject_type text, p_subject_id uuid, p_before_state text, p_after_state text,
  p_content_sha256 text, p_actor text, p_decision text, p_reason text, p_checklist text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.replay_editorial_review_events(
    subject_type,subject_id,before_sha256,after_sha256,actor,decision,reason,review_checklist_version
  ) VALUES (
    p_subject_type,p_subject_id,
    encode(digest(p_content_sha256||':'||p_before_state,'sha256'),'hex'),
    encode(digest(p_content_sha256||':'||p_after_state,'sha256'),'hex'),
    public.replay_questions_actor(p_actor),public.replay_questions_required(p_decision),
    public.replay_questions_required(p_reason),public.replay_questions_required(p_checklist)
  );
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_create_candidate(
  p_resource_id uuid, p_question_segment_index integer,
  p_question_start_ms bigint, p_answer_start_ms bigint, p_answer_end_ms bigint,
  p_extractor_version text, p_proposed_question_private text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a public.replay_publication_authority%ROWTYPE;
  v public.replay_transcript_versions%ROWTYPE;
  m public.replay_media_migration_attempts%ROWTYPE;
  excerpt text; qid uuid;
BEGIN
  SELECT * INTO a FROM public.replay_publication_authority WHERE resource_id=p_resource_id;
  IF NOT FOUND OR a.state<>'PUBLISHED' OR a.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  SELECT * INTO v FROM public.replay_transcript_versions WHERE id=a.transcript_version_id;
  SELECT * INTO m FROM public.replay_media_migration_attempts WHERE id=a.playback_attempt_id;
  IF NOT v.is_active OR v.resource_id<>p_resource_id
    OR NOT EXISTS (SELECT 1 FROM public.mastermind_portal_resources r WHERE r.id=p_resource_id
      AND r.active_transcript_version_id=v.id AND r.active_playback_attempt_id=m.id)
    OR public.replay_transcript_content_hash(v.id)<>a.transcript_content_sha256
    OR v.normalized_sha256<>a.transcript_content_sha256 OR m.status<>'verified'
    OR m.verification_evidence_sha256<>a.media_evidence_sha256
    OR NOT m.full_decode_ok OR NOT m.range_request_ok OR NOT m.sample_seek_ok
    OR p_question_start_ms<0 OR p_question_start_ms>p_answer_start_ms OR p_answer_start_ms>p_answer_end_ms
    OR p_answer_end_ms>v.last_ms OR p_answer_end_ms>m.duration_ms
    OR NOT EXISTS (SELECT 1 FROM public.replay_transcript_segments s WHERE s.transcript_version_id=v.id
      AND s.segment_index=p_question_segment_index AND p_question_start_ms>=s.starts_at_ms AND p_question_start_ms<s.ends_at_ms)
  THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  excerpt:=public.replay_questions_excerpt(v.id,p_question_start_ms,p_answer_end_ms);
  IF excerpt IS NULL THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  INSERT INTO public.replay_question_candidates(
    resource_id,transcript_version_id,playback_attempt_id,question_segment_index,
    question_start_ms,answer_start_ms,answer_end_ms,raw_excerpt_private,raw_excerpt_sha256,
    extractor_version,proposed_question_private,state,origin,transcript_snapshot_sha256,media_snapshot_sha256
  ) VALUES (
    p_resource_id,v.id,m.id,p_question_segment_index,p_question_start_ms,p_answer_start_ms,p_answer_end_ms,
    excerpt,encode(digest(excerpt,'sha256'),'hex'),public.replay_questions_required(p_extractor_version),
    public.replay_questions_required(p_proposed_question_private),'extracted_private','generated',
    a.transcript_content_sha256,a.media_evidence_sha256
  ) RETURNING id INTO qid;
  UPDATE public.replay_question_candidates SET content_sha256=public.replay_questions_candidate_hash(qid) WHERE id=qid;
  RETURN qid;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'question workflow denied';
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_promote_candidate(
  p_candidate_id uuid, p_actor text, p_reason text, p_checklist text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE src public.replay_question_candidates%ROWTYPE; qid uuid; actor text;
BEGIN
  actor:=public.replay_questions_actor(p_actor);
  PERFORM public.replay_questions_required(p_reason); PERFORM public.replay_questions_required(p_checklist);
  src:=public.replay_questions_assert_binding(p_candidate_id,'extracted_private');
  IF src.origin<>'generated' THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  INSERT INTO public.replay_question_candidates(
    resource_id,transcript_version_id,playback_attempt_id,question_segment_index,
    question_start_ms,answer_start_ms,answer_end_ms,raw_excerpt_private,raw_excerpt_sha256,
    extractor_version,evidence_features,proposed_question_private,proposed_summary_private,
    proposed_tags_private,proposed_action_private,answerer_hint_private,sensitivity_findings,
    source_privacy_flag,duplicate_cluster_candidate_id,state,origin,
    transcript_snapshot_sha256,media_snapshot_sha256
  ) VALUES (
    src.resource_id,src.transcript_version_id,src.playback_attempt_id,src.question_segment_index,
    src.question_start_ms,src.answer_start_ms,src.answer_end_ms,src.raw_excerpt_private,src.raw_excerpt_sha256,
    'human-curated:'||src.id::text,src.evidence_features,src.proposed_question_private,src.proposed_summary_private,
    src.proposed_tags_private,src.proposed_action_private,src.answerer_hint_private,src.sensitivity_findings,
    src.source_privacy_flag,src.duplicate_cluster_candidate_id,'privacy_review','human_curated',
    src.transcript_snapshot_sha256,src.media_snapshot_sha256
  ) RETURNING id INTO qid;
  UPDATE public.replay_question_candidates SET content_sha256=public.replay_questions_candidate_hash(qid) WHERE id=qid;
  PERFORM public.replay_questions_event('question_candidate',qid,'generated_candidate','privacy_review',
    public.replay_questions_candidate_hash(qid),actor,'explicit_human_curated_promotion',p_reason,p_checklist);
  RETURN qid;
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_privacy_approve(
  p_candidate_id uuid,p_actor text,p_reason text,p_checklist text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE q public.replay_question_candidates%ROWTYPE; actor text;
BEGIN
  actor:=public.replay_questions_actor(p_actor); PERFORM public.replay_questions_required(p_reason); PERFORM public.replay_questions_required(p_checklist);
  q:=public.replay_questions_assert_binding(p_candidate_id,'privacy_review');
  IF q.origin<>'human_curated' OR q.source_privacy_flag<>'clear' OR q.sensitivity_findings<>'[]'::jsonb
    OR concat_ws(' ',q.raw_excerpt_private,q.proposed_question_private,q.proposed_summary_private,q.proposed_action_private,q.answerer_hint_private)
       ~* '(PRIVATE_SENTINEL|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[A-Za-z]{2,})'
  THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  UPDATE public.replay_question_candidates SET state='editorial_review',privacy_reviewer=actor,
    privacy_reviewed_at=now(),privacy_checklist_version=p_checklist WHERE id=q.id;
  PERFORM public.replay_questions_event('question_candidate',q.id,'privacy_review','editorial_review',q.content_sha256,
    actor,'privacy_approved',p_reason,p_checklist);
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_editorial_approve(
  p_candidate_id uuid,p_actor text,p_reason text,p_checklist text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE q public.replay_question_candidates%ROWTYPE; actor text;
BEGIN
  actor:=public.replay_questions_actor(p_actor); PERFORM public.replay_questions_required(p_reason); PERFORM public.replay_questions_required(p_checklist);
  q:=public.replay_questions_assert_binding(p_candidate_id,'editorial_review');
  IF q.origin<>'human_curated' OR q.privacy_reviewer IS NULL OR actor=q.privacy_reviewer THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  UPDATE public.replay_question_candidates SET state='seek_verification',editorial_reviewer=actor,
    editorial_reviewed_at=now(),editorial_checklist_version=p_checklist WHERE id=q.id;
  PERFORM public.replay_questions_event('question_candidate',q.id,'editorial_review','seek_verification',q.content_sha256,
    actor,'editorial_approved',p_reason,p_checklist);
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_seek_approve(
  p_candidate_id uuid,p_actor text,p_reason text,p_checklist text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE q public.replay_question_candidates%ROWTYPE; actor text; m public.replay_media_migration_attempts%ROWTYPE;
BEGIN
  actor:=public.replay_questions_actor(p_actor); PERFORM public.replay_questions_required(p_reason); PERFORM public.replay_questions_required(p_checklist);
  q:=public.replay_questions_assert_binding(p_candidate_id,'seek_verification');
  SELECT * INTO m FROM public.replay_media_migration_attempts WHERE id=q.playback_attempt_id;
  IF NOT m.sample_seek_ok OR q.answer_start_ms>m.duration_ms OR q.answer_end_ms>m.duration_ms THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  UPDATE public.replay_question_candidates SET state='approved',seek_reviewer=actor,
    seek_reviewed_at=now(),seek_checklist_version=p_checklist WHERE id=q.id;
  PERFORM public.replay_questions_event('question_candidate',q.id,'seek_verification','approved',q.content_sha256,
    actor,'seek_approved',p_reason,p_checklist);
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_make_answer_ready(
  p_candidate_id uuid,p_member_question text,p_safe_answer_summary text,p_safe_excerpt text,
  p_answerer_attribution text,p_visibility_scope text,p_actor text,p_reason text,p_checklist text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE q public.replay_question_candidates%ROWTYPE; cid uuid; aid uuid; actor text; safe_all text;
BEGIN
  actor:=public.replay_questions_actor(p_actor); PERFORM public.replay_questions_required(p_reason); PERFORM public.replay_questions_required(p_checklist);
  q:=public.replay_questions_assert_binding(p_candidate_id,'approved');
  IF q.origin<>'human_curated' OR q.privacy_reviewer IS NULL OR q.editorial_reviewer IS NULL OR q.seek_reviewer IS NULL
    OR q.privacy_reviewer=q.editorial_reviewer THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  safe_all:=concat_ws(' ',p_member_question,p_safe_answer_summary,p_safe_excerpt,p_answerer_attribution);
  IF safe_all ~* '(PRIVATE_SENTINEL|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[A-Za-z]{2,})' THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  INSERT INTO public.replay_question_clusters(normalized_question_member_safe,editorial_status)
    VALUES(public.replay_questions_required(p_member_question),'approved') RETURNING id INTO cid;
  INSERT INTO public.replay_answers(
    question_cluster_id,question_candidate_id,resource_id,transcript_version_id,playback_attempt_id,
    question_start_ms,answer_start_ms,answer_end_ms,member_question,safe_answer_summary,safe_excerpt,
    answerer_attribution,visibility_scope,privacy_approval,editorial_approval,seek_approval,
    privacy_reviewer,editorial_reviewer,seek_reviewer,privacy_reviewed_at,editorial_reviewed_at,seek_reviewed_at,
    publication_state,review_version,transcript_snapshot_sha256,media_snapshot_sha256
  ) VALUES (
    cid,q.id,q.resource_id,q.transcript_version_id,q.playback_attempt_id,q.question_start_ms,q.answer_start_ms,q.answer_end_ms,
    public.replay_questions_required(p_member_question),public.replay_questions_required(p_safe_answer_summary),nullif(btrim(p_safe_excerpt),''),
    public.replay_questions_required(p_answerer_attribution),public.replay_questions_required(p_visibility_scope),
    'approved','approved','approved',q.privacy_reviewer,q.editorial_reviewer,q.seek_reviewer,
    q.privacy_reviewed_at,q.editorial_reviewed_at,q.seek_reviewed_at,'READY',p_checklist,
    q.transcript_snapshot_sha256,q.media_snapshot_sha256
  ) RETURNING id INTO aid;
  UPDATE public.replay_answers SET content_sha256=public.replay_questions_answer_hash(aid) WHERE id=aid;
  UPDATE public.replay_question_clusters SET canonical_answer_id=aid WHERE id=cid;
  PERFORM public.replay_questions_event('answer',aid,'approved_candidate','answer_ready',
    public.replay_questions_answer_hash(aid),actor,'answer_ready',p_reason,p_checklist);
  RETURN aid;
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_assert_answer(p_answer_id uuid,p_expected_state text)
RETURNS public.replay_answers LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE a public.replay_answers%ROWTYPE; q public.replay_question_candidates%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.replay_answers WHERE id=p_answer_id FOR UPDATE;
  IF NOT FOUND OR a.publication_state<>p_expected_state OR public.replay_questions_answer_hash(a.id)<>a.content_sha256 THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  q:=public.replay_questions_assert_binding(a.question_candidate_id,'approved');
  IF q.origin<>'human_curated' OR a.resource_id<>q.resource_id OR a.transcript_version_id<>q.transcript_version_id
    OR a.playback_attempt_id<>q.playback_attempt_id OR a.transcript_snapshot_sha256<>q.transcript_snapshot_sha256
    OR a.media_snapshot_sha256<>q.media_snapshot_sha256 OR a.question_start_ms<>q.question_start_ms
    OR a.answer_start_ms<>q.answer_start_ms OR a.answer_end_ms<>q.answer_end_ms
    OR a.privacy_approval<>'approved' OR a.editorial_approval<>'approved' OR a.seek_approval<>'approved'
    OR a.privacy_reviewer=a.editorial_reviewer
  THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  RETURN a;
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_publish(
  p_answer_id uuid,p_actor text,p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE a public.replay_answers%ROWTYPE; actor text;
BEGIN
  actor:=public.replay_questions_actor(p_actor); PERFORM public.replay_questions_required(p_reason);
  a:=public.replay_questions_assert_answer(p_answer_id,'READY');
  IF NOT coalesce((SELECT publication_enabled FROM public.replay_question_publication_controls WHERE singleton),false)
    OR NOT EXISTS (SELECT 1 FROM public.replay_published_resource_projection r WHERE r.id=a.resource_id
      AND r.transcript_version_id=a.transcript_version_id AND r.playback_attempt_id=a.playback_attempt_id)
  THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  UPDATE public.replay_answers SET publication_state='PUBLISHED',published_at=now(),publication_reason=p_reason WHERE id=a.id;
  PERFORM public.replay_questions_event('answer',a.id,'answer_ready','published',a.content_sha256,
    actor,'published',p_reason,'questions-publication-r1');
END
$$;

CREATE OR REPLACE FUNCTION public.replay_questions_revoke(
  p_answer_id uuid,p_actor text,p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE a public.replay_answers%ROWTYPE; actor text;
BEGIN
  actor:=public.replay_questions_actor(p_actor); PERFORM public.replay_questions_required(p_reason);
  SELECT * INTO a FROM public.replay_answers WHERE id=p_answer_id FOR UPDATE;
  IF NOT FOUND OR a.publication_state<>'PUBLISHED' OR a.published_at IS NULL OR a.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'question workflow denied'; END IF;
  UPDATE public.replay_answers SET publication_state='REVOKED',revoked_at=now(),revoked_by=actor,revocation_reason=p_reason WHERE id=a.id;
  PERFORM public.replay_questions_event('answer',a.id,'published','revoked',a.content_sha256,
    actor,'revoked',p_reason,'questions-revocation-r1');
END
$$;

CREATE OR REPLACE VIEW public.replay_published_answers_projection WITH (security_invoker=false) AS
SELECT a.id,a.question_cluster_id,a.resource_id,a.member_question,a.safe_answer_summary,a.safe_excerpt,
  a.answerer_attribution,a.situation_context_safe,a.question_start_ms,a.answer_start_ms,a.answer_end_ms,
  a.visibility_scope,a.is_best_answer,a.related_answer_rank
FROM public.replay_answers a
JOIN public.replay_question_candidates q ON q.id=a.question_candidate_id
JOIN public.replay_published_resource_projection r ON r.id=a.resource_id
  AND r.transcript_version_id=a.transcript_version_id AND r.playback_attempt_id=a.playback_attempt_id
WHERE a.publication_state='PUBLISHED' AND a.published_at IS NOT NULL AND a.revoked_at IS NULL
  AND q.state='approved' AND q.origin='human_curated' AND q.source_privacy_flag='clear'
  AND q.content_sha256=public.replay_questions_candidate_hash(q.id)
  AND a.content_sha256=public.replay_questions_answer_hash(a.id)
  AND a.transcript_snapshot_sha256=r.transcript_sha256
  AND q.transcript_snapshot_sha256=r.transcript_sha256
  AND a.privacy_approval='approved' AND a.editorial_approval='approved' AND a.seek_approval='approved'
  AND a.privacy_reviewer IS NOT NULL AND a.editorial_reviewer IS NOT NULL AND a.seek_reviewer IS NOT NULL
  AND a.privacy_reviewer<>a.editorial_reviewer
  AND coalesce(q.raw_excerpt_private,'')!~*'PRIVATE_SENTINEL'
  AND q.proposed_question_private!~*'PRIVATE_SENTINEL'
  AND a.member_question!~*'PRIVATE_SENTINEL' AND a.safe_answer_summary!~*'PRIVATE_SENTINEL'
  AND coalesce(a.safe_excerpt,'')!~*'PRIVATE_SENTINEL';

DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'replay_questions_%'
  LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f); END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION
  public.replay_questions_create_candidate(uuid,integer,bigint,bigint,bigint,text,text),
  public.replay_questions_promote_candidate(uuid,text,text,text),
  public.replay_questions_privacy_approve(uuid,text,text,text),
  public.replay_questions_editorial_approve(uuid,text,text,text),
  public.replay_questions_seek_approve(uuid,text,text,text),
  public.replay_questions_make_answer_ready(uuid,text,text,text,text,text,text,text,text),
  public.replay_questions_publish(uuid,text,text),
  public.replay_questions_revoke(uuid,text,text)
TO service_role;

REVOKE ALL ON public.replay_published_answers_projection FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.replay_published_answers_projection TO service_role;

COMMENT ON TABLE public.replay_question_publication_controls IS 'Questions publication kill switch; defaults false and is not client-accessible.';
COMMENT ON VIEW public.replay_published_answers_projection IS 'Member-safe projection only; excludes raw proposals, sensitivity findings, review reasons, and denial counts.';
