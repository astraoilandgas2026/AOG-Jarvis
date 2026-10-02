-- Emma knowledge hardening: entity uniqueness, research dedupe, fact lookup, canonical aliases.
create unique index if not exists emma_entity_aliases_global_unique_idx
  on public.emma_entity_aliases(normalized_alias, entity_type)
  where user_id is null and active;

create unique index if not exists emma_entity_aliases_user_unique_idx
  on public.emma_entity_aliases(user_id, normalized_alias, entity_type)
  where user_id is not null and active;

create unique index if not exists emma_research_sources_user_hash_unique_idx
  on public.emma_research_sources(user_id, content_hash)
  where content_hash is not null;

create index if not exists emma_knowledge_facts_active_subject_predicate_idx
  on public.emma_knowledge_facts(user_id, subject_node_key, predicate)
  where status='active';

insert into public.emma_entity_aliases
(user_id,canonical_node_key,entity_type,alias,normalized_alias,confidence,source,active)
values
(null,'supplier:d2af808e-200b-41aa-a783-b5db49ffb319','supplier','Olam','olam',1,'manual_correction',true),
(null,'supplier:d2af808e-200b-41aa-a783-b5db49ffb319','supplier','Holam','holam',0.99,'manual_correction',true),
(null,'supplier:d2af808e-200b-41aa-a783-b5db49ffb319','supplier','Olam Agroindustrial','olam agroindustrial',1,'manual_correction',true),
(null,'supplier:ec906b72-1143-427e-af16-8dc989e448b2','supplier','Renovar','renovar',1,'manual_correction',true),
(null,'supplier:ec906b72-1143-427e-af16-8dc989e448b2','supplier','Renovar Óleos','renovar oleos',1,'manual_correction',true),
(null,'supplier:d6af3a68-61b2-49be-bff5-fdb2b4754ecc','supplier','FL Óleos','fl oleos',1,'manual_correction',true),
(null,'supplier:aabe83e0-6f1c-448d-8c11-97ca9bec7061','supplier','FTA','fta',1,'manual_correction',true),
(null,'supplier:01e7cf2e-5102-4716-892a-cf39960dac74','supplier','OleoTrax','oleotrax',1,'manual_correction',true)
on conflict do nothing;

update public.emma_graph_nodes
set active=false, updated_at=now()
where node_key='project:green-hop' and active=true;
