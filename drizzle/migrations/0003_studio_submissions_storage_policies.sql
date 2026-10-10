CREATE POLICY "Admins can read studio submission packages"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'studio-submissions'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );