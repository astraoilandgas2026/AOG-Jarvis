create schema if not exists app_security;

create table if not exists public.emma_authorized_users(
  user_id uuid primary key,
  access_role text not null default 'owner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emma_authorized_users enable row level security;
revoke all on table public.emma_authorized_users from anon, authenticated;
drop policy if exists emma_authorized_users_deny on public.emma_authorized_users;
create policy emma_authorized_users_deny on public.emma_authorized_users
  as restrictive for all to authenticated
  using (false) with check (false);

insert into public.emma_authorized_users(user_id,access_role,active,updated_at)
values ('51c4c762-ef6c-4581-9c10-f22647036b49','owner',true,now())
on conflict (user_id) do update set access_role='owner',active=true,updated_at=now();

create or replace function app_security.emma_is_authorized()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.emma_authorized_users u
    where u.user_id = (select auth.uid())
      and u.active = true
  );
$$;
revoke all on function app_security.emma_is_authorized() from public, anon, authenticated;
grant execute on function app_security.emma_is_authorized() to authenticated;

create or replace function public.emma_is_authorized()
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select app_security.emma_is_authorized();
$$;
revoke all on function public.emma_is_authorized() from public, anon;
grant execute on function public.emma_is_authorized() to authenticated;

do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
      and c.relname not in ('emma_authorized_users','audit_logs','jarvis_keepalive','emma_runtime_heartbeats')
  loop
    execute format('alter table public.%I enable row level security',r.relname);
    execute format('revoke all on table public.%I from anon',r.relname);
    execute format('grant select, insert, update, delete on table public.%I to authenticated',r.relname);
    execute format('drop policy if exists emma_authorized_client on public.%I',r.relname);
    execute format('create policy emma_authorized_client on public.%I as restrictive for all to authenticated using (app_security.emma_is_authorized()) with check (app_security.emma_is_authorized())',r.relname);
  end loop;
end $$;

alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from anon, authenticated;
drop policy if exists emma_client_deny on public.audit_logs;
create policy emma_client_deny on public.audit_logs
  as restrictive for all to authenticated using (false) with check (false);

alter table public.jarvis_keepalive enable row level security;
revoke all on table public.jarvis_keepalive from anon, authenticated;
drop policy if exists emma_client_deny on public.jarvis_keepalive;
create policy emma_client_deny on public.jarvis_keepalive
  as restrictive for all to authenticated using (false) with check (false);

alter table public.emma_runtime_heartbeats enable row level security;
revoke all on table public.emma_runtime_heartbeats from anon, authenticated;
grant select on table public.emma_runtime_heartbeats to authenticated;
drop policy if exists "emma heartbeat authenticated read" on public.emma_runtime_heartbeats;
drop policy if exists "emma heartbeat authorized read" on public.emma_runtime_heartbeats;
create policy "emma heartbeat authorized read" on public.emma_runtime_heartbeats
  as restrictive for select to authenticated
  using (app_security.emma_is_authorized());

do $$
declare r record;
begin
  for r in
    select schemaname,tablename,policyname
    from pg_policies
    where schemaname='public'
      and policyname like 'public_anon_%'
  loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

revoke all on table storage.objects from anon;
grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists public_anon_documents_all on storage.objects;
drop policy if exists astra_docs_delete on storage.objects;
drop policy if exists astra_docs_insert on storage.objects;
drop policy if exists astra_docs_select on storage.objects;
drop policy if exists astra_docs_update on storage.objects;
drop policy if exists auth_delete_documents on storage.objects;
drop policy if exists auth_insert_documents on storage.objects;
drop policy if exists auth_read_documents on storage.objects;
drop policy if exists auth_update_documents on storage.objects;
drop policy if exists emma_storage_authorized on storage.objects;

create policy emma_storage_authorized on storage.objects
  as restrictive for all to authenticated
  using (bucket_id in ('astra-docs','documents') and app_security.emma_is_authorized())
  with check (bucket_id in ('astra-docs','documents') and app_security.emma_is_authorized());

create index if not exists emma_authorized_users_active_idx
  on public.emma_authorized_users(active, user_id);