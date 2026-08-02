ALTER TABLE public.health_connections
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS token_ciphertext text,
  ADD COLUMN IF NOT EXISTS external_account_id text;