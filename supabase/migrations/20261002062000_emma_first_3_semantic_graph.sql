-- Emma Knowledge Loop: semantic graph edges + performance hardening.
-- Keeps source records as nodes and adds explicit fact/research relations.

create or replace function private.emma_knowledge_graph_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  row_json jsonb;
  v_node_key text;
  item jsonb;
  target_key text;
begin
  row_json := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_node_key := 'record:public.' || tg_table_name || ':' || coalesce(row_json->>'id', md5(row_json::text));

  delete from public.emma_graph_edges
   where properties->>'origin'='knowledge_semantic'
     and (from_node_key=v_node_key or to_node_key=v_node_key);

  if tg_op='DELETE' then
    update public.emma_graph_nodes set active=false, updated_at=now() where node_key=v_node_key;
    return old;
  end if;

  if tg_table_name='emma_knowledge_facts' then
    target_key := nullif(row_json->>'subject_node_key','');
    if target_key is not null and exists(select 1 from public.emma_graph_nodes where node_key=target_key and active) then
      insert into public.emma_graph_edges(from_node_key,to_node_key,relation,properties,evidence_level,active,updated_at)
      values(v_node_key,target_key,'states_about',jsonb_build_object('origin','knowledge_semantic'),coalesce(row_json->>'evidence_level','user_stated'),true,now());
    end if;
    target_key := nullif(row_json->>'object_node_key','');
    if target_key is not null and exists(select 1 from public.emma_graph_nodes where node_key=target_key and active) then
      insert into public.emma_graph_edges(from_node_key,to_node_key,relation,properties,evidence_level,active,updated_at)
      values(v_node_key,target_key,'object',jsonb_build_object('origin','knowledge_semantic'),coalesce(row_json->>'evidence_level','user_stated'),true,now());
    end if;
  elsif tg_table_name='emma_research_sources' then
    for item in select value from jsonb_array_elements(coalesce(row_json->'related_entities','[]'::jsonb))
    loop
      target_key := nullif(item->>'canonical_node_key','');
      if target_key is not null and exists(select 1 from public.emma_graph_nodes where node_key=target_key and active) then
        insert into public.emma_graph_edges(from_node_key,to_node_key,relation,properties,evidence_level,active,updated_at)
        values(v_node_key,target_key,'researches',jsonb_build_object('origin','knowledge_semantic','confidence',item->'confidence'),coalesce(row_json->>'evidence_level','documented'),true,now());
      end if;
    end loop;
  end if;

  return new;
end;
$function$;

revoke all on function private.emma_knowledge_graph_sync() from public;

drop trigger if exists emma_knowledge_semantic_graph on public.emma_knowledge_facts;
create trigger emma_knowledge_semantic_graph
after insert or update or delete on public.emma_knowledge_facts
for each row execute function private.emma_knowledge_graph_sync();

drop trigger if exists emma_research_semantic_graph on public.emma_research_sources;
create trigger emma_research_semantic_graph
after insert or update or delete on public.emma_research_sources
for each row execute function private.emma_knowledge_graph_sync();

drop policy if exists emma_knowledge_facts_owner on public.emma_knowledge_facts;
create policy emma_knowledge_facts_owner on public.emma_knowledge_facts
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

drop policy if exists emma_research_sources_owner on public.emma_research_sources;
create policy emma_research_sources_owner on public.emma_research_sources
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

create index if not exists emma_knowledge_facts_user_subject_predicate_idx
  on public.emma_knowledge_facts(user_id,subject_node_key,predicate,status,updated_at desc);

create index if not exists emma_research_sources_user_hash_idx
  on public.emma_research_sources(user_id,content_hash);

select private.emma_graph_sync_all();
