-- Emma/Jarvis runtime query indexes
create index if not exists jarvis_automations_user_enabled_next_idx
  on public.jarvis_automations (user_id, enabled, next_run_at);

create index if not exists jarvis_tasks_user_status_due_idx
  on public.jarvis_tasks (user_id, status, due_at);

create index if not exists jarvis_provider_events_user_created_idx
  on public.jarvis_provider_events (user_id, created_at desc);
