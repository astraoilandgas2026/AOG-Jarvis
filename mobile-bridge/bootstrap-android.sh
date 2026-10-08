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
curl --proto "=https" --tlsv1.2 -fsSL https://raw.githubusercontent.com/astraoilandgas2026/AOG-Jarvis/main/mobile-bridge/server.mjs -o /root/emma/mobile-bridge/server.mjs
if [ ! -f /root/emma/bridge-token ]; then
  umask 077
  head -c 32 /dev/urandom | od -An -tx1 | tr -d " \n" > /root/emma/bridge-token
fi
if [ -f /root/emma/bridge.pid ]; then
  kill "$(cat /root/emma/bridge.pid)" 2>/dev/null || true
  rm -f /root/emma/bridge.pid
fi
export EMMA_BRIDGE_TOKEN="$(cat /root/emma/bridge-token)"
export EMMA_SUPABASE_URL="https://dhswxxathvzzlybxukat.supabase.co"
if [ ! -f /root/emma/device-key ]; then
  umask 077
  cat /proc/sys/kernel/random/uuid > /root/emma/device-key
fi
export EMMA_DEVICE_KEY="$(cat /root/emma/device-key)"
if [ ! -f /root/emma/cloud-token ]; then
  echo "[Emma] Cloud pairing required."
  read -r -p "Enter Emma pairing code: " EMMA_PAIRING_CODE
  export EMMA_PAIRING_CODE
  PAIR_JSON="$(curl -fsS -X POST "$EMMA_SUPABASE_URL/functions/v1/emma-mobile-relay" -H "Content-Type: application/json" --data "$(node -e 'console.log(JSON.stringify({op:"pair",pairing_code:process.env.EMMA_PAIRING_CODE,device_key:process.env.EMMA_DEVICE_KEY,device_name:"Emma Samsung",platform:"android-termux",app_version:"1.2-cloud-relay",capabilities:["cloud_relay","kraken-market","kraken-paper","notifications","local-execution-bridge"]}))')")"
  node -e 'const d=JSON.parse(process.argv[1]); if(!d.device_token){console.error(JSON.stringify(d));process.exit(1)}; require("fs").writeFileSync("/root/emma/cloud-token",d.device_token,{mode:0o600}); console.log("[Emma] Cloud pairing OK")' "$PAIR_JSON"
fi
export EMMA_CLOUD_TOKEN="$(cat /root/emma/cloud-token)"
nohup env EMMA_BRIDGE_TOKEN="$EMMA_BRIDGE_TOKEN" EMMA_SUPABASE_URL="$EMMA_SUPABASE_URL" EMMA_DEVICE_KEY="$EMMA_DEVICE_KEY" EMMA_CLOUD_TOKEN="$EMMA_CLOUD_TOKEN" node /root/emma/mobile-bridge/server.mjs >/root/emma/bridge.log 2>&1 &
echo $! > /root/emma/bridge.pid
sleep 1
curl -fsS -H "X-Emma-Token: $EMMA_BRIDGE_TOKEN" http://127.0.0.1:43177/health
echo
echo "[Emma] BRIDGE ONLINE"
echo "[Emma] Token stored locally at /root/emma/bridge-token"
'
