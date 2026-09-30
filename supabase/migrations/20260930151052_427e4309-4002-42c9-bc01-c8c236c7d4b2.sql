ALTER TYPE public.association_status ADD VALUE IF NOT EXISTS 'needs_practice';

ALTER TABLE public.user_points
  ADD COLUMN IF NOT EXISTS origin_site text NOT NULL DEFAULT 'academy',
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id),
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS award_pathway text NOT NULL DEFAULT 'legacy_completion' CHECK (award_pathway IN ('legacy_completion','evidence_model','redemption','reversal')),
  ADD COLUMN IF NOT EXISTS reverses_entry_id uuid REFERENCES public.user_points(id);

ALTER TABLE public.work_order_tasks
  ADD COLUMN IF NOT EXISTS stage text CHECK (stage IN ('prepare','coached_practice','independent_attempt','evidence','review','next_action'));

ALTER TABLE public.play_outbound_queue
  ADD COLUMN IF NOT EXISTS origin_site text NOT NULL DEFAULT 'academy',
  ADD COLUMN IF NOT EXISTS causation_event_id text;

CREATE TABLE public.program_redemption_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('prize','badge','pathway_step')),
  name text NOT NULL,
  description text,
  cost integer NOT NULL CHECK (cost > 0),
  approval_required boolean NOT NULL DEFAULT true,
  requires_reviewed_evidence boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.program_redemption_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.program_redemption_options TO authenticated;
GRANT ALL ON public.program_redemption_options TO service_role;
ALTER TABLE public.program_redemption_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read active options" ON public.program_redemption_options FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Platform admins manage options" ON public.program_redemption_options FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pro_updated BEFORE UPDATE ON public.program_redemption_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.points_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  option_id uuid NOT NULL REFERENCES public.program_redemption_options(id),
  tenant_id uuid REFERENCES public.tenants(id),
  cost integer NOT NULL CHECK (cost > 0),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','fulfilled','rejected','reversed')),
  ledger_entry_id uuid REFERENCES public.user_points(id),
  decided_by uuid,
  decided_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.points_redemptions TO authenticated;
GRANT ALL ON public.points_redemptions TO service_role;
ALTER TABLE public.points_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners read own redemptions" ON public.points_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Org admins read own org redemptions" ON public.points_redemptions FOR SELECT TO authenticated USING (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Platform admins read all redemptions" ON public.points_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.points_redemptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.program_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  requirement_key text NOT NULL,
  version text NOT NULL,
  requirement_text text NOT NULL,
  sim_supported text,
  external_required text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, requirement_key, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_requirements TO authenticated;
GRANT ALL ON public.program_requirements TO service_role;
ALTER TABLE public.program_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read requirements" ON public.program_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage requirements" ON public.program_requirements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_preq_updated BEFORE UPDATE ON public.program_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Balance view (security invoker: users see own via user_points RLS)
CREATE OR REPLACE VIEW public.user_points_balance WITH (security_invoker = true) AS
SELECT user_id, points_type, sum(amount)::bigint AS balance
FROM public.user_points GROUP BY user_id, points_type;
GRANT SELECT ON public.user_points_balance TO authenticated;