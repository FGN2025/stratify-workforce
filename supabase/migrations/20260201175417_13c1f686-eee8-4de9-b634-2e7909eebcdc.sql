-- Create helper function for tenant-scoped profile access
CREATE OR REPLACE FUNCTION public.can_view_profile(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Users can always see their own profile
    viewer_id = profile_id
    OR
    -- Admins can see all profiles
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = viewer_id 
      AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users in the same tenant can see each other
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.tenant_id = p2.tenant_id
      WHERE p1.id = viewer_id AND p2.id = profile_id
      AND p1.tenant_id IS NOT NULL
    )
    OR
    -- Users can see profiles in tenants they're members of (via community_memberships)
    EXISTS (
      SELECT 1 FROM community_memberships cm
      JOIN profiles p ON p.tenant_id = cm.tenant_id
      WHERE cm.user_id = viewer_id AND p.id = profile_id
    )
    OR
    -- Users in parent tenants can see profiles in child tenants
    EXISTS (
      SELECT 1 FROM community_memberships cm
      JOIN profiles p ON p.tenant_id IN (SELECT get_child_tenants(cm.tenant_id))
      WHERE cm.user_id = viewer_id AND p.id = profile_id
    )
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create tenant-scoped SELECT policy for authenticated users only
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), id));