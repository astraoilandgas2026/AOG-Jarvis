-- Emma first-three cleanup: RLS init-plan and duplicate indexes.
drop policy if exists emma_interactions_owner on public.emma_interactions;
create policy emma_interactions_owner on public.emma_interactions
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

drop index if exists public.emma_interactions_user_created_idx;
drop index if exists public.emma_knowledge_facts_user_subject_predicate_idx;
drop index if exists public.emma_research_sources_hash_idx;
drop index if exists public.emma_research_sources_user_hash_idx;
drop index if exists public.emma_research_sources_user_hash_unique_idx;
