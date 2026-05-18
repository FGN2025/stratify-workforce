
-- Registry of integrated learning platforms
CREATE TABLE public.learning_sources (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  hmac_secret_env_name text,
  strict_mode boolean NOT NULL DEFAULT false,
  skill_tag_pattern text NOT NULL DEFAULT '^(fiber|osha|cdl|gaming|difficulty):[a-z0-9-]+$',
  ingestion_mode text NOT NULL DEFAULT 'push' CHECK (ingestion_mode IN ('push','pull')),
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage learning sources" ON public.learning_sources
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated read active sources" ON public.learning_sources
  FOR SELECT TO authenticated
  USING (is_active = true);

-- External content mapping: source course/challenge -> Academy work_order/lesson
CREATE TABLE public.external_content_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL REFERENCES public.learning_sources(slug) ON DELETE CASCADE,
  external_id text NOT NULL,
  work_order_id uuid,
  lesson_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_slug, external_id)
);

ALTER TABLE public.external_content_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage external content mappings" ON public.external_content_mappings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated read active mappings" ON public.external_content_mappings
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Identity bridge per source
CREATE TABLE public.learning_source_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL REFERENCES public.learning_sources(slug) ON DELETE CASCADE,
  external_user_id text NOT NULL,
  user_id uuid NOT NULL,
  email text,
  matched_via text NOT NULL DEFAULT 'email' CHECK (matched_via IN ('email','manual','external_id')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE (source_slug, external_user_id)
);

ALTER TABLE public.learning_source_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all source identities" ON public.learning_source_identity
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users read own source identities" ON public.learning_source_identity
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Pull cursor per source
CREATE TABLE public.learning_source_pull_cursor (
  source_slug text PRIMARY KEY REFERENCES public.learning_sources(slug) ON DELETE CASCADE,
  last_completed_at timestamptz,
  last_external_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_source_pull_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read pull cursor" ON public.learning_source_pull_cursor
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Generic sync attempts log (push + pull). Mirrors play_sync_attempts shape.
CREATE TABLE public.learning_source_pull_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL REFERENCES public.learning_sources(slug) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  action text NOT NULL,
  external_attempt_id text,
  status text NOT NULL DEFAULT 'queued',
  request jsonb,
  response jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lsp_attempts_source_created ON public.learning_source_pull_attempts(source_slug, created_at DESC);
CREATE UNIQUE INDEX idx_lsp_attempts_dedupe
  ON public.learning_source_pull_attempts(source_slug, action, external_attempt_id)
  WHERE external_attempt_id IS NOT NULL;

ALTER TABLE public.learning_source_pull_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read source attempts" ON public.learning_source_pull_attempts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Updated-at trigger
CREATE TRIGGER trg_learning_sources_updated_at
  BEFORE UPDATE ON public.learning_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_external_content_mappings_updated_at
  BEFORE UPDATE ON public.external_content_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed registry
INSERT INTO public.learning_sources (slug, display_name, hmac_secret_env_name, strict_mode, skill_tag_pattern, ingestion_mode, is_active)
VALUES
  ('play', 'play.fgn.gg', 'PLAY_WEBHOOK_SECRET', false, '^(fiber|osha|cdl|gaming|difficulty):[a-z0-9-]+$', 'push', true),
  ('bbw',  'Broadband Workforce', 'BBW_WEBHOOK_SECRET', false, '^(fiber|osha|nicet|bicsi|cdl):[a-z0-9-]+$', 'pull', true);

-- Backfill content mappings from existing Play challenge_lesson_mappings
INSERT INTO public.external_content_mappings (source_slug, external_id, lesson_id, is_active, notes, created_by, created_at)
SELECT 'play', play_challenge_id, lesson_id, is_active, notes, created_by, created_at
FROM public.challenge_lesson_mappings
ON CONFLICT (source_slug, external_id) DO NOTHING;
