create extension if not exists pgcrypto;

create or replace function public.set_scorm_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.scorm_launch_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  challenge_id uuid not null,
  scorm_student_id text not null,
  scorm_student_name text,
  scorm_session_id text,
  status text not null default 'pending'
    check (status in ('pending', 'launched', 'completed', 'failed', 'expired')),
  preliminary_score integer,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scorm_launch_tokens_token_idx on public.scorm_launch_tokens (token);
create index scorm_launch_tokens_status_idx on public.scorm_launch_tokens (status);
create index scorm_launch_tokens_correlation_idx
  on public.scorm_launch_tokens (scorm_student_id, challenge_id);
create index scorm_launch_tokens_expires_at_idx on public.scorm_launch_tokens (expires_at);

create trigger scorm_launch_tokens_updated_at
  before update on public.scorm_launch_tokens
  for each row execute function public.set_scorm_updated_at();

alter table public.scorm_launch_tokens enable row level security;

create policy "scorm_launch_tokens deny all client reads"
  on public.scorm_launch_tokens for select
  to authenticated using (false);

create policy "scorm_launch_tokens deny all client writes"
  on public.scorm_launch_tokens for all
  to authenticated using (false) with check (false);

create or replace function public.purge_expired_scorm_launch_tokens()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.scorm_launch_tokens
  where expires_at < now()
    and status in ('pending', 'launched', 'expired');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.provision_fgn_scorm_toolkit_app()
returns text
language plpgsql
security definer
set search_path = public
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

  v_key := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_key, 'sha256'), 'hex');

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

comment on function public.provision_fgn_scorm_toolkit_app() is
  'One-shot provisioning. Returns the plaintext API key — capture immediately and store as FGN_ACADEMY_APP_KEY in the toolkit env. Only the sha256 hash is persisted.';