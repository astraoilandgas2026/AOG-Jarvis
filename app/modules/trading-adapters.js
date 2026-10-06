const endpoints=Object.freeze({jesse:"JESSE_URL",freqtrade:"FREQTRADE_URL",octobot:"OCTOBOT_URL",omniroute:"OMNIROUTE_URL"});
const actionUrls=Object.freeze({
  jesse:{backtest:"JESSE_BACKTEST_URL",paper:"JESSE_PAPER_URL"},
  freqtrade:{backtest:"FREQTRADE_BACKTEST_URL",paper:"FREQTRADE_PAPER_URL",live:"FREQTRADE_LIVE_URL"},
  octobot:{backtest:"OCTOBOT_BACKTEST_URL",paper:"OCTOBOT_PAPER_URL",live:"OCTOBOT_LIVE_URL"},
  omniroute:{backtest:"OMNIROUTE_BACKTEST_URL",paper:"OMNIROUTE_PAPER_URL"}
});
const healthPaths=Object.freeze({freqtrade:"/api/v1/ping"});
const timeoutMs=10000;
async function request(base,path="/health",options={}){
  if(!base)return {configured:false,status:"not_configured"};
  const url=new URL(path,base.endsWith("/")?base:base+"/");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(options.timeoutMs||timeoutMs));
  try{
    const res=await fetch(url,{method:options.method||"GET",headers:{"Content-Type":"application/json",...(options.headers||{})},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:controller.signal});
    const raw=await res.text();let data;try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,4000)}}
    return {configured:true,http_status:res.status,ok:res.ok,data};
  }catch(error){return {configured:true,ok:false,error:error?.name==="AbortError"?"TIMEOUT":String(error?.message||error)}}
  finally{clearTimeout(timer)}
}
export async function adapterHealth(env=globalThis.process?.env||{}){
  const out={};
  for(const [id,key] of Object.entries(endpoints)){
    const base=env[key];
    out[id]=await request(base,healthPaths[id]||"/health");
    out[id].provider=id;
  }
  return out;
}
export async function runAdapter(action,payload={},env=globalThis.process?.env||{}){
  const provider=String(payload.provider||"").toLowerCase(),key=endpoints[provider],actionKey=actionUrls[provider]?.[action];
  if(!key)return {ok:false,error:"TRADING_PROVIDER_UNSUPPORTED",provider};
  if(!env[key])return {ok:false,error:"TRADING_PROVIDER_NOT_CONFIGURED",provider};
  if(!actionKey||!env[actionKey])return {ok:false,error:"TRADING_ACTION_ENDPOINT_NOT_CONFIGURED",provider,action,required_env:actionKey||null};
  if(action==="live"&&String(env.LIVE_TRADING_ENABLED||"false")!=="true")return {ok:false,error:"LIVE_TRADING_DISABLED"};
  return request(env[actionKey],"/",{method:"POST",body:payload});
}
