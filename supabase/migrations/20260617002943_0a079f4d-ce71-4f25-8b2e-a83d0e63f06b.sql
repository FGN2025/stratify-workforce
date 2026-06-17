
-- ============================================================
-- PR 1: Multi-tenant curation & visibility
-- ============================================================

-- 1. user_active_tenant: tracks which tenant a user is currently "in"
CREATE TABLE public.user_active_tenant (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_tenant TO authenticated;
GRANT ALL ON public.user_active_tenant TO service_role;

ALTER TABLE public.user_active_tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own active tenant"
  ON public.user_active_tenant FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins view all active tenants"
  ON public.user_active_tenant FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER user_active_tenant_updated_at
  BEFORE UPDATE ON public.user_active_tenant
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. visibility + owner_tenant_id on work_orders / events / courses
ALTER TABLE public.work_orders
  ADD COLUMN visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN owner_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN owner_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.courses
  ADD COLUMN visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN owner_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Validation triggers (CHECK can't reference subqueries; using trigger for enum)
CREATE OR REPLACE FUNCTION public.validate_content_visibility()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.visibility NOT IN ('public', 'tenant_private') THEN
    RAISE EXCEPTION 'visibility must be public or tenant_private, got %', NEW.visibility;
  END IF;
  IF NEW.visibility = 'tenant_private' AND NEW.owner_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_private rows require owner_tenant_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER work_orders_validate_visibility
  BEFORE INSERT OR UPDATE OF visibility, owner_tenant_id ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_content_visibility();

CREATE TRIGGER events_validate_visibility
  BEFORE INSERT OR UPDATE OF visibility, owner_tenant_id ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.validate_content_visibility();

CREATE TRIGGER courses_validate_visibility
  BEFORE INSERT OR UPDATE OF visibility, owner_tenant_id ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.validate_content_visibility();

-- Backfill: owner_tenant_id from existing tenant_id; fallback to FGN Global
UPDATE public.work_orders
  SET owner_tenant_id = COALESCE(tenant_id, 'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid)
  WHERE owner_tenant_id IS NULL;

UPDATE public.events
  SET owner_tenant_id = COALESCE(tenant_id, 'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid)
  WHERE owner_tenant_id IS NULL;

UPDATE public.courses
  SET owner_tenant_id = COALESCE(tenant_id, 'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid)
  WHERE owner_tenant_id IS NULL;

CREATE INDEX idx_work_orders_owner_tenant ON public.work_orders(owner_tenant_id);
CREATE INDEX idx_events_owner_tenant ON public.events(owner_tenant_id);
CREATE INDEX idx_courses_owner_tenant ON public.courses(owner_tenant_id);
CREATE INDEX idx_work_orders_visibility ON public.work_orders(visibility);
CREATE INDEX idx_events_visibility ON public.events(visibility);
CREATE INDEX idx_courses_visibility ON public.courses(visibility);

-- 3. Curation tables (one per content type)
CREATE TABLE public.tenant_work_order_curation (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, work_order_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_work_order_curation TO authenticated;
GRANT ALL ON public.tenant_work_order_curation TO service_role;
ALTER TABLE public.tenant_work_order_curation ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tenant_event_curation (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_event_curation TO authenticated;
GRANT ALL ON public.tenant_event_curation TO service_role;
ALTER TABLE public.tenant_event_curation ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tenant_course_curation (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_course_curation TO authenticated;
GRANT ALL ON public.tenant_course_curation TO service_role;
ALTER TABLE public.tenant_course_curation ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_curation_wo_by_wo ON public.tenant_work_order_curation(work_order_id);
CREATE INDEX idx_curation_event_by_event ON public.tenant_event_curation(event_id);
CREATE INDEX idx_curation_course_by_course ON public.tenant_course_curation(course_id);

-- Curation RLS: tenant members read their tenant's list; tenant admins write
CREATE POLICY "Members read own tenant curation (wo)"
  ON public.tenant_work_order_curation FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM community_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.tenant_id = tenant_work_order_curation.tenant_id
        AND cm.request_status = 'approved'
    )
  );

CREATE POLICY "Tenant admins write curation (wo)"
  ON public.tenant_work_order_curation FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_work_order_curation.tenant_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_work_order_curation.tenant_id)
  );

CREATE POLICY "Members read own tenant curation (event)"
  ON public.tenant_event_curation FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM community_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.tenant_id = tenant_event_curation.tenant_id
        AND cm.request_status = 'approved'
    )
  );

CREATE POLICY "Tenant admins write curation (event)"
  ON public.tenant_event_curation FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_event_curation.tenant_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_event_curation.tenant_id)
  );

CREATE POLICY "Members read own tenant curation (course)"
  ON public.tenant_course_curation FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM community_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.tenant_id = tenant_course_curation.tenant_id
        AND cm.request_status = 'approved'
    )
  );

CREATE POLICY "Tenant admins write curation (course)"
  ON public.tenant_course_curation FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_course_curation.tenant_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_course_curation.tenant_id)
  );

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.tenant_curation_enforced()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT true
$$;

COMMENT ON FUNCTION public.tenant_curation_enforced() IS
  'Kill-switch for the curation visibility model. Change body to SELECT false to revert to old "everyone sees everything" behavior without rolling back the schema.';

-- current_tenant_id: explicit active tenant, else first approved membership, else null
CREATE OR REPLACE FUNCTION public.current_tenant_id(p_user uuid DEFAULT auth.uid())
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM user_active_tenant WHERE user_id = p_user),
    (SELECT tenant_id FROM community_memberships
      WHERE user_id = p_user AND request_status = 'approved'
      ORDER BY joined_at ASC NULLS LAST LIMIT 1)
  );
$$;

-- Visibility functions — one per content type, same logic shape
CREATE OR REPLACE FUNCTION public.is_work_order_visible(p_user uuid, p_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_visibility text;
  v_owner uuid;
  v_active uuid;
BEGIN
  IF NOT public.tenant_curation_enforced() THEN
    RETURN true;
  END IF;

  SELECT visibility, owner_tenant_id INTO v_visibility, v_owner
    FROM public.work_orders WHERE id = p_id;
  IF v_visibility IS NULL THEN RETURN false; END IF;

  IF has_role(p_user, 'super_admin'::app_role) THEN RETURN true; END IF;

  v_active := public.current_tenant_id(p_user);

  IF v_visibility = 'public' THEN
    IF v_active IS NULL THEN RETURN true; END IF;
    -- permissive default: tenant with no curation rows sees full catalog
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_work_order_curation WHERE tenant_id = v_active
    ) THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_work_order_curation
      WHERE tenant_id = v_active AND work_order_id = p_id AND included = true
    );
  END IF;

  -- tenant_private
  IF v_active IS NULL THEN RETURN false; END IF;
  RETURN v_owner = v_active OR v_owner IN (SELECT public.get_parent_tenants(v_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.is_event_visible(p_user uuid, p_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_visibility text;
  v_owner uuid;
  v_active uuid;
BEGIN
  IF NOT public.tenant_curation_enforced() THEN RETURN true; END IF;

  SELECT visibility, owner_tenant_id INTO v_visibility, v_owner
    FROM public.events WHERE id = p_id;
  IF v_visibility IS NULL THEN RETURN false; END IF;

  IF has_role(p_user, 'super_admin'::app_role) THEN RETURN true; END IF;

  v_active := public.current_tenant_id(p_user);

  IF v_visibility = 'public' THEN
    IF v_active IS NULL THEN RETURN true; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_event_curation WHERE tenant_id = v_active
    ) THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_event_curation
      WHERE tenant_id = v_active AND event_id = p_id AND included = true
    );
  END IF;

  IF v_active IS NULL THEN RETURN false; END IF;
  RETURN v_owner = v_active OR v_owner IN (SELECT public.get_parent_tenants(v_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.is_course_visible(p_user uuid, p_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_visibility text;
  v_owner uuid;
  v_active uuid;
BEGIN
  IF NOT public.tenant_curation_enforced() THEN RETURN true; END IF;

  SELECT visibility, owner_tenant_id INTO v_visibility, v_owner
    FROM public.courses WHERE id = p_id;
  IF v_visibility IS NULL THEN RETURN false; END IF;

  IF has_role(p_user, 'super_admin'::app_role) THEN RETURN true; END IF;

  v_active := public.current_tenant_id(p_user);

  IF v_visibility = 'public' THEN
    IF v_active IS NULL THEN RETURN true; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_course_curation WHERE tenant_id = v_active
    ) THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_course_curation
      WHERE tenant_id = v_active AND course_id = p_id AND included = true
    );
  END IF;

  IF v_active IS NULL THEN RETURN false; END IF;
  RETURN v_owner = v_active OR v_owner IN (SELECT public.get_parent_tenants(v_active));
END;
$$;

-- 5. Replace SELECT policies with visibility-fn based ones
DROP POLICY IF EXISTS "Work orders are viewable by everyone" ON public.work_orders;
CREATE POLICY "Work orders visible via curation"
  ON public.work_orders FOR SELECT
  USING (public.is_work_order_visible(auth.uid(), id));

DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Events visible via curation"
  ON public.events FOR SELECT
  USING (
    (status <> 'draft'::event_status AND public.is_event_visible(auth.uid(), id))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;
CREATE POLICY "Courses visible via curation"
  ON public.courses FOR SELECT
  USING (
    (is_published = true AND public.is_course_visible(auth.uid(), id))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Note: the tech_cert_requires_technical_skills_badge policy on courses is left untouched.
-- It is an additional SELECT restriction layered on top; both must pass.
