ALTER TYPE public.assessment_outcome ADD VALUE IF NOT EXISTS 'not_observed';

CREATE OR REPLACE FUNCTION public.get_work_order_visibility_report(p_work_order_id uuid)
RETURNS TABLE(
  tenant_id uuid,
  tenant_name text,
  uses_curation boolean,
  included boolean,
  is_owner boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_visibility text;
  v_super boolean := public.has_role(auth.uid(), 'super_admin'::app_role)
                     OR public.has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT wo.owner_tenant_id, wo.visibility INTO v_owner, v_visibility
  FROM public.work_orders wo WHERE wo.id = p_work_order_id;
  IF v_visibility IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT t.id,
         t.name,
         EXISTS (SELECT 1 FROM public.tenant_work_order_curation c WHERE c.tenant_id = t.id),
         COALESCE((
           SELECT c.included FROM public.tenant_work_order_curation c
           WHERE c.tenant_id = t.id AND c.work_order_id = p_work_order_id
         ), false),
         (t.id = v_owner)
  FROM public.tenants t
  WHERE t.approval_status = 'approved'
    AND (v_super OR public.is_tenant_admin(auth.uid(), t.id))
    AND (v_visibility = 'public' OR t.id = v_owner)
  ORDER BY t.name;
END; $$;

REVOKE ALL ON FUNCTION public.get_work_order_visibility_report(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_work_order_visibility_report(uuid) TO authenticated, service_role;