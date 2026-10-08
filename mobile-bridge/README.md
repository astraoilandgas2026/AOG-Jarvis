# Emma Android + Kraken Paper Bridge

This bridge runs locally on Android and exposes only the safe Kraken CLI surfaces Emma needs.

## Safety boundary

- Kraken paper/public commands only.
- No Kraken API keys are required for market data or paper trading.
- Live `order`, withdrawals, funding, and other dangerous surfaces are blocked by the bridge.
- Listens only on `127.0.0.1:43177`.
- Requests require `X-Emma-Token`.
- Browser origins are allowlisted.

## Android setup

Kraken publishes Linux ARM64 GNU binaries, not an Android/Bionic target. Termux uses Android's Bionic runtime, so run the Linux binary inside a Termux PRoot Linux userland.

In Termux:

```sh
pkg update -y
pkg install -y proot-distro nodejs-lts curl
proot-distro install debian
proot-distro login debian
```

Inside Debian:

```sh
apt update
apt install -y curl ca-certificates nodejs npm
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh
kraken status
kraken ticker BTCUSD
```

Then copy this `mobile-bridge` directory into the Debian environment and run:

```sh
export EMMA_BRIDGE_TOKEN='CREATE-A-LONG-RANDOM-TOKEN'
node server.mjs
```

Verify locally:

```sh
curl http://127.0.0.1:43177/health
```

Emma can then use the local bridge for:

```text
kraken/status
kraken/ticker
kraken/workspace/create
kraken/paper
```

Example paper workspace:

```sh
kraken workspace create emma-paper --capital 10000 --mode paper -o json
export KRAKEN_WORKSPACE=emma-paper
kraken paper buy BTCUSD 0.001 -o json
kraken paper status -o json
```

Never configure live Kraken keys for this bridge while paper validation is in progress.
