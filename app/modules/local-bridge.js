const DEFAULT_PORT=43177;
export async function discoverLocalBridge(){
  for(const port of [DEFAULT_PORT,43178,43179]){
    try{const r=await fetch(`http://127.0.0.1:${port}/health`,{cache:"no-store"});if(r.ok)return {url:`http://127.0.0.1:${port}`,health:await r.json()}}catch{}
  }
  return null;
}
export async function bridgeCommand(url,command,payload={}){
  const r=await fetch(`${url}/v1/${command}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
