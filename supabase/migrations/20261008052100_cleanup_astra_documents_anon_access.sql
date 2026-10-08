-- Remove legacy anonymous access left on public.astra_documents after Emma security hardening.
-- This is a cleanup migration only; no new access model is introduced.

drop policy if exists astra_documents_delete on public.astra_documents;
drop policy if exists astra_documents_insert on public.astra_documents;
drop policy if exists astra_documents_select on public.astra_documents;
drop policy if exists astra_documents_update on public.astra_documents;
revoke all on table public.astra_documents from anon;
grant select, insert, update, delete on table public.astra_documents to authenticated;
