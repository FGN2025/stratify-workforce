CREATE OR REPLACE FUNCTION public.is_approved_member(p_tenant uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant
      AND request_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can view approved members in community" ON public.community_memberships;

CREATE POLICY "Members can view approved members in community"
ON public.community_memberships
FOR SELECT
TO authenticated
USING (
  request_status = 'approved'
  AND public.is_approved_member(tenant_id)
);