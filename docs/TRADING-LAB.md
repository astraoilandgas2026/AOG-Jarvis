# Emma Trading Lab
The trading layer is intentionally fail-closed.

Pipeline:
MARKET DATA -> VALIDATION -> OPPORTUNITY SCAN -> MULTI-AGENT RESEARCH -> BACKTEST -> SIGNIFICANCE -> MONTE CARLO -> WALK-FORWARD -> PAPER -> RISK GATE -> LIVE.

Implemented hardening:
- Market candles are validated for count, price validity, timestamp consistency and staleness.
- Risk gate enforces 1x leverage, per-trade risk, exposure, order-notional, open-position, daily-loss and duplicate/stale-data blocks.
- Provider adapters no longer invent generic /backtest or /paper endpoints. Each real action requires an explicit provider URL environment variable.
- Freqtrade health uses /api/v1/ping; its REST API is kept separate from backtesting.
- Live execution is disabled unless LIVE_TRADING_ENABLED=true.
- Research is represented as explicit gates. Jesse is expected to perform backtest, significance, Monte Carlo and walk-forward validation before a strategy can progress.
- PAPER remains the default. No live order is created by an LLM recommendation alone.

Provider configuration:
- JESSE_URL + JESSE_BACKTEST_URL + JESSE_PAPER_URL
- FREQTRADE_URL + FREQTRADE_BACKTEST_URL + FREQTRADE_PAPER_URL + FREQTRADE_LIVE_URL
- OCTOBOT_URL + OCTOBOT_BACKTEST_URL + OCTOBOT_PAPER_URL + OCTOBOT_LIVE_URL
- OMNIROUTE_URL + OMNIROUTE_BACKTEST_URL + OMNIROUTE_PAPER_URL

Jesse's current documentation exposes backtests, significance tests, Monte Carlo and optimization through its workflow/MCP; the adapter therefore refuses to pretend that a generic REST endpoint exists.
