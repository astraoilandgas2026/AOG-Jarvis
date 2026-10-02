-- Emma Global Knowledge Graph
-- Source of truth remains the existing Astra/Jarvis tables.
-- This graph is a persistent, evidence-aware index for fast cross-domain retrieval.

create table if not exists public.emma_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  node_key text not null unique,
  entity_type text not null,
  label text not null default '',
  properties jsonb not null default '{}'::jsonb,
  source_table text,
  source_id uuid,
  evidence_level text not null default 'claimed',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists emma_graph_nodes_type_idx
  on public.emma_graph_nodes(entity_type);
create index if not exists emma_graph_nodes_source_idx
  on public.emma_graph_nodes(source_table, source_id);
create index if not exists emma_graph_nodes_props_gin
  on public.emma_graph_nodes using gin(properties);

create table if not exists public.emma_graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_node_key text not null references public.emma_graph_nodes(node_key) on delete cascade,
  to_node_key text not null references public.emma_graph_nodes(node_key) on delete cascade,
  relation text not null,
  properties jsonb not null default '{}'::jsonb,
  evidence_level text not null default 'claimed',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(from_node_key, to_node_key, relation)
);

create index if not exists emma_graph_edges_from_idx
  on public.emma_graph_edges(from_node_key);
create index if not exists emma_graph_edges_to_idx
  on public.emma_graph_edges(to_node_key);

alter table public.emma_graph_nodes enable row level security;
alter table public.emma_graph_edges enable row level security;

revoke all on public.emma_graph_nodes from anon;
revoke all on public.emma_graph_edges from anon;
grant select on public.emma_graph_nodes, public.emma_graph_edges to authenticated;

drop policy if exists "emma graph read authenticated" on public.emma_graph_nodes;
create policy "emma graph read authenticated"
  on public.emma_graph_nodes for select
  to authenticated using (true);

drop policy if exists "emma graph edges read authenticated" on public.emma_graph_edges;
create policy "emma graph edges read authenticated"
  on public.emma_graph_edges for select
  to authenticated using (true);
