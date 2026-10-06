# Emma Trading Lab

Integrated roles:
- Freak Trades: strategy/opportunity research reference; no automatic execution.
- Jesse: backtest, optimization and paper/live adapter.
- Darwinia: evolutionary/adversarial strategy research adapter.
- OmniRoute: model routing/fallback layer.
- OpenBook: Solana CLOB/orderbook market source.
- Money Sharks: live multi-agent benchmark only; never copied as an execution strategy.
- NIULAI4: Polymarket trader benchmark/reference only.
- Miula / IA4 / E4 / RealC: retained as external research references; no unverified execution is wired.

Operating modes:
1. PAPER is the default.
2. LIVE requires LIVE_TRADING_ENABLED=true plus an explicitly configured provider.
3. Leverage is hard-coded to 1 in the Emma risk layer.
4. Kill switch blocks execution.
5. Opportunity scoring is market-data analysis, not a profitability guarantee.

Pipeline:
MARKET DATA -> OPPORTUNITY SCAN -> MULTI-AGENT RESEARCH -> BACKTEST -> ADVERSARIAL/WALK-FORWARD CHECK -> PAPER -> RISK GATE -> LIVE ADAPTER.

Emma does not move funds merely because an LLM recommends a trade.
