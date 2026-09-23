
REVOKE ALL ON FUNCTION public.requeue_task_on_revision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shadow_signal_strength_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shadow_signal_strength_v2(uuid) TO service_role;
