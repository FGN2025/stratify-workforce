
CREATE OR REPLACE FUNCTION public.validate_content_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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

REVOKE SELECT (primary_contact_email, primary_contact_phone, primary_contact_name, legal_name, dba)
  ON public.tenants FROM anon;
REVOKE SELECT (primary_contact_email, primary_contact_phone, primary_contact_name, legal_name, dba)
  ON public.tenants FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_tenant_admin_details(p_tenant_id uuid)
RETURNS TABLE(
  legal_name text,
  dba text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.legal_name, t.dba, t.primary_contact_name,
         t.primary_contact_email, t.primary_contact_phone
  FROM public.tenants t
  WHERE t.id = p_tenant_id
    AND (
      public.is_tenant_admin(auth.uid(), t.id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_tenant_admin_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_admin_details(uuid) TO authenticated;

REVOKE SELECT (correct, why) ON public.simulation_items FROM anon;
REVOKE SELECT (correct, why) ON public.simulation_items FROM authenticated;

REVOKE SELECT (facts, cats, config) ON public.simulations FROM anon;
REVOKE SELECT (facts, cats, config) ON public.simulations FROM authenticated;

DROP POLICY IF EXISTS "Users can upload own evidence to private bucket" ON storage.objects;
CREATE POLICY "Users can upload own evidence to private bucket"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own private evidence" ON storage.objects;
CREATE POLICY "Users read own private evidence"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );

DROP POLICY IF EXISTS "Users delete own private evidence" ON storage.objects;
CREATE POLICY "Users delete own private evidence"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
