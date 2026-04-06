ALTER TABLE public.user_api_keys ADD COLUMN provider text NOT NULL DEFAULT 'openai';

-- Drop existing unique constraint on user_id and add composite one
ALTER TABLE public.user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_key;
ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider);