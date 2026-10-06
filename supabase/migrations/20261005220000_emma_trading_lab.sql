create table if not exists public.emma_trading_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  mode text not null default 'paper' check (mode in ('research','backtest','paper','live')),
  symbol text, interval text, status text not null default 'created',
  input jsonb not null default '{}'::jsonb, result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.emma_trading_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.emma_trading_runs(id) on delete set null,
  source text not null, symbol text, interval text, direction text, score numeric,
  signal jsonb not null default '{}'::jsonb, evidence text not null default 'MARKET_DATA_ONLY',
  created_at timestamptz not null default now()
);
create table if not exists public.emma_trading_risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, allowed boolean not null, reasons text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.emma_trading_runs enable row level security;
alter table public.emma_trading_signals enable row level security;
alter table public.emma_trading_risk_events enable row level security;
drop policy if exists emma_trading_runs_owner on public.emma_trading_runs;
create policy emma_trading_runs_owner on public.emma_trading_runs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists emma_trading_signals_owner on public.emma_trading_signals;
create policy emma_trading_signals_owner on public.emma_trading_signals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists emma_trading_risk_owner on public.emma_trading_risk_events;
create policy emma_trading_risk_owner on public.emma_trading_risk_events for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index if not exists emma_trading_runs_user_created_idx on public.emma_trading_runs(user_id,created_at desc);
create index if not exists emma_trading_signals_user_created_idx on public.emma_trading_signals(user_id,created_at desc);
create index if not exists emma_trading_risk_user_created_idx on public.emma_trading_risk_events(user_id,created_at desc);
