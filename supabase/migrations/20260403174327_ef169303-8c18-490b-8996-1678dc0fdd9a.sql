create table public.breakroom_identity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  breakroom_username text not null unique,
  breakroom_user_id integer,
  tenant_id uuid references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_breakroom_identity_username on public.breakroom_identity(breakroom_username);
create index idx_breakroom_identity_user_id on public.breakroom_identity(user_id);

alter table public.breakroom_identity enable row level security;

create policy "Admins manage breakroom identity"
  on public.breakroom_identity
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('super_admin', 'admin')
    )
  );

create policy "Users view own breakroom identity"
  on public.breakroom_identity
  for select
  to authenticated
  using (user_id = auth.uid());