DELETE FROM public.authorized_apps WHERE app_slug = 'fgn-scorm-toolkit';

DROP TABLE IF EXISTS public._scorm_key_scratch;
CREATE TABLE public._scorm_key_scratch (api_key text);
ALTER TABLE public._scorm_key_scratch ENABLE ROW LEVEL SECURITY;

INSERT INTO public._scorm_key_scratch (api_key)
VALUES (public.provision_fgn_scorm_toolkit_app());

GRANT SELECT ON public._scorm_key_scratch TO anon, authenticated, service_role;
CREATE POLICY "scratch read all" ON public._scorm_key_scratch FOR SELECT USING (true);