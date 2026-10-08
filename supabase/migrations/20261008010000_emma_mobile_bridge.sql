create table if not exists public.emma_mobile_devices (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
device_key text not null, device_name text not null default 'Emma Mobile', platform text not null default 'android',
app_version text not null default 'unknown', capabilities jsonb not null default '[]'::jsonb',
status text not null default 'online' check (status in ('online','offline','blocked')),
last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(),
updated_at timestamptz not null default now(), unique(user_id, device_key));
create index if not exists emma_mobile_devices_user_idx on public.emma_mobile_devices(user_id,last_seen_at desc);
create table if not exists public.emma_mobile_tasks (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
device_id uuid references public.emma_mobile_devices(id) on delete set null, task_type text not null,
payload jsonb not null default '{}'::jsonb, status text not null default 'queued' check(status in ('queued','running','completed','failed','cancelled')),
result jsonb not null default '{}'::jsonb, error text, created_at timestamptz not null default now(), claimed_at timestamptz, completed_at timestamptz);
create index if not exists emma_mobile_tasks_queue_idx on public.emma_mobile_tasks(user_id,status,created_at);
create index if not exists emma_mobile_tasks_device_idx on public.emma_mobile_tasks(device_id,status,created_at);
alter table public.emma_mobile_devices enable row level security; alter table public.emma_mobile_tasks enable row level security;
revoke all on public.emma_mobile_devices from anon; revoke all on public.emma_mobile_tasks from anon;
grant select,insert,update,delete on public.emma_mobile_devices to authenticated; grant select,insert,update on public.emma_mobile_tasks to authenticated;
drop policy if exists emma_mobile_devices_owner on public.emma_mobile_devices;
create policy emma_mobile_devices_owner on public.emma_mobile_devices for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy if exists emma_mobile_tasks_owner on public.emma_mobile_tasks;
create policy emma_mobile_tasks_owner on public.emma_mobile_tasks for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create or replace function public.emma_claim_mobile_tasks(p_device_key text,p_limit integer default 5)
returns setof public.emma_mobile_tasks language plpgsql security definer set search_path=public as $$
declare v_user uuid := auth.uid(); v_device uuid;
begin
if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
select id into v_device from public.emma_mobile_devices where user_id=v_user and device_key=p_device_key and status='online' limit 1;
if v_device is null then raise exception 'DEVICE_NOT_REGISTERED'; end if;
return query with claimed as (
select t.id from public.emma_mobile_tasks t where t.user_id=v_user and t.status='queued' and(t.device_id is null or t.device_id=v_device)
order by t.created_at limit greatest(1,least(coalesce(p_limit,5),20)) for update skip locked)
update public.emma_mobile_tasks t set status='running',device_id=v_device,claimed_at=now() from claimed c where t.id=c.id returning t.*;
end; $$;
revoke all on function public.emma_claim_mobile_tasks(text,integer) from public,anon;
grant execute on function public.emma_claim_mobile_tasks(text,integer) to authenticated;
