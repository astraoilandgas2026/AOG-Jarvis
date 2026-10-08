-- Emma authorization gate + legacy RLS cleanup + FK indexes
-- Applied to project dhswxxathvzzlybxukat on 2026-10-08.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'emma_authorization_gate', r.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
       USING (app_security.emma_is_authorized())
       WITH CHECK (app_security.emma_is_authorized())',
      'emma_authorization_gate', r.table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND (
        policyname LIKE 'auth_%'
        OR policyname IN (
          'intelligence_facts_authenticated_all',
          'procurement_domains_authenticated_all',
          'emma graph edges read authenticated',
          'emma graph read authenticated',
          'jarvis_global_context_select'
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx
  ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS commercial_offers_product_id_idx
  ON public.commercial_offers(product_id);
CREATE INDEX IF NOT EXISTS documents_product_id_idx
  ON public.documents(product_id);
CREATE INDEX IF NOT EXISTS documents_dd_item_id_idx
  ON public.documents(dd_item_id);
CREATE INDEX IF NOT EXISTS emma_money_outcomes_opportunity_id_idx
  ON public.emma_money_outcomes(opportunity_id);
CREATE INDEX IF NOT EXISTS emma_money_outcomes_strategy_experiment_id_idx
  ON public.emma_money_outcomes(strategy_experiment_id);
CREATE INDEX IF NOT EXISTS emma_strategy_experiments_opportunity_id_idx
  ON public.emma_strategy_experiments(opportunity_id);
CREATE INDEX IF NOT EXISTS emma_trading_signals_run_id_idx
  ON public.emma_trading_signals(run_id);
