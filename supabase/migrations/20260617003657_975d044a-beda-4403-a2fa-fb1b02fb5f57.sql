
DROP POLICY IF EXISTS "Members read own tenant curation (wo)" ON public.tenant_work_order_curation;
DROP POLICY IF EXISTS "Members read own tenant curation (event)" ON public.tenant_event_curation;
DROP POLICY IF EXISTS "Members read own tenant curation (course)" ON public.tenant_course_curation;

CREATE POLICY "Tenant admins read curation (wo)"
  ON public.tenant_work_order_curation FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_work_order_curation.tenant_id)
  );

CREATE POLICY "Tenant admins read curation (event)"
  ON public.tenant_event_curation FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_event_curation.tenant_id)
  );

CREATE POLICY "Tenant admins read curation (course)"
  ON public.tenant_course_curation FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_tenant_admin(auth.uid(), tenant_course_curation.tenant_id)
  );
