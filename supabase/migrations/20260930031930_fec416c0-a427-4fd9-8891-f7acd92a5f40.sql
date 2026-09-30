REVOKE ALL ON FUNCTION public.work_order_publication_issues(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_publication_issues(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.enforce_work_order_publication_readiness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_work_order_publication_readiness() TO service_role;