
-- ============================================================
-- simulations
-- ============================================================
CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  wo_code text NOT NULL UNIQUE,
  sim_id_external text,
  title text NOT NULL,
  sim_type text NOT NULL CHECK (sim_type IN ('sequence','loadout')),
  game_prefix text,
  job_type text,
  job_label text,
  blurb text,
  briefing jsonb NOT NULL DEFAULT '[]'::jsonb,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  cats jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  track_key text NOT NULL DEFAULT 'msfs-2024',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.simulations TO authenticated;
GRANT ALL ON public.simulations TO service_role;

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read simulations"
  ON public.simulations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage simulations"
  ON public.simulations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_simulations_work_order_id ON public.simulations(work_order_id);
CREATE INDEX idx_simulations_wo_code ON public.simulations(wo_code);

CREATE TRIGGER simulations_updated_at
  BEFORE UPDATE ON public.simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- simulation_items
-- Answer-key columns (correct, critical, seq, why) are protected via
-- column-level GRANTs: authenticated learners cannot SELECT them at all
-- through PostgREST. Service role (and admins via service-role edge
-- functions in Phase C) read the full row for grading.
-- ============================================================
CREATE TABLE public.simulation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  cat_key text,
  icon text,
  name text NOT NULL,
  sub text,
  display_order int NOT NULL DEFAULT 0,
  -- ANSWER KEY (restricted via column grants)
  correct boolean NOT NULL DEFAULT false,
  critical boolean NOT NULL DEFAULT false,
  seq int,
  why text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(simulation_id, item_key)
);

-- NO table-wide SELECT to authenticated/anon. Only specific columns:
GRANT SELECT (id, simulation_id, item_key, cat_key, icon, name, sub, display_order)
  ON public.simulation_items TO authenticated;

GRANT ALL ON public.simulation_items TO service_role;

ALTER TABLE public.simulation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read simulation items (column-restricted)"
  ON public.simulation_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage simulation items"
  ON public.simulation_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_simulation_items_simulation_id ON public.simulation_items(simulation_id);

CREATE TRIGGER simulation_items_updated_at
  BEFORE UPDATE ON public.simulation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
