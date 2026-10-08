-- Emma runtime/cloud schema synchronization.
-- The worker secret itself remains in Supabase Vault; this migration only references its name.

create table if not exists public.emma_cloud_paper_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash numeric not null default 10000,
  positions jsonb not null default '{}'::jsonb,
  orders jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.emma_cloud_paper_accounts enable row level security;
revoke all on public.emma_cloud_paper_accounts from anon;
grant select,insert,update on public.emma_cloud_paper_accounts to authenticated;
drop policy if exists emma_cloud_paper_owner_select on public.emma_cloud_paper_accounts;
drop policy if exists emma_cloud_paper_owner_insert on public.emma_cloud_paper_accounts;
drop policy if exists emma_cloud_paper_owner_update on public.emma_cloud_paper_accounts;
create policy emma_cloud_paper_owner_select on public.emma_cloud_paper_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy emma_cloud_paper_owner_insert on public.emma_cloud_paper_accounts for insert to authenticated with check ((select auth.uid())=user_id);
create policy emma_cloud_paper_owner_update on public.emma_cloud_paper_accounts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.emma_runtime_heartbeats (
  id boolean primary key default true,
  status text not null default 'healthy',
  version text not null,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.emma_runtime_heartbeats enable row level security;
revoke all on public.emma_runtime_heartbeats from anon;
grant select on public.emma_runtime_heartbeats to authenticated;
drop policy if exists "emma heartbeat authenticated read" on public.emma_runtime_heartbeats;
create policy "emma heartbeat authenticated read" on public.emma_runtime_heartbeats for select to authenticated using (true);

create table if not exists public.emma_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.jarvis_automations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  trigger_type text not null default 'schedule',
  prompt text not null,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.emma_automation_runs enable row level security;
revoke all on public.emma_automation_runs from anon;
grant select on public.emma_automation_runs to authenticated;
drop policy if exists "emma automation runs own select" on public.emma_automation_runs;
create policy "emma automation runs own select" on public.emma_automation_runs for select to authenticated using ((select auth.uid())=user_id);

create index if not exists emma_automation_runs_user_created_idx on public.emma_automation_runs(user_id,created_at desc);
create index if not exists emma_automation_runs_automation_created_idx on public.emma_automation_runs(automation_id,created_at desc);

create or replace function public.claim_due_emma_automations(p_limit integer default 20)
returns table(id uuid,user_id uuid,name text,prompt text,cadence text,automation_cron text)
language plpgsql security definer set search_path=''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  return query
  with due as (
    select a.id
    from public.jarvis_automations a
    where a.enabled=true and (a.next_run_at is null or a.next_run_at<=now())
    order by a.next_run_at nulls first,a.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),50))
  ), claimed as (
    update public.jarvis_automations a
    set last_run_at=now(),
        next_run_at=case a.cadence
          when 'daily' then now()+interval '1 day'
          when 'weekly' then now()+interval '7 days'
          when 'monthly' then now()+interval '1 month'
          else null
        end,
        updated_at=now()
    from due
    where a.id=due.id
    returning a.id as automation_id,a.user_id as automation_user_id,a.name as automation_name,a.prompt as automation_prompt,a.cadence as automation_cadence,a.cron_expression as automation_cron_value
  )
  select c.automation_id,c.automation_user_id,c.automation_name,c.automation_prompt,c.automation_cadence,c.automation_cron_value from claimed c;
end; $$;
revoke all on function public.claim_due_emma_automations(integer) from public,anon,authenticated;
grant execute on function public.claim_due_emma_automations(integer) to service_role;

create or replace function public.emma_scheduler_authorize(provided_key text)
returns boolean
language plpgsql security definer set search_path=''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then return false; end if;
  return provided_key is not null and provided_key=(select decrypted_secret from vault.decrypted_secrets where name='emma_scheduler_key' limit 1);
end; $$;
revoke all on function public.emma_scheduler_authorize(text) from public,anon,authenticated;
grant execute on function public.emma_scheduler_authorize(text) to service_role;

drop policy if exists emma_mobile_pairings_no_client_access on public.emma_mobile_pairings;
create policy emma_mobile_pairings_no_client_access on public.emma_mobile_pairings for all to authenticated using(false) with check(false);

create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$
begin
  if exists(select 1 from cron.job where jobname='emma-cloud-worker') then
    perform cron.unschedule('emma-cloud-worker');
  end if;
  perform cron.schedule(
    'emma-cloud-worker',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://dhswxxathvzzlybxukat.supabase.co/functions/v1/emma-cloud-worker',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'X-Emma-Worker-Secret',(select decrypted_secret from vault.decrypted_secrets where name='emma-cloud-worker-secret')
        ),
        body := '{}'::jsonb
      ) as request_id;
    $job$
  );
end $$;
