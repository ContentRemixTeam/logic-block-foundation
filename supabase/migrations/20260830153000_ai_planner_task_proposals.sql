-- Approval-first task proposals from member-owned Claude/Codex workspaces.
-- A proposal is not a canonical planner task until the member approves it.
CREATE TABLE IF NOT EXISTS public.ai_planner_task_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_key_id UUID NULL REFERENCES public.ai_connection_keys(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 160),
  task_text TEXT NOT NULL CHECK (char_length(task_text) BETWEEN 1 AND 500),
  task_description TEXT NULL CHECK (task_description IS NULL OR char_length(task_description) <= 2000),
  why_this_task TEXT NULL CHECK (why_this_task IS NULL OR char_length(why_this_task) <= 1000),
  done_enough TEXT NULL CHECK (done_enough IS NULL OR char_length(done_enough) <= 1000),
  evidence_target TEXT NULL CHECK (evidence_target IS NULL OR char_length(evidence_target) <= 1000),
  suggested_date DATE NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  source_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_task_id UUID NULL REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

-- Immutable receipts make retries and member review auditable without retaining
-- provider prompts, private documents, or model output.
CREATE TABLE IF NOT EXISTS public.ai_planner_task_proposal_receipts (
  receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.ai_planner_task_proposals(proposal_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  canonical_task_id UUID NULL REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id)
);

CREATE INDEX IF NOT EXISTS ai_planner_task_proposals_user_status_idx
  ON public.ai_planner_task_proposals(user_id, status, created_at DESC);

ALTER TABLE public.ai_planner_task_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_planner_task_proposal_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own AI task proposals"
  ON public.ai_planner_task_proposals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members can view their own AI task proposal receipts"
  ON public.ai_planner_task_proposal_receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER ai_planner_task_proposals_updated_at
  BEFORE UPDATE ON public.ai_planner_task_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.ai_planner_task_proposals IS
  'Pending Claude/Codex task suggestions. These are not Planner tasks until a member explicitly approves them.';

COMMENT ON TABLE public.ai_planner_task_proposal_receipts IS
  'Immutable member decision receipts. No raw prompts, uploaded documents, or provider credentials are stored.';

-- Review is intentionally RPC-only. Members cannot directly mutate proposal
-- state or approved_task_id, and an AI connection key has no auth.uid(), so an
-- external AI cannot approve its own suggestion.
CREATE OR REPLACE FUNCTION public.review_ai_planner_task_proposal(
  p_proposal_id UUID,
  p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_proposal public.ai_planner_task_proposals%ROWTYPE;
  v_task_id UUID;
  v_receipt_id UUID;
  v_notes TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'member authentication required';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected';
  END IF;

  SELECT * INTO v_proposal
  FROM public.ai_planner_task_proposals
  WHERE proposal_id = p_proposal_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal not found';
  END IF;

  -- Idempotent retries return the original durable result.
  IF v_proposal.status = p_decision THEN
    SELECT receipt_id, canonical_task_id INTO v_receipt_id, v_task_id
    FROM public.ai_planner_task_proposal_receipts
    WHERE proposal_id = p_proposal_id;
    RETURN jsonb_build_object(
      'state', v_proposal.status,
      'proposal_id', v_proposal.proposal_id,
      'task_id', v_proposal.approved_task_id,
      'receipt_id', v_receipt_id,
      'idempotent_replay', true
    );
  END IF;

  IF v_proposal.status <> 'pending' THEN
    RAISE EXCEPTION 'proposal was already reviewed';
  END IF;

  IF p_decision = 'approved' THEN
    v_notes := concat_ws(E'\n\n',
      CASE WHEN nullif(btrim(v_proposal.task_description), '') IS NOT NULL THEN v_proposal.task_description END,
      CASE WHEN nullif(btrim(v_proposal.why_this_task), '') IS NOT NULL THEN 'Why: ' || v_proposal.why_this_task END,
      CASE WHEN nullif(btrim(v_proposal.done_enough), '') IS NOT NULL THEN 'Done enough: ' || v_proposal.done_enough END,
      CASE WHEN nullif(btrim(v_proposal.evidence_target), '') IS NOT NULL THEN 'Evidence: ' || v_proposal.evidence_target END
    );

    INSERT INTO public.tasks (
      user_id, task_text, task_description, scheduled_date, priority,
      source, status, notes, context_tags
    ) VALUES (
      v_user_id, v_proposal.task_text, v_proposal.task_description,
      v_proposal.suggested_date, v_proposal.priority,
      'ai_proposal_approved',
      CASE WHEN v_proposal.suggested_date IS NULL THEN 'backlog' ELSE 'scheduled' END,
      nullif(v_notes, ''), ARRAY['ai-proposed', 'member-approved']::TEXT[]
    ) RETURNING task_id INTO v_task_id;
  END IF;

  UPDATE public.ai_planner_task_proposals
  SET status = p_decision,
      approved_task_id = v_task_id,
      reviewed_at = now()
  WHERE proposal_id = p_proposal_id;

  INSERT INTO public.ai_planner_task_proposal_receipts (
    proposal_id, user_id, decision, canonical_task_id
  ) VALUES (
    p_proposal_id, v_user_id, p_decision, v_task_id
  ) RETURNING receipt_id INTO v_receipt_id;

  RETURN jsonb_build_object(
    'state', p_decision,
    'proposal_id', p_proposal_id,
    'task_id', v_task_id,
    'receipt_id', v_receipt_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_ai_planner_task_proposal(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_ai_planner_task_proposal(UUID, TEXT) TO authenticated;
