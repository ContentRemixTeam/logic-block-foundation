CREATE TABLE IF NOT EXISTS public.mastermind_ai_asset_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  unlock_month DATE NOT NULL,
  pack_id TEXT NOT NULL CHECK (pack_id IN (
    'offer-lab',
    'discovery-engine',
    'nurture-desk',
    'sales-room',
    'customer-results-lab',
    'workflow-systems-lab'
  )),
  confirmation_source TEXT NOT NULL DEFAULT 'member_confirmed'
    CHECK (confirmation_source IN ('member_confirmed', 'preview_confirmed')),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, unlock_month)
);

CREATE INDEX IF NOT EXISTS mastermind_ai_asset_unlocks_user_pack_idx
  ON public.mastermind_ai_asset_unlocks(user_id, pack_id, confirmed_at DESC);

ALTER TABLE public.mastermind_ai_asset_unlocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mastermind_ai_asset_unlocks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mastermind_ai_asset_unlocks TO authenticated;
GRANT ALL ON public.mastermind_ai_asset_unlocks TO service_role;

DROP POLICY IF EXISTS "Members can view own AI asset unlocks" ON public.mastermind_ai_asset_unlocks;
CREATE POLICY "Members can view own AI asset unlocks"
  ON public.mastermind_ai_asset_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS mastermind_ai_asset_unlocks_updated_at ON public.mastermind_ai_asset_unlocks;
CREATE TRIGGER mastermind_ai_asset_unlocks_updated_at
  BEFORE UPDATE ON public.mastermind_ai_asset_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.confirm_my_mastermind_ai_asset_unlock(
  p_pack_id TEXT,
  p_cycle_id UUID DEFAULT NULL,
  p_as_of TIMESTAMPTZ DEFAULT clock_timestamp()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(auth.jwt()->>'email', '')));
  v_pack_id TEXT := lower(trim(coalesce(p_pack_id, '')));
  v_unlock_month DATE := date_trunc('month', timezone('America/New_York', p_as_of))::date;
  v_preview_allowed BOOLEAN := false;
  v_mastermind_active BOOLEAN := false;
  v_vault_tier TEXT;
  v_full_library BOOLEAN := false;
  v_row public.mastermind_ai_asset_unlocks%ROWTYPE;
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'member authentication required';
  END IF;

  IF v_pack_id NOT IN (
    'offer-lab',
    'discovery-engine',
    'nurture-desk',
    'sales-room',
    'customer-results-lab',
    'workflow-systems-lab'
  ) THEN
    RAISE EXCEPTION 'invalid AI asset pack';
  END IF;

  IF p_cycle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cycles_90_day
     WHERE cycle_id = p_cycle_id
       AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'cycle not found';
  END IF;

  v_preview_allowed := coalesce(public.replay_vault_admin_preview_enabled(v_user_id, true), false);

  SELECT EXISTS (
    SELECT 1
      FROM public.entitlements e
     WHERE lower(trim(e.email)) = v_email
       AND e.tier = 'mastermind'
       AND e.status = 'active'
       AND (e.starts_at IS NULL OR (e.starts_at::timestamp AT TIME ZONE 'America/New_York') <= p_as_of)
       AND (e.ends_at IS NULL OR public.replay_vault_exclusive_end(e.ends_at) > p_as_of)
  ) INTO v_mastermind_active;

  IF NOT (v_preview_allowed OR v_mastermind_active) THEN
    RAISE EXCEPTION 'mastermind access required';
  END IF;

  SELECT c.entitlement_tier
    INTO v_vault_tier
    FROM public.replay_vault_purchase_contributions c
   WHERE c.normalized_email = v_email
     AND c.contribution_starts_at <= p_as_of
     AND (c.contribution_expires_at IS NULL OR p_as_of < c.contribution_expires_at)
     AND NOT EXISTS (
       SELECT 1
         FROM public.replay_vault_purchase_lifecycle_evidence l
        WHERE l.purchase_contribution_id = c.id
          AND l.lifecycle_type IN ('expiration', 'refund', 'chargeback', 'immediate_revocation')
          AND l.effective_at <= p_as_of
     )
   ORDER BY CASE c.entitlement_tier WHEN 'lifetime' THEN 3 WHEN 'annual' THEN 2 ELSE 1 END DESC,
            c.contribution_starts_at DESC,
            c.created_at DESC,
            c.id DESC
   LIMIT 1;

  v_full_library := v_vault_tier IN ('annual', 'lifetime');
  IF v_full_library THEN
    RETURN jsonb_build_object(
      'confirmed', true,
      'packId', v_pack_id,
      'pack_id', v_pack_id,
      'unlockMonth', v_unlock_month,
      'unlock_month', v_unlock_month,
      'confirmedAt', p_as_of,
      'confirmed_at', p_as_of,
      'alreadyConfirmed', true,
      'already_confirmed', true,
      'conflict', false,
      'consumedMonthlyUnlock', false,
      'consumed_monthly_unlock', false,
      'access', 'full_library'
    );
  END IF;

  INSERT INTO public.mastermind_ai_asset_unlocks(
    user_id,
    cycle_id,
    unlock_month,
    pack_id,
    confirmation_source
  ) VALUES (
    v_user_id,
    p_cycle_id,
    v_unlock_month,
    v_pack_id,
    CASE WHEN v_preview_allowed THEN 'preview_confirmed' ELSE 'member_confirmed' END
  )
  ON CONFLICT (user_id, unlock_month) DO NOTHING
  RETURNING * INTO v_row;

  v_inserted := FOUND;

  IF NOT v_inserted THEN
    SELECT *
      INTO v_row
      FROM public.mastermind_ai_asset_unlocks
     WHERE user_id = v_user_id
       AND unlock_month = v_unlock_month;
  END IF;

  IF v_row.pack_id <> v_pack_id THEN
    RETURN jsonb_build_object(
      'confirmed', false,
      'packId', v_pack_id,
      'pack_id', v_pack_id,
      'currentPackId', v_row.pack_id,
      'current_pack_id', v_row.pack_id,
      'unlockMonth', v_unlock_month,
      'unlock_month', v_unlock_month,
      'confirmedAt', v_row.confirmed_at,
      'confirmed_at', v_row.confirmed_at,
      'alreadyConfirmed', true,
      'already_confirmed', true,
      'conflict', true,
      'consumedMonthlyUnlock', false,
      'consumed_monthly_unlock', false,
      'access', 'monthly'
    );
  END IF;

  RETURN jsonb_build_object(
    'confirmed', true,
    'packId', v_row.pack_id,
    'pack_id', v_row.pack_id,
    'unlockMonth', v_row.unlock_month,
    'unlock_month', v_row.unlock_month,
    'confirmedAt', v_row.confirmed_at,
    'confirmed_at', v_row.confirmed_at,
    'alreadyConfirmed', NOT v_inserted,
    'already_confirmed', NOT v_inserted,
    'conflict', false,
    'consumedMonthlyUnlock', v_inserted,
    'consumed_monthly_unlock', v_inserted,
    'access', 'monthly'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_my_mastermind_ai_asset_unlock(TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_my_mastermind_ai_asset_unlock(TEXT, UUID, TIMESTAMPTZ) TO authenticated;
