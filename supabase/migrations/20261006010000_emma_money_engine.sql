create table if not exists public.emma_money_opportunities (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 domain text not null default 'other',
 title text not null,
 thesis text,
 expected_return_pct numeric,
 win_rate_pct numeric,
 risk_pct numeric,
 capital_required numeric,
 evidence_score numeric default 0,
 effort_score numeric default 0,
 score numeric,
 decision text,
 status text not null default 'candidate',
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.emma_strategy_experiments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 opportunity_id uuid references public.emma_money_opportunities(id) on delete set null,
 symbol text,
 family text,
 thesis text,
 parameters jsonb not null default '{}'::jsonb,
 metrics jsonb not null default '{}'::jsonb,
 gate_result jsonb not null default '{}'::jsonb,
 status text not null default 'proposed',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.emma_money_outcomes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 opportunity_id uuid references public.emma_money_opportunities(id) on delete set null,
 strategy_experiment_id uuid references public.emma_strategy_experiments(id) on delete set null,
 capital numeric,
 pnl numeric default 0,
 return_pct numeric default 0,
 max_drawdown_pct numeric,
 outcome text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.emma_money_opportunities enable row level security;
alter table public.emma_strategy_experiments enable row level security;
alter table public.emma_money_outcomes enable row level security;
create policy emma_money_opportunities_owner on public.emma_money_opportunities for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy emma_strategy_experiments_owner on public.emma_strategy_experiments for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy emma_money_outcomes_owner on public.emma_money_outcomes for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index if not exists emma_money_opp_user_score_idx on public.emma_money_opportunities(user_id,score desc,created_at desc);
create index if not exists emma_strategy_exp_user_created_idx on public.emma_strategy_experiments(user_id,created_at desc);
create index if not exists emma_money_outcomes_user_created_idx on public.emma_money_outcomes(user_id,created_at desc);
