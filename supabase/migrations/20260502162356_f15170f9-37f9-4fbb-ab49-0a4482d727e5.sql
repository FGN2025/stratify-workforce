revoke execute on function public.purge_expired_scorm_launch_tokens() from public, anon, authenticated;
revoke execute on function public.provision_fgn_scorm_toolkit_app() from public, anon, authenticated;
grant execute on function public.purge_expired_scorm_launch_tokens() to service_role;
grant execute on function public.provision_fgn_scorm_toolkit_app() to service_role;