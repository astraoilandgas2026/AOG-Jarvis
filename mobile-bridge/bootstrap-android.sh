#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "[Emma] Preparing Debian userland..."
if ! proot-distro login debian -- true >/dev/null 2>&1; then
  proot-distro install debian
fi

EMMA_HOME="$HOME/.emma"
mkdir -p "$EMMA_HOME"

if [ ! -f "$EMMA_HOME/device-key" ]; then
  node -e "require('fs').writeFileSync(process.argv[1], require('crypto').randomUUID(), {mode:0o600})" "$EMMA_HOME/device-key"
fi
DEVICE_KEY="$(cat "$EMMA_HOME/device-key")"
PAIRING_CODE=""

if [ ! -f "$EMMA_HOME/cloud-token" ]; then
  echo "[Emma] Cloud pairing required."
  read -r -s -p "Enter Emma pairing code: " PAIRING_CODE
  echo
  export EMMA_PAIRING_CODE="$PAIRING_CODE"
  export EMMA_DEVICE_KEY="$DEVICE_KEY"
  PAIR_JSON="$(node -e '
const url="https://dhswxxathvzzlybxukat.supabase.co/functions/v1/emma-mobile-relay";
const body={op:"pair",pairing_code:process.env.EMMA_PAIRING_CODE,device_key:process.env.EMMA_DEVICE_KEY,device_name:"Emma Samsung",platform:"android-termux",app_version:"1.2-cloud-relay",capabilities:["cloud_relay","kraken-market","kraken-paper","notifications","local-execution-bridge"]};
fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
  .then(async r=>{const t=await r.text(); if(!r.ok) throw new Error(t); process.stdout.write(t)})
  .catch(e=>{console.error(e.message);process.exit(1)});
')"
  EMMA_CLOUD_TOKEN="$(node -e 'const d=JSON.parse(process.argv[1]);if(!d.device_token){console.error(JSON.stringify(d));process.exit(1)};process.stdout.write(d.device_token)' "$PAIR_JSON")"
  printf "%s" "$EMMA_CLOUD_TOKEN" > "$EMMA_HOME/cloud-token"
  chmod 600 "$EMMA_HOME/cloud-token"
  echo "[Emma] Cloud pairing OK"
fi

EMMA_CLOUD_TOKEN="$(cat "$EMMA_HOME/cloud-token")"

echo "[Emma] Preparing Debian runtime..."

proot-distro login debian -- bash -lc 'set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/root/.cargo/bin:$PATH"
dpkg --configure -a >/dev/null 2>&1 || true
apt-get -o Dpkg::Options::=--force-confold -f install -y >/dev/null 2>&1 || true
apt-get update -y >/dev/null 2>&1
apt-get -o Dpkg::Options::=--force-confold install -y curl ca-certificates nodejs npm git >/dev/null 2>&1
if ! command -v kraken >/dev/null 2>&1; then
  curl --proto "=https" --tlsv1.2 -LsSf https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh
  export PATH="/root/.cargo/bin:$PATH"
fi
kraken status >/dev/null 2>&1
mkdir -p /root/emma/mobile-bridge
curl --proto "=https" --tlsv1.2 -fsSL https://raw.githubusercontent.com/astraoilandgas2026/AOG-Jarvis/main/mobile-bridge/server.mjs -o /root/emma/mobile-bridge/server.mjs
if [ ! -f /root/emma/bridge-token ]; then
  umask 077
  head -c 32 /dev/urandom | od -An -tx1 | tr -d " \\n" > /root/emma/bridge-token
fi
' >/dev/null

EMMA_CLOUD_TOKEN="$(cat "$EMMA_HOME/cloud-token")"
BRIDGE_TOKEN="$(cat "$EMMA_HOME/bridge-token" 2>/dev/null || proot-distro login debian -- cat /root/emma/bridge-token)"

if [ -f "$EMMA_HOME/proot.pid" ]; then
  OLD_PID="$(cat "$EMMA_HOME/proot.pid" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" >/dev/null 2>&1; then kill "$OLD_PID" >/dev/null 2>&1 || true; fi
fi
nohup proot-distro login debian -- env EMMA_DEVICE_KEY="$DEVICE_KEY" EMMA_CLOUD_TOKEN="$EMMA_CLOUD_TOKEN" EMMA_SUPABASE_URL="https://dhswxxathvzzlybxukat.supabase.co" EMMA_BRIDGE_TOKEN="$BRIDGE_TOKEN" bash -lc '
set -euo pipefail
printf "%s" "$EMMA_DEVICE_KEY" > /root/emma/device-key
printf "%s" "$EMMA_CLOUD_TOKEN" > /root/emma/cloud-token
printf "%s" "$EMMA_BRIDGE_TOKEN" > /root/emma/bridge-token
chmod 600 /root/emma/device-key /root/emma/cloud-token /root/emma/bridge-token
: > /root/emma/bridge.log
node /root/emma/mobile-bridge/server.mjs >>/root/emma/bridge.log 2>&1
' >"$EMMA_HOME/proot.log" 2>&1 </dev/null &
echo $! > "$EMMA_HOME/proot.pid"

sleep 4
node -e 'fetch("http://127.0.0.1:43177/health",{headers:{"X-Emma-Token":process.argv[1]}}).then(async r=>{if(!r.ok){console.error(await r.text());process.exit(1)}console.log("[Emma] BRIDGE ONLINE")}).catch(e=>{console.error(e.message);process.exit(1)})' "$BRIDGE_TOKEN"

echo "[Emma] Cloud relay configured"
echo "[Emma] PRoot process kept alive in background"
