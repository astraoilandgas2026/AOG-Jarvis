create index if not exists emma_entity_aliases_active_lookup_idx
  on public.emma_entity_aliases(normalized_alias,entity_type,active);

create index if not exists emma_knowledge_facts_active_lookup_idx
  on public.emma_knowledge_facts(user_id,subject_node_key,predicate,status,updated_at desc);

create index if not exists emma_research_sources_entity_lookup_idx
  on public.emma_research_sources using gin(related_entities);

alter table public.emma_knowledge_facts enable row level security;
alter table public.emma_research_sources enable row level security;
alter table public.emma_entity_aliases enable row level security;
