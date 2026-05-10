
-- 1. Tenants: add play mapping columns
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS play_tenant_id uuid,
  ADD COLUMN IF NOT EXISTS play_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_play_tenant_id_uniq
  ON public.tenants (play_tenant_id)
  WHERE play_tenant_id IS NOT NULL;

-- 2. play_identity
CREATE TABLE IF NOT EXISTS public.play_identity (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_user_id uuid NOT NULL UNIQUE,
  email text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

ALTER TABLE public.play_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own play identity"
  ON public.play_identity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all play identities"
  ON public.play_identity FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- service role bypasses RLS, no INSERT/UPDATE policy needed

-- 3. play_sync_attempts
DO $$ BEGIN
  CREATE TYPE public.play_sync_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.play_sync_status AS ENUM ('queued', 'completed', 'failed', 'duplicate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.play_sync_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction public.play_sync_direction NOT NULL,
  action text NOT NULL,
  external_attempt_id text,
  status public.play_sync_status NOT NULL DEFAULT 'queued',
  request jsonb,
  response jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS play_sync_attempts_extid_uniq
  ON public.play_sync_attempts (action, external_attempt_id)
  WHERE external_attempt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS play_sync_attempts_created_idx
  ON public.play_sync_attempts (created_at DESC);

ALTER TABLE public.play_sync_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read play sync attempts"
  ON public.play_sync_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. play_poll_cursor
CREATE TABLE IF NOT EXISTS public.play_poll_cursor (
  action text PRIMARY KEY,
  since timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.play_poll_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read play poll cursor"
  ON public.play_poll_cursor FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
