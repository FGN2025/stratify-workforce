
-- has_tenant_role_inherited: parent tenants count for the role check on descendants.
CREATE OR REPLACE FUNCTION public.has_tenant_role_inherited(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role community_membership_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.request_status = 'approved'
      AND cm.role = p_role
      AND (
        cm.tenant_id = p_tenant_id
        OR cm.tenant_id IN (SELECT public.get_parent_tenants(p_tenant_id))
      )
  );
$$;

-- get_accessible_tenants: every tenant the user can administer/act in,
-- including all descendants of tenants they have approved membership in.
CREATE OR REPLACE FUNCTION public.get_accessible_tenants(p_user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH direct AS (
    SELECT cm.tenant_id
    FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.request_status = 'approved'
  )
  SELECT tenant_id FROM direct
  UNION
  SELECT public.get_child_tenants(tenant_id) FROM direct;
$$;

-- Documentation: curation is NOT inherited from parent tenants on purpose.
COMMENT ON FUNCTION public.is_work_order_visible(uuid, uuid) IS
  'Visibility check for work_orders. Curation is evaluated at the user''s ACTIVE tenant only — parent curation lists do NOT cascade to descendants. Each tenant curates its own catalog.';
COMMENT ON FUNCTION public.is_event_visible(uuid, uuid) IS
  'Visibility check for events. Curation is evaluated at the active tenant only; parent curation does NOT cascade.';
COMMENT ON FUNCTION public.is_course_visible(uuid, uuid) IS
  'Visibility check for courses. Curation is evaluated at the active tenant only; parent curation does NOT cascade.';
