-- Make the two-reviewer APPROVED transition usable for hidden admin preview.
-- This does not publish a resource, populate the published projection, or alter
-- launch/publication controls. Member access remains fail-closed.
CREATE OR REPLACE FUNCTION public.replay_approve_resource(rid uuid, actor text, rv text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  a public.replay_publication_authority%ROWTYPE;
BEGIN
  PERFORM public.replay_assert_actor(actor);
  a := public.replay_assert_release_evidence(rid);
  IF a.state <> 'READY' THEN RAISE EXCEPTION 'expected READY'; END IF;
  IF actor = a.ready_reviewer THEN RAISE EXCEPTION 'reviewers must differ'; END IF;
  IF coalesce(btrim(rv), '') = '' THEN RAISE EXCEPTION 'review version required'; END IF;

  UPDATE public.replay_publication_authority
     SET state = 'APPROVED', approval_review_version = rv,
         approval_reviewer = actor, approved_at = now(), updated_at = now()
   WHERE resource_id = rid;

  UPDATE public.mastermind_portal_resources
     SET publication_state = 'publishable',
         privacy_state = 'approved',
         pairing_state = 'paired',
         transcript_state = 'active',
         media_state = 'approved',
         approved_access_scope = coalesce(approved_access_scope, 'replay_vault'),
         editorial_approved_at = now(),
         editorial_approved_by = actor,
         published_at = NULL,
         revoked_at = NULL
   WHERE id = rid;
END;
$$;

REVOKE ALL ON FUNCTION public.replay_approve_resource(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_approve_resource(uuid,text,text) TO service_role;
