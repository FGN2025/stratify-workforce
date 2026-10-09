CREATE TABLE public.disciplines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (key ~ '^[a-z0-9-]+$'),
  name text NOT NULL,
  tagline text,
  description text,
  accent_color text,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','preview','coming_soon','hidden')),
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (key ~ '^[a-z0-9-]+$'),
  name text NOT NULL,
  short_name text,
  tagline text,
  description text,
  launch_type text NOT NULL DEFAULT 'in_academy' CHECK (launch_type IN ('subdomain','external','in_academy')),
  launch_url text,
  in_academy_path text,
  legacy_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','preview','coming_soon','hidden')),
  access_terms text NOT NULL DEFAULT 'open' CHECK (access_terms IN ('open','sign_in','organization_invite')),
  shared_services jsonb NOT NULL DEFAULT '{}'::jsonb,
  accent_color text,
  hero_image_url text,
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.application_disciplines (
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  discipline_id uuid NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (application_id, discipline_id)
);
CREATE TABLE public.program_applications (
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, application_id)
);

GRANT SELECT ON public.disciplines, public.applications, public.application_disciplines, public.program_applications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.disciplines, public.applications, public.application_disciplines, public.program_applications TO authenticated;
GRANT ALL ON public.disciplines, public.applications, public.application_disciplines, public.program_applications TO service_role;

ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in read visible disciplines" ON public.disciplines FOR SELECT TO authenticated
  USING (status <> 'hidden' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Platform admins manage disciplines" ON public.disciplines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Signed-in read visible applications" ON public.applications FOR SELECT TO authenticated
  USING (status <> 'hidden' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Platform admins manage applications" ON public.applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Signed-in read application disciplines" ON public.application_disciplines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage application disciplines" ON public.application_disciplines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Signed-in read program applications" ON public.program_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage program applications" ON public.program_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER disciplines_updated_at BEFORE UPDATE ON public.disciplines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();