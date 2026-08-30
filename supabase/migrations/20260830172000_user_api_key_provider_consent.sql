-- Durable BYOK consent receipt. This records consent metadata only; never key material
-- or member prompt content.
ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS provider_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_consent_version TEXT;

ALTER TABLE public.user_api_keys
  ADD CONSTRAINT user_api_keys_provider_consent_complete
  CHECK (
    (provider_consent_at IS NULL AND provider_consent_version IS NULL)
    OR (provider_consent_at IS NOT NULL AND provider_consent_version IS NOT NULL)
  ) NOT VALID;

COMMENT ON COLUMN public.user_api_keys.provider_consent_at IS
  'When the member opted in to using their key for member-initiated provider requests.';
COMMENT ON COLUMN public.user_api_keys.provider_consent_version IS
  'Version of the plain-language BYOK provider transfer disclosure accepted by the member.';
