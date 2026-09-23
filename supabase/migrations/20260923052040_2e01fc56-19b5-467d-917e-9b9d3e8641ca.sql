
-- 1. Catalog scope on authorized apps
ALTER TABLE public.authorized_apps
  ADD COLUMN IF NOT EXISTS can_read_catalog boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS catalog_include_descendants boolean NOT NULL DEFAULT false;

-- 2. Catalog versions
CREATE TABLE IF NOT EXISTS public.catalog_versions (
  source_key text PRIMARY KEY,
  label text NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  last_changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_versions TO authenticated;
GRANT ALL ON public.catalog_versions TO service_role;
ALTER TABLE public.catalog_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_versions readable by authenticated"
  ON public.catalog_versions FOR SELECT TO authenticated USING (true);

INSERT INTO public.catalog_versions (source_key, label) VALUES
  ('skills', 'Canonical skill catalog'),
  ('work_orders', 'Work Order catalog and activity relationships'),
  ('vocabulary', 'Evidence and assessment vocabulary'),
  ('activities', 'FGN.GG simulation activity cache')
ON CONFLICT (source_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bump_catalog_version(p_source text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.catalog_versions (source_key, label, version, last_changed_at)
  VALUES (p_source, p_source, 1, now())
  ON CONFLICT (source_key) DO UPDATE
    SET version = public.catalog_versions.version + 1, last_changed_at = now();
$$;

CREATE OR REPLACE FUNCTION public.trg_bump_skills_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bump_catalog_version('skills'); RETURN NULL; END; $$;

CREATE OR REPLACE FUNCTION public.trg_bump_work_orders_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bump_catalog_version('work_orders'); RETURN NULL; END; $$;

CREATE OR REPLACE FUNCTION public.trg_bump_activities_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bump_catalog_version('activities'); RETURN NULL; END; $$;

DROP TRIGGER IF EXISTS bump_skills_v ON public.canonical_skills;
CREATE TRIGGER bump_skills_v AFTER INSERT OR UPDATE OR DELETE ON public.canonical_skills
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_skills_version();
DROP TRIGGER IF EXISTS bump_skills_alias_v ON public.skill_aliases;
CREATE TRIGGER bump_skills_alias_v AFTER INSERT OR UPDATE OR DELETE ON public.skill_aliases
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_skills_version();

DROP TRIGGER IF EXISTS bump_wo_v ON public.work_orders;
CREATE TRIGGER bump_wo_v AFTER INSERT OR UPDATE OR DELETE ON public.work_orders
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_work_orders_version();
DROP TRIGGER IF EXISTS bump_wo_mat_v ON public.work_order_migration_maturity;
CREATE TRIGGER bump_wo_mat_v AFTER INSERT OR UPDATE OR DELETE ON public.work_order_migration_maturity
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_work_orders_version();
DROP TRIGGER IF EXISTS bump_wo_cur_v ON public.tenant_work_order_curation;
CREATE TRIGGER bump_wo_cur_v AFTER INSERT OR UPDATE OR DELETE ON public.tenant_work_order_curation
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_work_orders_version();
DROP TRIGGER IF EXISTS bump_wo_map_v ON public.task_skill_mappings;
CREATE TRIGGER bump_wo_map_v AFTER INSERT OR UPDATE OR DELETE ON public.task_skill_mappings
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_work_orders_version();
DROP TRIGGER IF EXISTS bump_act_v ON public.simulation_activity_cache;
CREATE TRIGGER bump_act_v AFTER INSERT OR UPDATE OR DELETE ON public.simulation_activity_cache
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_bump_activities_version();

-- 3. Per-record versions
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS record_version bigint NOT NULL DEFAULT 1;
ALTER TABLE public.canonical_skills ADD COLUMN IF NOT EXISTS record_version bigint NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.trg_bump_record_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.record_version := COALESCE(OLD.record_version, 0) + 1; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS bump_wo_record_v ON public.work_orders;
CREATE TRIGGER bump_wo_record_v BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_bump_record_version();
DROP TRIGGER IF EXISTS bump_skill_record_v ON public.canonical_skills;
CREATE TRIGGER bump_skill_record_v BEFORE UPDATE ON public.canonical_skills
  FOR EACH ROW EXECUTE FUNCTION public.trg_bump_record_version();

-- 4. Short-lived Studio tokens
CREATE TABLE IF NOT EXISTS public.studio_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.authorized_apps(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  include_descendants boolean NOT NULL DEFAULT false,
  scopes text[] NOT NULL DEFAULT ARRAY['catalog:read'],
  issued_to text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,
  last_used_at timestamptz,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_tokens_app_idx ON public.studio_tokens(app_id);
CREATE INDEX IF NOT EXISTS studio_tokens_exp_idx ON public.studio_tokens(expires_at);

GRANT SELECT, UPDATE ON public.studio_tokens TO authenticated;
GRANT ALL ON public.studio_tokens TO service_role;
ALTER TABLE public.studio_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read studio tokens" ON public.studio_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins revoke studio tokens" ON public.studio_tokens FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER studio_tokens_touch BEFORE UPDATE ON public.studio_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Rate limit window counters
CREATE TABLE IF NOT EXISTS public.studio_rate_limit (
  token_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (token_hash, window_start)
);
GRANT ALL ON public.studio_rate_limit TO service_role;
ALTER TABLE public.studio_rate_limit ENABLE ROW LEVEL SECURITY;
