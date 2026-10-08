#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

EMMA_HOME="$HOME/.emma"
mkdir -p "$EMMA_HOME"
chmod 700 "$EMMA_HOME"

if ! command -v node >/dev/null 2>&1; then
  echo "[Emma] Node.js is required in Termux."
  exit 1
fi

if [ ! -f "$EMMA_HOME/device-key" ]; then
  node -e "require('fs').writeFileSync(process.argv[1],require('crypto').randomUUID(),{mode:0o600})" "$EMMA_HOME/device-key"
fi
DEVICE_KEY="$(cat "$EMMA_HOME/device-key")"

if [ ! -f "$EMMA_HOME/cloud-token" ]; then
  echo "[Emma] Cloud pairing required."
  read -r -s -p "Enter Emma pairing code: " PAIRING_CODE
  echo
  EMMA_PAIRING_CODE="$PAIRING_CODE" EMMA_DEVICE_KEY="$DEVICE_KEY" node <<'NODE'
const fs=require("fs"),path=require("path");
const url="https://dhswxxathvzzlybxukat.supabase.co/functions/v1/emma-mobile-relay";
fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
  op:"pair",
  pairing_code:process.env.EMMA_PAIRING_CODE,
  device_key:process.env.EMMA_DEVICE_KEY,
  device_name:"Emma Samsung",
  platform:"android-termux",
  app_version:"2.0-native",
  capabilities:["cloud_relay","kraken-market","kraken-paper","notifications","local-execution-bridge","native-termux"]
})}).then(async r=>{
  const t=await r.text();
  if(!r.ok)throw new Error(t);
  const d=JSON.parse(t);
  if(!d.device_token)throw new Error("PAIRING_TOKEN_MISSING");
  fs.writeFileSync(path.join(process.env.HOME,".emma","cloud-token"),d.device_token,{mode:0o600});
  console.log("[Emma] Cloud pairing OK");
}).catch(e=>{console.error(e.message);process.exit(1)});
NODE
fi

EMMA_CLOUD_TOKEN="$(cat "$EMMA_HOME/cloud-token")"

curl_ok=0
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 10 https://raw.githubusercontent.com/astraoilandgas2026/AOG-Jarvis/main/mobile-bridge/server.mjs >/dev/null 2>&1; then
  curl_ok=1
fi
if [ "$curl_ok" -eq 1 ]; then
  curl -fsSL https://raw.githubusercontent.com/astraoilandgas2026/AOG-Jarvis/main/mobile-bridge/server.mjs -o "$EMMA_HOME/server.mjs"
else
  node -e 'const fs=require("fs"),https=require("https");https.get("https://raw.githubusercontent.com/astraoilandgas2026/AOG-Jarvis/main/mobile-bridge/server.mjs",r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>{if(r.statusCode!==200)process.exit(1);fs.writeFileSync(process.argv[1],d,{mode:0o600})})}).on("error",()=>process.exit(1))' "$EMMA_HOME/server.mjs"
fi

node --check "$EMMA_HOME/server.mjs"

if [ ! -f "$EMMA_HOME/bridge-token" ]; then
  node -e "require('fs').writeFileSync(process.argv[1],require('crypto').randomBytes(24).toString('hex'),{mode:0o600})" "$EMMA_HOME/bridge-token"
fi
BRIDGE_TOKEN="$(cat "$EMMA_HOME/bridge-token")"

if [ -f "$EMMA_HOME/bridge.pid" ]; then
  OLD_PID="$(cat "$EMMA_HOME/bridge.pid" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" >/dev/null 2>&1; then kill "$OLD_PID" >/dev/null 2>&1 || true; fi
fi

if command -v termux-wake-lock >/dev/null 2>&1; then termux-wake-lock >/dev/null 2>&1 || true; fi

nohup env EMMA_BRIDGE_TOKEN="$BRIDGE_TOKEN" EMMA_SUPABASE_URL="https://dhswxxathvzzlybxukat.supabase.co" EMMA_CLOUD_TOKEN="$EMMA_CLOUD_TOKEN" EMMA_DEVICE_KEY="$DEVICE_KEY" EMMA_HOME="$EMMA_HOME" node "$EMMA_HOME/server.mjs" >"$EMMA_HOME/bridge.log" 2>&1 </dev/null &
echo $! > "$EMMA_HOME/bridge.pid"

sleep 2
node -e 'fetch("http://127.0.0.1:43177/health",{headers:{"X-Emma-Token":process.argv[1]}}).then(async r=>{if(!r.ok){console.error(await r.text());process.exit(1)}console.log("[Emma] BRIDGE ONLINE")}).catch(e=>{console.error(e.message);process.exit(1)})' "$BRIDGE_TOKEN"

echo "[Emma] Native Termux bridge online"
echo "[Emma] Cloud relay configured"
echo "[Emma] No PRoot / no Debian dependency"
