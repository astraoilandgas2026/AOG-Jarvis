import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";

const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=String(process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex"));
const CLOUD_URL=String(process.env.EMMA_SUPABASE_URL||"").replace(/\/$/,"");
const CLOUD_TOKEN=String(process.env.EMMA_CLOUD_TOKEN||"");
const DEVICE_KEY=String(process.env.EMMA_DEVICE_KEY||"");
const HOME=process.env.HOME||process.cwd();
const EMMA_HOME=process.env.EMMA_HOME||`${HOME}/.emma`;
const PAPER_FILE=`${EMMA_HOME}/paper-state.json`;
const ALLOWED_ORIGINS=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://127.0.0.1:3000","http://localhost:5500","http://127.0.0.1:5500"]);
fs.mkdirSync(EMMA_HOME,{recursive:true});
const json=(res,status,data,req)=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(req.headers.origin||"")?(req.headers.origin||""):"null","Access-Control-Allow-Headers":"Content-Type, X-Emma-Token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Private-Network":"true","Vary":"Origin"});res.end(JSON.stringify(data))};
const auth=req=>{const x=req.headers["x-emma-token"];if(typeof x!=="string")return false;const a=Buffer.from(x),b=Buffer.from(TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}};
const normalizePair=p=>{const x=String(p||"BTCUSD").toUpperCase().replace("/","");return x==="BTCUSD"?"XBTUSD":x};
async function publicKraken(endpoint,params={}){
  const qs=new URLSearchParams(params).toString(),r=await fetch("https://api.kraken.com/0/public/"+endpoint+(qs?"?"+qs:"")),d=await r.json().catch(()=>({}));
  if(!r.ok||d?.error?.length)throw new Error(String(d?.error?.join("; ")||"KRAKEN_PUBLIC_ERROR"));
  return d.result;
}
async function price(pair){
  const symbol=normalizePair(pair),d=await publicKraken("Ticker",{pair:symbol}),key=Object.keys(d||{})[0],last=Number(d?.[key]?.c?.[0]);
  if(!Number.isFinite(last))throw new Error("KRAKEN_PRICE_UNAVAILABLE");
  return{pair:symbol,price:last};
}
function loadPaper(){try{return JSON.parse(fs.readFileSync(PAPER_FILE,"utf8"))}catch{return{workspace:"emma-paper",cash:10000,positions:{},orders:[],history:[],created_at:new Date().toISOString()}}}
function savePaper(state){fs.writeFileSync(PAPER_FILE,JSON.stringify(state,null,2),{mode:0o600})}
async function paper(action,pair,volume){
  const state=loadPaper();
  if(action==="status"||action==="balance")return{ok:true,mode:"paper",workspace:state.workspace,cash:state.cash,positions:state.positions,orders:action==="status"?state.orders:undefined};
  if(action==="orders")return{ok:true,mode:"paper",orders:state.orders};
  if(action==="history")return{ok:true,mode:"paper",history:state.history};
  if(!["buy","sell"].includes(action))throw new Error("PAPER_ACTION_INVALID");
  const qty=Number(volume);if(!Number.isFinite(qty)||qty<=0)throw new Error("PAPER_VOLUME_INVALID");
  const quote=await price(pair),notional=quote.price*qty,current=Number(state.positions[quote.pair]||0);
  if(action==="buy"){if(state.cash<notional)throw new Error("PAPER_INSUFFICIENT_CASH");state.cash-=notional;state.positions[quote.pair]=current+qty}
  else{if(current<qty)throw new Error("PAPER_INSUFFICIENT_POSITION");state.cash+=notional;state.positions[quote.pair]=current-qty;if(Math.abs(state.positions[quote.pair])<1e-12)delete state.positions[quote.pair]}
  const order={id:crypto.randomUUID(),side:action,pair:quote.pair,volume:qty,price:quote.price,notional,created_at:new Date().toISOString(),status:"filled",mode:"paper"};
  state.orders=[order,...state.orders].slice(0,200);state.history=[order,...state.history].slice(0,500);savePaper(state);
  return{ok:true,mode:"paper",order,balance:{cash:state.cash,positions:state.positions}};
}
async function handleTask(task){
  const type=String(task?.task_type||""),p=task?.payload&&typeof task.payload==="object"?task.payload:{};
  if(type==="kraken_status")return{ok:true,mode:"public",data:await publicKraken("SystemStatus")};
  if(type==="kraken_ticker")return{ok:true,mode:"public",...(await price(p.pair||"BTCUSD"))};
  if(type==="kraken_workspace_create"){const state=loadPaper();state.workspace=String(p.name||"emma-paper").replace(/[^a-zA-Z0-9_-]/g,"")||"emma-paper";state.cash=Number(p.capital||10000);state.positions={};state.orders=[];state.history=[];savePaper(state);return{ok:true,mode:"paper",workspace:state.workspace,cash:state.cash}}
  if(type==="kraken_paper")return paper(String(p.action||"status"),String(p.pair||"BTCUSD"),String(p.volume||"0.001"));
  if(type==="notification")return{ok:true,received:true,message:String(p.message||"").slice(0,1000)};
  throw new Error("CLOUD_TASK_TYPE_NOT_ALLOWED");
}
async function cloudCall(op,payload={}){
  if(!CLOUD_URL||!CLOUD_TOKEN||!DEVICE_KEY)throw new Error("CLOUD_RELAY_NOT_CONFIGURED");
  const r=await fetch(CLOUD_URL+"/functions/v1/emma-mobile-relay",{method:"POST",headers:{"Content-Type":"application/json","X-Emma-Device-Token":CLOUD_TOKEN},body:JSON.stringify({op,...payload})});
  const d=await r.json().catch(()=>({error:"INVALID_CLOUD_RESPONSE"}));if(!r.ok)throw new Error(String(d?.error||"CLOUD_RELAY_ERROR"));return d;
}
let cloudBusy=false;
async function cloudLoop(){
  if(cloudBusy||!CLOUD_URL||!CLOUD_TOKEN||!DEVICE_KEY)return;
  cloudBusy=true;
  try{
    await cloudCall("heartbeat",{device_key:DEVICE_KEY,device_name:"Emma Samsung",platform:"android-termux",app_version:"2.0-native",capabilities:["cloud_relay","kraken-market","kraken-paper","notifications","local-execution-bridge","native-termux"]});
    const tasks=(await cloudCall("poll",{device_key:DEVICE_KEY,limit:5})).tasks||[];
    for(const task of tasks){try{const result=await handleTask(task);await cloudCall("complete",{task_id:task.id,status:"completed",result})}catch(error){await cloudCall("complete",{task_id:task.id,status:"failed",error:String(error?.message||error)})}}
  }catch(error){console.error("[Emma] cloud relay:",error?.message||error)}
  finally{cloudBusy=false}
}
const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{},req);
  const origin=req.headers.origin||"";if(origin&&!ALLOWED_ORIGINS.has(origin))return json(res,403,{ok:false,error:"ORIGIN_NOT_ALLOWED"},req);
  if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Android Local Bridge",version:"2.0-native",runtime:"termux-native",capabilities:["cloud-relay","kraken-market","kraken-paper","notifications","local-execution-bridge"],token_required:true,pairing_token:TOKEN},req);
  if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"},req);
  if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"},req);
  try{
    const input=await body(req),command=req.url.slice(4);
    if(command==="kraken/status")return json(res,200,{ok:true,mode:"public/paper",data:await publicKraken("SystemStatus")},req);
    if(command==="kraken/ticker")return json(res,200,await price(input.pair||"BTCUSD"),req);
    if(command==="kraken/orderbook"||command==="kraken/trades"||command==="kraken/ohlc"){
      const endpoint={orderbook:"Depth",trades:"Trades",ohlc:"OHLC"}[command.slice(8)];
      return json(res,200,{ok:true,mode:"public",data:await publicKraken(endpoint,{pair:normalizePair(input.pair||"BTCUSD")})},req);
    }
    if(command==="kraken/workspace/create"){const state=loadPaper();state.workspace=String(input.name||"emma-paper").replace(/[^a-zA-Z0-9_-]/g,"")||"emma-paper";state.cash=Number(input.capital||10000);state.positions={};state.orders=[];state.history=[];savePaper(state);return json(res,200,{ok:true,mode:"paper",workspace:state.workspace,cash:state.cash},req)}
    if(command==="kraken/paper")return json(res,200,await paper(String(input.action||"status"),String(input.pair||"BTCUSD"),String(input.volume||"0.001")),req);
    if(command==="kraken/command")throw new Error("ARBITRARY_KRAKEN_COMMAND_DISABLED");
    return json(res,404,{ok:false,error:"UNKNOWN_COMMAND"},req);
  }catch(error){return json(res,500,{ok:false,error:String(error?.message||error)},req)}
});
server.listen(PORT,"127.0.0.1",()=>console.log("Emma Android Local Bridge listening on http://127.0.0.1:"+PORT));
if(CLOUD_URL&&CLOUD_TOKEN&&DEVICE_KEY){cloudLoop();setInterval(cloudLoop,5000);console.log("[Emma] Cloud relay enabled")}
