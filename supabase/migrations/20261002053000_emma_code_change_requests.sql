create table if not exists public.emma_code_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_text text not null,
  repository text not null default 'astraoilandgas2026/AOG-Jarvis',
  base_branch text not null default 'main',
  target_branch text,
  requested_files jsonb not null default '[]'::jsonb,
  validation_plan jsonb not null default '[]'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','approved','executing','tested','merged','rolled_back','rejected','failed')),
  base_sha text,
  head_sha text,
  rollback_sha text,
  test_result jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists emma_code_change_requests_user_created_idx on public.emma_code_change_requests(user_id,created_at desc);
create index if not exists emma_code_change_requests_status_idx on public.emma_code_change_requests(status,updated_at desc);
alter table public.emma_code_change_requests enable row level security;
revoke all on public.emma_code_change_requests from anon;
grant select,insert,update,delete on public.emma_code_change_requests to authenticated;
drop policy if exists emma_code_change_requests_owner on public.emma_code_change_requests;
create policy emma_code_change_requests_owner on public.emma_code_change_requests for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
