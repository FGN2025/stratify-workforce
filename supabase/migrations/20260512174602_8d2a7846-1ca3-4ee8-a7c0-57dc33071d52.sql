-- Deep Dive Resource Library

CREATE TABLE public.sim_deep_dive_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  href text NOT NULL,
  cta_label text,
  icon_key text NOT NULL DEFAULT 'graduation-cap',
  accent_color text NOT NULL DEFAULT '#8B5CF6',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sim_category_deep_dive (
  category_id uuid NOT NULL REFERENCES public.sim_categories(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.sim_deep_dive_resources(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, resource_id)
);

CREATE INDEX idx_scdd_category ON public.sim_category_deep_dive(category_id);
CREATE INDEX idx_scdd_resource ON public.sim_category_deep_dive(resource_id);

ALTER TABLE public.sim_deep_dive_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_category_deep_dive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active resources viewable by everyone"
  ON public.sim_deep_dive_resources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins view all resources"
  ON public.sim_deep_dive_resources FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage resources"
  ON public.sim_deep_dive_resources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view category-resource mappings"
  ON public.sim_category_deep_dive FOR SELECT
  USING (true);

CREATE POLICY "Admins manage category-resource mappings"
  ON public.sim_category_deep_dive FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_sim_ddr_updated_at
  BEFORE UPDATE ON public.sim_deep_dive_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed library from existing JSONB on sim_categories
INSERT INTO public.sim_deep_dive_resources (key, title, description, href, cta_label, icon_key, accent_color, display_order)
SELECT DISTINCT ON (r->>'key')
  r->>'key',
  r->>'title',
  COALESCE(r->>'description', ''),
  r->>'href',
  NULLIF(r->>'ctaLabel', ''),
  COALESCE(r->>'iconKey', 'graduation-cap'),
  COALESCE(r->>'accentColor', '#8B5CF6'),
  0
FROM public.sim_categories sc,
     jsonb_array_elements(COALESCE(sc.deep_dive_resources, '[]'::jsonb)) AS r
WHERE r->>'key' IS NOT NULL AND r->>'href' IS NOT NULL
ON CONFLICT (key) DO NOTHING;

-- Build join rows
INSERT INTO public.sim_category_deep_dive (category_id, resource_id, display_order)
SELECT sc.id, ddr.id, COALESCE((rj.ord)::int, 0)
FROM public.sim_categories sc
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sc.deep_dive_resources, '[]'::jsonb)) WITH ORDINALITY AS rj(r, ord)
JOIN public.sim_deep_dive_resources ddr ON ddr.key = rj.r->>'key'
ON CONFLICT DO NOTHING;
