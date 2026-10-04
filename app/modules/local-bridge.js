const DEFAULT_PORT=43177;
export async function discoverLocalBridge(){
  for(const port of [DEFAULT_PORT,43178,43179]){
    try{
      const r=await fetch(`http://127.0.0.1:${port}/health`,{cache:"no-store"});
      if(r.ok){
        const health=await r.json();
        return {url:`http://127.0.0.1:${port}`,health,token:health.pairing_token||null};
      }
    }catch{}
  }
  return null;
}
export async function bridgeCommand(bridge,command,payload={}){
  const url=typeof bridge==="string"?bridge:bridge?.url;
  const token=typeof bridge==="object"?bridge?.token:null;
  if(!url)throw new Error("LOCAL_BRIDGE_UNAVAILABLE");
  const headers={"Content-Type":"application/json"};
  if(token)headers["X-Emma-Token"]=token;
  const r=await fetch(`${url}/v1/${command}`,{method:"POST",headers,body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
