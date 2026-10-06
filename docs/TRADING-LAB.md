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


## Binance connection

Emma supports Binance Spot through the local bridge. The connection is fail-closed and defaults to Spot Testnet.

Local environment variables (never commit them):
- BINANCE_ENV=testnet
- BINANCE_API_KEY=<testnet API key>
- BINANCE_API_SECRET=<testnet API secret>
- BINANCE_TRADING_ENABLED=false
- TRADING_MODE=paper
- LIVE_TRADING_ENABLED=false

For production:
- BINANCE_ENV=live
- BINANCE_API_KEY=<dedicated production key>
- BINANCE_API_SECRET=<secret>
- BINANCE_TRADING_ENABLED=true
- TRADING_MODE=live
- LIVE_TRADING_ENABLED=true

Production keys must be dedicated to Emma and restricted to the minimum permissions needed. Binance requires authenticated endpoints to use an API key and signature; the official documentation explicitly warns not to share API keys/secrets. The Spot Testnet uses `https://testnet.binance.vision`. Never put credentials in the frontend, GitHub, Supabase public config, chat, or source control.

Recommended activation sequence:
1. Connect Spot Testnet credentials.
2. Verify `binance/status` and account authentication.
3. Validate exchange symbol rules.
4. Run test orders against `/api/v3/order/test`.
5. Run paper trading and risk validation.
6. Only after the strategy survives backtest + significance + Monte Carlo + walk-forward + paper, consider production credentials.
