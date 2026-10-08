create table if not exists public.emma_mobile_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.emma_mobile_devices
  add column if not exists device_token_hash text;

create unique index if not exists emma_mobile_devices_token_hash_uq
  on public.emma_mobile_devices(device_token_hash)
  where device_token_hash is not null;

alter table public.emma_mobile_pairings enable row level security;

create or replace function public.emma_claim_mobile_tasks_by_token(
  p_device_token_hash text,
  p_limit integer default 5
) returns setof public.emma_mobile_tasks
language plpgsql
security invoker
set search_path = public
as $$
declare v_device uuid; v_user uuid;
begin
  select id,user_id into v_device,v_user
  from public.emma_mobile_devices
  where device_token_hash=p_device_token_hash and status='online'
  limit 1;
  if v_device is null then raise exception 'DEVICE_AUTH_REQUIRED'; end if;
  return query
  with claimed as (
    select t.id from public.emma_mobile_tasks t
    where t.user_id=v_user and t.status='queued'
      and (t.device_id is null or t.device_id=v_device)
    order by t.created_at
    limit greatest(1,least(coalesce(p_limit,5),20))
    for update skip locked
  )
  update public.emma_mobile_tasks t
  set status='running',device_id=v_device,claimed_at=now()
  from claimed c where t.id=c.id
  returning t.*;
end;
$$;

revoke all on function public.emma_claim_mobile_tasks_by_token(text,integer) from public, anon, authenticated;
grant execute on function public.emma_claim_mobile_tasks_by_token(text,integer) to service_role;

create index if not exists emma_mobile_pairings_user_idx
  on public.emma_mobile_pairings(user_id);
