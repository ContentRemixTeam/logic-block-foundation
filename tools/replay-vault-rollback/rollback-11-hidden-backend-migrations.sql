\set ON_ERROR_STOP on

-- Roll back only the objects introduced by the 11 reviewed hidden-backend
-- migrations. This is intentionally safe only before catalog/member data is
-- loaded. It leaves all pre-existing Planner tables and data in place.
BEGIN;

DO $rollback_guard$
DECLARE
  table_name text;
  row_count bigint;
  allowed_seed_rows jsonb := jsonb_build_object(
    'replay_publication_controls', 1,
    'replay_question_publication_controls', 1,
    'replay_vault_launch_config', 1
  );
BEGIN
  IF to_regclass('public.mastermind_portal_resources') IS NULL
     OR to_regclass('public.cycle_success_path_snapshots') IS NULL
     OR to_regclass('public.replay_vault_launch_config') IS NULL THEN
    RAISE EXCEPTION 'rollback refused: the expected 11-migration stack is incomplete';
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'mastermind_portal_resources','mastermind_portal_source_evidence',
    'mastermind_portal_transcript_segments','mastermind_portal_search_events',
    'cycle_success_path_snapshots','replay_ingestion_runs','replay_source_assets',
    'replay_transcript_versions','replay_transcript_segments','replay_pairing_candidates',
    'replay_media_migration_attempts','replay_question_clusters','replay_question_candidates',
    'replay_answers','replay_editorial_review_events','replay_publication_authority',
    'replay_vault_entitlements','replay_vault_pilot_subjects','replay_vault_playback_events',
    'replay_vault_webhook_events','replay_vault_bookmarks','replay_vault_watch_state',
    'replay_vault_playback_sessions','replay_vault_media_events','replay_vault_note_backlinks',
    'replay_vault_rate_windows','replay_vault_commercial_deliveries',
    'replay_vault_commercial_delivery_attempts','replay_vault_purchase_contributions',
    'replay_vault_purchase_lifecycle_evidence','replay_vault_commercial_quarantine',
    'replay_vault_commercial_resolutions'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO row_count;
      IF row_count > coalesce((allowed_seed_rows ->> table_name)::bigint, 0) THEN
        RAISE EXCEPTION 'rollback refused: public.% contains % non-seed row(s)', table_name, row_count;
      END IF;
    END IF;
  END LOOP;
END
$rollback_guard$;

-- This is the sole mutation made by the stack to a pre-existing Planner table.
ALTER TABLE IF EXISTS public.replay_vault_note_backlinks
  DROP CONSTRAINT IF EXISTS replay_note_same_owner_fk;
ALTER TABLE IF EXISTS public.journal_pages
  DROP CONSTRAINT IF EXISTS journal_pages_id_user_unique;

DROP VIEW IF EXISTS public.replay_published_answers_projection CASCADE;
DROP VIEW IF EXISTS public.replay_published_resource_projection CASCADE;

-- Tables are all new in the inspected production pre-state. CASCADE removes
-- their policies, triggers, indexes, constraints, and dependent routines.
DROP TABLE IF EXISTS
  public.replay_vault_commercial_resolutions,
  public.replay_vault_commercial_quarantine,
  public.replay_vault_purchase_lifecycle_evidence,
  public.replay_vault_purchase_contributions,
  public.replay_vault_commercial_delivery_attempts,
  public.replay_vault_commercial_deliveries,
  public.replay_vault_rate_windows,
  public.replay_vault_media_events,
  public.replay_vault_playback_sessions,
  public.replay_vault_note_backlinks,
  public.replay_vault_watch_state,
  public.replay_vault_bookmarks,
  public.replay_question_publication_controls,
  public.replay_vault_webhook_events,
  public.replay_vault_playback_events,
  public.replay_vault_pilot_subjects,
  public.replay_vault_launch_config,
  public.replay_vault_provider_product_mappings,
  public.replay_vault_entitlements,
  public.replay_publication_authority,
  public.replay_publication_controls,
  public.replay_editorial_review_events,
  public.replay_answers,
  public.replay_question_candidates,
  public.replay_question_clusters,
  public.replay_pairing_candidates,
  public.replay_media_migration_attempts,
  public.replay_transcript_segments,
  public.replay_transcript_versions,
  public.replay_source_assets,
  public.replay_ingestion_runs,
  public.mastermind_portal_search_events,
  public.mastermind_portal_transcript_segments,
  public.mastermind_portal_source_evidence,
  public.mastermind_portal_resources,
  public.cycle_success_path_snapshots
CASCADE;

DROP TYPE IF EXISTS public.replay_vault_target_binding CASCADE;

-- Remove any standalone routines left after dependent-object cascades. Exact
-- names are used so unrelated Planner routines are never selected by prefix.
DO $drop_routines$
DECLARE routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY (ARRAY[
      'search_mastermind_portal_resources','get_mastermind_portal_access_scopes',
      'activate_replay_transcript_version','replay_approve_resource','replay_assert_actor',
      'replay_assert_release_evidence','replay_authority_transition_guard',
      'replay_forbid_generated_question_publish','replay_forbid_immutable_mutation',
      'replay_import_content_package','replay_mark_resource_ready','replay_publish_resource',
      'replay_revoke_resource','replay_transcript_content_hash','apply_replay_vault_webhook_event',
      'record_replay_vault_playback_event','replay_vault_access_decision',
      'replay_vault_enforce_entitlement_transition','replay_vault_ledger_append_only',
      'resolve_replay_vault_playback','search_replay_vault_resources','replay_questions_actor',
      'replay_questions_answer_hash','replay_questions_assert_answer','replay_questions_assert_binding',
      'replay_questions_candidate_hash','replay_questions_create_candidate',
      'replay_questions_editorial_approve','replay_questions_event','replay_questions_excerpt',
      'replay_questions_make_answer_ready','replay_questions_member_safe',
      'replay_questions_privacy_approve','replay_questions_promote_candidate',
      'replay_questions_publish','replay_questions_required','replay_questions_revoke',
      'replay_questions_seek_approve','replay_vault_begin_session','replay_vault_create_note',
      'replay_vault_delete_bookmark_by_id','replay_vault_get_interaction',
      'replay_vault_interaction_binding','replay_vault_rate_limit','replay_vault_record_media_event',
      'replay_vault_set_bookmark','replay_vault_browse_member','replay_vault_categories_member',
      'replay_vault_member_can_read','replay_vault_member_email','replay_vault_questions_member',
      'replay_vault_saved_member','replay_vault_transcript_member',
      'apply_replay_vault_commercial_event_r7','reconcile_replay_vault_unmapped_event_r7',
      'replay_vault_exclusive_end','replay_vault_r7_forbid_mutation',
      'replay_vault_recompute_entitlement_r7'
    ])
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', routine.signature);
  END LOOP;
END
$drop_routines$;

COMMIT;
