#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "[Emma] Preparing Debian userland..."
if ! proot-distro list 2>/dev/null | grep -q '^debian'; then
  proot-distro install debian
fi

echo "[Emma] Installing runtime and Kraken CLI inside Debian..."
proot-distro login debian -- bash -lc '
set -euo pipefail
apt-get update -y
apt-get install -y curl ca-certificates nodejs npm git
if ! command -v kraken >/dev/null 2>&1; then
  curl --proto "=https" --tlsv1.2 -LsSf https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh
fi
kraken status >/dev/null
mkdir -p /root/emma/mobile-bridge
cd /root/emma
if [ ! -d AOG-Jarvis/.git ]; then
  git clone --depth 1 https://github.com/astraoilandgas2026/AOG-Jarvis.git
else
  git -C AOG-Jarvis pull --ff-only
fi
cp AOG-Jarvis/mobile-bridge/server.mjs /root/emma/mobile-bridge/server.mjs
if [ ! -f /root/emma/bridge-token ]; then
  umask 077
  head -c 32 /dev/urandom | od -An -tx1 | tr -d " \n" > /root/emma/bridge-token
fi
pkill -f "node /root/emma/mobile-bridge/server.mjs" 2>/dev/null || true
export EMMA_BRIDGE_TOKEN="$(cat /root/emma/bridge-token)"
nohup node /root/emma/mobile-bridge/server.mjs >/root/emma/bridge.log 2>&1 &
sleep 1
curl -fsS -H "X-Emma-Token: $EMMA_BRIDGE_TOKEN" http://127.0.0.1:43177/health
echo
echo "[Emma] BRIDGE ONLINE"
echo "[Emma] Token stored locally at /root/emma/bridge-token"
'
