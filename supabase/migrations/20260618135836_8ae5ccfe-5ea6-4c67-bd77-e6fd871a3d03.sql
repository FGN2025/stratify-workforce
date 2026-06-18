DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.tenants;
DROP POLICY IF EXISTS "Users can update own pending communities" ON public.tenants;

CREATE POLICY "Admins can create communities"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);