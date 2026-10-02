create table if not exists public.emma_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text,
  role text not null check (role in ('user','assistant')),
  content text not null,
  persistence_class text not null default 'raw' check (persistence_class in ('raw','memory','fact','decision','commitment','research','correction')),
  source text not null default 'conversation',
  evidence_level text not null default 'user_stated',
  related_entities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists emma_interactions_user_created_idx on public.emma_interactions(user_id,created_at desc);
create index if not exists emma_interactions_class_idx on public.emma_interactions(persistence_class,created_at desc);
alter table public.emma_interactions enable row level security;
revoke all on public.emma_interactions from anon;
grant select,insert,update,delete on public.emma_interactions to authenticated;
drop policy if exists emma_interactions_owner on public.emma_interactions;
create policy emma_interactions_owner on public.emma_interactions for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
drop trigger if exists emma_graph_sync_row on public.emma_interactions;
create trigger emma_graph_sync_row after insert or update or delete on public.emma_interactions
for each row execute function private.emma_graph_sync_row();
