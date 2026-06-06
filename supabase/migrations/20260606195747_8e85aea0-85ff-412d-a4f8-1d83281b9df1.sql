
-- pgcrypto for symmetric encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ig_api_key_enc bytea,
  ADD COLUMN IF NOT EXISTS ig_username_enc bytea,
  ADD COLUMN IF NOT EXISTS ig_password_enc bytea,
  ADD COLUMN IF NOT EXISTS ig_account_type text,
  ADD COLUMN IF NOT EXISTS ig_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ig_last_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS ig_account_id text;

-- Encrypt/decrypt helpers. Key is passed per-call from server (service_role)
-- so it never lives on disk or in pg config.
CREATE OR REPLACE FUNCTION public.ig_encrypt(_plain text, _key text)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT pgp_sym_encrypt(_plain, _key);
$$;

CREATE OR REPLACE FUNCTION public.ig_decrypt(_cipher bytea, _key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT pgp_sym_decrypt(_cipher, _key);
$$;

REVOKE ALL ON FUNCTION public.ig_encrypt(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ig_decrypt(bytea, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ig_encrypt(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ig_decrypt(bytea, text) TO service_role;
