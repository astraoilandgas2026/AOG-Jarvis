
drop policy if exists emma_interactions_owner on public.emma_interactions;
create policy emma_interactions_owner on public.emma_interactions
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

create index if not exists emma_knowledge_facts_interaction_idx
  on public.emma_knowledge_facts(interaction_id);
create index if not exists emma_knowledge_facts_supersedes_idx
  on public.emma_knowledge_facts(supersedes_fact_id);
