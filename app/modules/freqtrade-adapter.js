const timeoutMs=10000;
function base(env=process.env){return String(env.FREQTRADE_URL||"").replace(/\/$/,"");}
function auth(env=process.env){return {username:String(env.FREQTRADE_USERNAME||""),password:String(env.FREQTRADE_PASSWORD||"")};}
async function request(path,options={},env=process.env){
  const url=base(env); if(!url)return {ok:false,error:"FREQTRADE_NOT_CONFIGURED",configured:false};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(options.timeoutMs||timeoutMs));
  try{const headers={"Content-Type":"application/json",...(options.headers||{})};const res=await fetch(url+path,{method:options.method||"GET",headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:controller.signal});const raw=await res.text();let data;try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,4000)}}return {ok:res.ok,http_status:res.status,data};}
  catch(error){return {ok:false,configured:true,error:error?.name==="AbortError"?"TIMEOUT":String(error?.message||error)}}
  finally{clearTimeout(timer)}
}
async function token(env=process.env){
  const {username,password}=auth(env); if(!username||!password)return {ok:false,error:"FREQTRADE_CREDENTIALS_NOT_CONFIGURED"};
  const basic=Buffer.from(`${username}:${password}`).toString("base64");
  const r=await request("/api/v1/token/login",{method:"POST",headers:{Authorization:`Basic ${basic}`}},env); const access=r.data?.access_token; return access?{ok:true,access_token:access}:r;
}
export async function freqtradeStatus(env=process.env){
  const ping=await request("/api/v1/ping",{},env),credentials=auth(env);
  const out={provider:"freqtrade",configured:Boolean(base(env)),ping,credentials_configured:Boolean(credentials.username&&credentials.password)};
  if(out.credentials_configured){const t=await token(env);out.authenticated=Boolean(t.ok);if(t.ok)out.status=await request("/api/v1/status",{headers:{Authorization:"Bearer "+t.access_token}},env);else out.auth_error=t.error||"FREQTRADE_AUTH_FAILED";}
  return out;
}
export async function freqtradeRequest(action="status",payload={},env=process.env){
  if(!base(env))return {ok:false,error:"FREQTRADE_NOT_CONFIGURED",configured:false};
  if(action==="ping")return request("/api/v1/ping",{},env);
  if(action==="start"){
    if(String(env.FREQTRADE_TRADING_ENABLED||"false")!=="true")return {ok:false,error:"FREQTRADE_TRADING_DISABLED"};
    if(String(env.TRADING_MODE||"paper")!=="live")return {ok:false,error:"TRADING_MODE_NOT_LIVE"};
    if(String(env.LIVE_TRADING_ENABLED||"false")!=="true")return {ok:false,error:"LIVE_TRADING_DISABLED"};
  }
  const t=await token(env); if(!t.ok)return t;
  const routes={status:{method:"GET",path:"/api/v1/status"},balance:{method:"GET",path:"/api/v1/balance"},profit:{method:"GET",path:"/api/v1/profit"},whitelist:{method:"GET",path:"/api/v1/whitelist"},start:{method:"POST",path:"/api/v1/start"},stop:{method:"POST",path:"/api/v1/stop"},pause:{method:"POST",path:"/api/v1/pause"}};
  const route=routes[action]; if(!route)return {ok:false,error:"FREQTRADE_ACTION_UNSUPPORTED",action};
  return request(route.path,{method:route.method,headers:{Authorization:"Bearer "+t.access_token}},env);
}
