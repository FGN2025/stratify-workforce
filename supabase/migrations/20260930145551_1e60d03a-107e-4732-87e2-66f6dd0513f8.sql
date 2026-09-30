CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text,
  kind text NOT NULL DEFAULT 'vertical',
  canonical_url text,
  legacy_urls text[] NOT NULL DEFAULT '{}',
  tagline text,
  logo_url text,
  accent_color text,
  availability text NOT NULL DEFAULT 'coming_soon',
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_academy_program boolean NOT NULL DEFAULT true,
  owner_contact text,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programs_kind_chk CHECK (kind IN ('game','trade','industry','vertical','competition_source')),
  CONSTRAINT programs_avail_chk CHECK (availability IN ('live','preview','coming_soon','hidden'))
);
GRANT SELECT ON public.programs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible programs readable" ON public.programs FOR SELECT TO anon, authenticated
  USING (availability IN ('live','preview','coming_soon') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Platform admins manage programs" ON public.programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.program_games (
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  game_title public.game_title NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, game_title)
);
GRANT SELECT ON public.program_games TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.program_games TO authenticated;
GRANT ALL ON public.program_games TO service_role;
ALTER TABLE public.program_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Program games readable" ON public.program_games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform admins manage program games" ON public.program_games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.program_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  label text,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_pathways_one_target CHECK ((course_id IS NOT NULL)::int + (work_order_id IS NOT NULL)::int = 1)
);
GRANT SELECT ON public.program_pathways TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.program_pathways TO authenticated;
GRANT ALL ON public.program_pathways TO service_role;
ALTER TABLE public.program_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Program pathways readable" ON public.program_pathways FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform admins manage program pathways" ON public.program_pathways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.tenant_program_offerings (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  schedule_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_program_offerings TO authenticated;
GRANT ALL ON public.tenant_program_offerings TO service_role;
ALTER TABLE public.tenant_program_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offerings readable by signed-in users" ON public.tenant_program_offerings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tenant or platform admins manage offerings" ON public.tenant_program_offerings FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER tpo_updated_at BEFORE UPDATE ON public.tenant_program_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();