create or replace function public.provision_fgn_scorm_toolkit_app()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_hash text;
  v_existing uuid;
begin
  select id into v_existing
  from public.authorized_apps
  where app_slug = 'fgn-scorm-toolkit';

  if v_existing is not null then
    raise exception 'fgn-scorm-toolkit is already registered. To rotate, delete the row first: delete from authorized_apps where app_slug = ''fgn-scorm-toolkit'';';
  end if;

  v_key := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_key::bytea, 'sha256'), 'hex');

  insert into public.authorized_apps (
    app_slug,
    app_name,
    api_key_hash,
    can_issue_credentials,
    can_read_credentials,
    credential_types_allowed,
    is_active
  ) values (
    'fgn-scorm-toolkit',
    'FGN SCORM Toolkit',
    v_hash,
    true,
    true,
    array['skill_verification', 'course_completion'],
    true
  );

  return v_key;
end;
$$;

revoke execute on function public.provision_fgn_scorm_toolkit_app() from public, anon, authenticated;
grant execute on function public.provision_fgn_scorm_toolkit_app() to service_role;

DO $$
DECLARE
  v_key text;
BEGIN
  v_key := public.provision_fgn_scorm_toolkit_app();
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'FGN_ACADEMY_APP_KEY=%', v_key;
  RAISE NOTICE '====================================================';
END $$;