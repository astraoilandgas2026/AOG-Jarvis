-- Emma Knowledge Loop: wire interaction, fact and research records into the persistent graph.
drop trigger if exists emma_graph_sync_row on public.emma_interactions;
create trigger emma_graph_sync_row
after insert or update or delete on public.emma_interactions
for each row execute function private.emma_graph_sync_row();

drop trigger if exists emma_graph_sync_row on public.emma_knowledge_facts;
create trigger emma_graph_sync_row
after insert or update or delete on public.emma_knowledge_facts
for each row execute function private.emma_graph_sync_row();

drop trigger if exists emma_graph_sync_row on public.emma_research_sources;
create trigger emma_graph_sync_row
after insert or update or delete on public.emma_research_sources
for each row execute function private.emma_graph_sync_row();

select private.emma_graph_sync_all();