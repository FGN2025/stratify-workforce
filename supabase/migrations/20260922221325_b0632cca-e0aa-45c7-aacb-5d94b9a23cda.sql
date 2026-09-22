-- Canonical Simulation Activity identity (Phase 1B)
-- FGN.GG owns this identity. Academy stores it, never generates it.
-- Deliberately no foreign key: the referenced entity lives on FGN.GG.

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS simulation_activity_id uuid;

COMMENT ON COLUMN public.work_orders.simulation_activity_id IS
  'Canonical Simulation Activity UUID issued by FGN.GG. Externally owned: never generated, replaced or reinterpreted by Academy. Nullable — Academy-native work orders legitimately have none. No FK by design.';

CREATE INDEX IF NOT EXISTS work_orders_simulation_activity_id_idx
  ON public.work_orders (simulation_activity_id)
  WHERE simulation_activity_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Disposable read-through cache of FGN.GG canonical activities.
-- NOT a source of truth. Fully reconstructable from the FGN.GG ecosystem API.
-- No Academy educational interpretation may live here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.simulation_activity_cache (
  simulation_activity_id uuid PRIMARY KEY,
  canonical_name text,
  canonical_slug text,
  canonical_description text,
  gg_game_id uuid,
  gg_game_name text,
  gg_game_slug text,
  game_version text,
  activity_category text,
  industry_domain text,
  canonical_status text,
  provenance text,
  schema_version integer,
  platform_applicability jsonb,
  source_updated_at timestamptz,
  source_payload jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.simulation_activity_cache IS
  'DISPOSABLE read-through cache of FGN.GG canonical Simulation Activities. FGN.GG is authoritative; this table can be dropped and rebuilt from the ecosystem API at any time. Never edit canonical fields from Academy, and never store Academy educational interpretation here.';

GRANT SELECT ON public.simulation_activity_cache TO authenticated;
GRANT ALL ON public.simulation_activity_cache TO service_role;

ALTER TABLE public.simulation_activity_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read the activity cache"
  ON public.simulation_activity_cache
  FOR SELECT TO authenticated
  USING (true);

-- Writes are service-role only (the sync job); no authenticated write policy.

CREATE TRIGGER simulation_activity_cache_updated_at
  BEFORE UPDATE ON public.simulation_activity_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Reconciliation staging. Proposals only. Never writes to work_orders.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.simulation_activity_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  proposed_simulation_activity_id uuid,
  matched_challenge_id text,
  match_basis text,
  is_deterministic boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'NEEDS_REVIEW',
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  reopened_at timestamptz,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulation_activity_reconciliation_status_chk
    CHECK (status IN ('MATCHED','ACADEMY_NATIVE','NEEDS_REVIEW','LEGACY_SOURCE','ORPHANED_SOURCE','RETIRED')),
  CONSTRAINT simulation_activity_reconciliation_work_order_uniq UNIQUE (work_order_id)
);

COMMENT ON TABLE public.simulation_activity_reconciliation IS
  'Staging/proposal layer for canonical activity mapping. A reconciliation run may only write proposals here; work_orders.simulation_activity_id changes exclusively through explicit admin approval. MATCHED and ACADEMY_NATIVE are healthy resolved states; NEEDS_REVIEW, LEGACY_SOURCE and ORPHANED_SOURCE are genuine exceptions; RETIRED describes lifecycle, not identity failure.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_activity_reconciliation TO authenticated;
GRANT ALL ON public.simulation_activity_reconciliation TO service_role;

ALTER TABLE public.simulation_activity_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read reconciliation proposals"
  ON public.simulation_activity_reconciliation
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can update reconciliation proposals"
  ON public.simulation_activity_reconciliation
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS sim_activity_recon_status_idx
  ON public.simulation_activity_reconciliation (status, resolved);

CREATE TRIGGER simulation_activity_reconciliation_updated_at
  BEFORE UPDATE ON public.simulation_activity_reconciliation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();