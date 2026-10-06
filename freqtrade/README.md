# Emma + Freqtrade

Local trading engine. Default is dry-run with a $20 simulated wallet.

1. Copy the local environment template to .env.
2. Put Binance credentials only in that local .env.
3. Run: docker compose --env-file .env up -d
4. Emma connects with FREQTRADE_URL=http://127.0.0.1:8080

Safety: dry_run=true, initial_state=stopped, max_open_trades=1, 10% available-balance ceiling at the engine layer; Emma's upstream risk gate remains capped at 5% exposure and $1 max order, spot only, no leverage, no withdrawals. Emma's kill switch and risk gate remain upstream.

Do not commit .env or secrets.


## Current status
The engine is intentionally stopped by default. `start`/`pause`/`stop` are local lifecycle controls exposed to Emma; they do not enable live trading. Freqtrade dry-run persists simulated trades in `tradesv3.dryrun.sqlite`.
