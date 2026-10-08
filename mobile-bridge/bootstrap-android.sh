#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "[Emma] Preparing Debian userland..."
if ! proot-distro login debian -- true >/dev/null 2>&1; then
  proot-distro install debian
fi

echo "[Emma] Repairing Debian package state and installing runtime..."
proot-distro login debian -- bash -lc '
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/root/.cargo/bin:$PATH"
dpkg --configure -a >/dev/null 2>&1 || true
apt-get -o Dpkg::Options::=--force-confold -f install -y
apt-get update -y
apt-get -o Dpkg::Options::=--force-confold install -y curl ca-certificates nodejs npm git
if ! command -v kraken >/dev/null 2>&1; then
  curl --proto "=https" --tlsv1.2 -LsSf https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh
  export PATH="/root/.cargo/bin:$PATH"
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
if [ -f /root/emma/bridge.pid ]; then
  kill "$(cat /root/emma/bridge.pid)" 2>/dev/null || true
  rm -f /root/emma/bridge.pid
fi
export EMMA_BRIDGE_TOKEN="$(cat /root/emma/bridge-token)"
nohup node /root/emma/mobile-bridge/server.mjs >/root/emma/bridge.log 2>&1 &
echo $! > /root/emma/bridge.pid
sleep 1
curl -fsS -H "X-Emma-Token: $EMMA_BRIDGE_TOKEN" http://127.0.0.1:43177/health
echo
echo "[Emma] BRIDGE ONLINE"
echo "[Emma] Token stored locally at /root/emma/bridge-token"
'
