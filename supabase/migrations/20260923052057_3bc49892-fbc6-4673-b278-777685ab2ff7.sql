
REVOKE EXECUTE ON FUNCTION public.bump_catalog_version(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bump_skills_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bump_work_orders_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bump_activities_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bump_record_version() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "studio_rate_limit no client access" ON public.studio_rate_limit;
CREATE POLICY "studio_rate_limit no client access"
  ON public.studio_rate_limit FOR SELECT TO authenticated USING (false);
