create table if not exists public.emma_knowledge_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interaction_id uuid references public.emma_interactions(id) on delete set null,
  subject_node_key text,
  predicate text not null,
  object_text text,
  object_node_key text,
  fact_date date,
  evidence_level text not null default 'user_stated',
  source_type text not null default 'conversation',
  source_ref text,
  confidence numeric(4,3) not null default 0.700 check (confidence >= 0 and confidence <= 1),
  status text not null default 'active' check (status in ('active','superseded','rejected')),
  supersedes_fact_id uuid references public.emma_knowledge_facts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists emma_knowledge_facts_user_created_idx on public.emma_knowledge_facts(user_id,created_at desc);
create index if not exists emma_knowledge_facts_subject_idx on public.emma_knowledge_facts(subject_node_key);
create index if not exists emma_knowledge_facts_predicate_idx on public.emma_knowledge_facts(predicate);
create index if not exists emma_knowledge_facts_status_idx on public.emma_knowledge_facts(user_id,status,updated_at desc);
alter table public.emma_knowledge_facts enable row level security;
revoke all on public.emma_knowledge_facts from anon;
grant select,insert,update,delete on public.emma_knowledge_facts to authenticated;
drop policy if exists emma_knowledge_facts_owner on public.emma_knowledge_facts;
create policy emma_knowledge_facts_owner on public.emma_knowledge_facts for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.emma_research_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('web','file','email','connector','database','conversation')),
  source_ref text not null,
  source_url text,
  title text,
  content_excerpt text,
  retrieved_at timestamptz not null default now(),
  evidence_level text not null default 'documented',
  content_hash text,
  related_entities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists emma_research_sources_user_retrieved_idx on public.emma_research_sources(user_id,retrieved_at desc);
create index if not exists emma_research_sources_hash_idx on public.emma_research_sources(user_id,content_hash);
create index if not exists emma_research_sources_ref_idx on public.emma_research_sources(user_id,source_type,source_ref);
alter table public.emma_research_sources enable row level security;
revoke all on public.emma_research_sources from anon;
grant select,insert,update,delete on public.emma_research_sources to authenticated;
drop policy if exists emma_research_sources_owner on public.emma_research_sources;
create policy emma_research_sources_owner on public.emma_research_sources for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.emma_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  canonical_node_key text not null,
  entity_type text not null,
  alias text not null,
  normalized_alias text not null,
  confidence numeric(4,3) not null default 0.950 check (confidence >= 0 and confidence <= 1),
  source text not null default 'system',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists emma_entity_aliases_unique_idx on public.emma_entity_aliases(coalesce(user_id,'00000000-0000-0000-0000-000000000000'::uuid),normalized_alias,entity_type);
create index if not exists emma_entity_aliases_lookup_idx on public.emma_entity_aliases(user_id,normalized_alias) where active;
create index if not exists emma_entity_aliases_node_idx on public.emma_entity_aliases(canonical_node_key) where active;
alter table public.emma_entity_aliases enable row level security;
revoke all on public.emma_entity_aliases from anon;
grant select,insert,update,delete on public.emma_entity_aliases to authenticated;
drop policy if exists emma_entity_aliases_owner on public.emma_entity_aliases;
create policy emma_entity_aliases_owner on public.emma_entity_aliases for all to authenticated
using (user_id is null or (select auth.uid())=user_id)
with check (user_id is null or (select auth.uid())=user_id);
grant usage on schema public to authenticated;