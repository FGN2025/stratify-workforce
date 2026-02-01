-- Phase 4: Create helper functions for hierarchy traversal

-- Function to get all child tenants (recursive)
CREATE OR REPLACE FUNCTION public.get_child_tenants(p_tenant_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE children AS (
    SELECT id FROM tenants WHERE parent_tenant_id = p_tenant_id
    UNION ALL
    SELECT t.id FROM tenants t
    INNER JOIN children c ON t.parent_tenant_id = c.id
  )
  SELECT id FROM children;
$$;

-- Function to get all parent tenants (ancestry chain)
CREATE OR REPLACE FUNCTION public.get_parent_tenants(p_tenant_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE parents AS (
    SELECT parent_tenant_id FROM tenants WHERE id = p_tenant_id
    UNION ALL
    SELECT t.parent_tenant_id FROM tenants t
    INNER JOIN parents p ON t.id = p.parent_tenant_id
    WHERE t.parent_tenant_id IS NOT NULL
  )
  SELECT parent_tenant_id FROM parents WHERE parent_tenant_id IS NOT NULL;
$$;

-- Function to check if user has specific role in tenant or parent tenants
CREATE OR REPLACE FUNCTION public.has_tenant_role(
  p_user_id UUID, 
  p_tenant_id UUID, 
  p_role community_membership_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.role = p_role
      AND (
        cm.tenant_id = p_tenant_id
        OR cm.tenant_id IN (SELECT get_parent_tenants(p_tenant_id))
      )
  )
$$;

-- Function to check if user is admin of tenant or any parent tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_user_id UUID, p_tenant_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.role IN ('admin'::community_membership_role, 'owner'::community_membership_role)
      AND (
        cm.tenant_id = p_tenant_id
        OR cm.tenant_id IN (SELECT get_parent_tenants(p_tenant_id))
      )
  )
$$;

-- Phase 5: Add RLS policy for tenant admins to manage child tenants
DROP POLICY IF EXISTS "Tenant admins can manage child tenants" ON public.tenants;

CREATE POLICY "Tenant admins can manage child tenants"
ON public.tenants
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid(), id)
);