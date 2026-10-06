const endpoints=Object.freeze({jesse:"JESSE_URL",freqtrade:"FREQTRADE_URL",octobot:"OCTOBOT_URL",omniroute:"OMNIROUTE_URL"});
async function request(base,path="/health",options={}){
  if(!base)return {configured:false,status:"not_configured"};
  const url=new URL(path,base.endsWith("/")?base:base+"/");
  const res=await fetch(url,{method:options.method||"GET",headers:{"Content-Type":"application/json",...(options.headers||{})},body:options.body?JSON.stringify(options.body):undefined});
  const text=await res.text();let data;try{data=JSON.parse(text)}catch{data={raw:text.slice(0,4000)}}
  return {configured:true,http_status:res.status,ok:res.ok,data};
}
export async function adapterHealth(env=globalThis.process?.env||{}){
  const out={};for(const [id,key] of Object.entries(endpoints))out[id]=await request(env[key],"/health");return out;
}
export async function runAdapter(action,payload={},env=globalThis.process?.env||{}){
  const provider=String(payload.provider||"").toLowerCase(),key=endpoints[provider];
  if(!key)return {ok:false,error:"TRADING_PROVIDER_UNSUPPORTED",provider};
  const base=env[key];if(!base)return {ok:false,error:"TRADING_PROVIDER_NOT_CONFIGURED",provider};
  if(action==="backtest")return request(base,"/backtest",{method:"POST",body:payload});
  if(action==="paper")return request(base,"/paper",{method:"POST",body:payload});
  return {ok:false,error:"TRADING_ACTION_UNSUPPORTED",action};
}
