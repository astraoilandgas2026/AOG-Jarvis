import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec=promisify(execFile);
const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex");
const CLOUD_URL=String(process.env.EMMA_SUPABASE_URL||"").replace(/\/$/,"");
const CLOUD_TOKEN=String(process.env.EMMA_CLOUD_TOKEN||"");
const DEVICE_KEY=String(process.env.EMMA_DEVICE_KEY||"");
const ALLOWED_ORIGINS=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://127.0.0.1:3000"]);
const json=(res,status,data,req)=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(req.headers.origin||"")?(req.headers.origin||""):"null","Access-Control-Allow-Headers":"Content-Type, X-Emma-Token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Private-Network":"true","Vary":"Origin"});res.end(JSON.stringify(data))};
const auth=req=>{const x=req.headers["x-emma-token"];if(typeof x!=="string")return false;const a=Buffer.from(x),b=Buffer.from(TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}};
async function kraken(args){
  const cmd=String(args?.command||"status").trim();
  if(!/^[a-z0-9][a-z0-9 _./:-]*$/i.test(cmd))throw new Error("KRAKEN_COMMAND_INVALID");
  const parts=cmd.split(/\s+/).filter(Boolean);
  const allowed=["status","ticker","orderbook","trades","ohlc","workspace","paper"];
  if(!allowed.includes(parts[0]))throw new Error("KRAKEN_COMMAND_NOT_ALLOWED");
  const safeArgs=parts.slice(1);
  if(safeArgs.some(x=>x.startsWith("--allow-dangerous")||x==="trade"||x==="funding"||x==="order"||x==="futures"))throw new Error("KRAKEN_LIVE_OR_DANGEROUS_BLOCKED");
  const {stdout,stderr}=await exec("kraken",[...parts,"-o","json"],{timeout:20000,maxBuffer:2_000_000});
  let data;try{data=JSON.parse(stdout)}catch{data={raw:stdout.trim()}};return{ok:true,mode:"paper-or-public",data,stderr:stderr?.trim()||null};
}
async function cloudCall(op,body={}){if(!CLOUD_URL||!CLOUD_TOKEN||!DEVICE_KEY)throw new Error("CLOUD_RELAY_NOT_CONFIGURED");const r=await fetch(CLOUD_URL+"/functions/v1/emma-mobile-relay",{method:"POST",headers:{"Content-Type":"application/json","X-Emma-Device-Token":CLOUD_TOKEN},body:JSON.stringify({op,...body})});const data=await r.json().catch(()=>({error:"INVALID_CLOUD_RESPONSE"}));if(!r.ok)throw new Error(String(data?.error||"CLOUD_RELAY_ERROR"));return data}
async function handleCloudTask(task){const type=String(task?.task_type||""),p=task?.payload&&typeof task.payload==="object"?task.payload:{};if(type==="kraken_status")return await kraken({command:"status"});if(type==="kraken_ticker")return await kraken({command:"ticker "+String(p.pair||"BTCUSD").toUpperCase()});if(type==="kraken_workspace_create"){const name=String(p.name||"emma-paper").replace(/[^a-zA-Z0-9_-]/g,""),capital=Number(p.capital||10000);return await kraken({command:"workspace create "+name+" --capital "+capital+" --mode paper"})}if(type==="kraken_paper"){const action=String(p.action||"status"),pair=String(p.pair||"BTCUSD").toUpperCase(),volume=String(p.volume||"0.001");if(!["status","balance","orders","history","buy","sell"].includes(action))throw new Error("KRAKEN_PAPER_ACTION_INVALID");const cmd=["buy","sell"].includes(action)?`paper ${action} ${pair} ${volume}`:`paper ${action}`;return await kraken({command:cmd})}if(type==="notification")return {ok:true,received:true,message:String(p.message||"").slice(0,1000)};throw new Error("CLOUD_TASK_TYPE_NOT_ALLOWED")}
let cloudBusy=false;
async function cloudLoop(){if(cloudBusy||!CLOUD_URL||!CLOUD_TOKEN||!DEVICE_KEY)return;cloudBusy=true;try{await cloudCall("heartbeat",{device_key:DEVICE_KEY,device_name:"Emma Samsung",platform:"android-termux",app_version:"1.2-cloud-relay",capabilities:["cloud_relay","kraken-market","kraken-paper","notifications","local-execution-bridge"]});const tasks=(await cloudCall("poll",{device_key:DEVICE_KEY,limit:5})).tasks||[];for(const task of tasks){try{const result=await handleCloudTask(task);await cloudCall("complete",{task_id:task.id,status:"completed",result})}catch(error){await cloudCall("complete",{task_id:task.id,status:"failed",error:String(error?.message||error)})}}}catch(error){console.error("[Emma] cloud relay:",error?.message||error)}finally{cloudBusy=false}}
const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{},req);
  const origin=req.headers.origin||"";
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json(res,403,{ok:false,error:"ORIGIN_NOT_ALLOWED"},req);
  if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Android Local Bridge",version:"1.2-cloud-relay",capabilities:["cloud-relay","kraken-market","kraken-paper","notifications","local-execution-bridge"],token_required:true},req);
  if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"},req);
  if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"},req);
  try{
    const input=await body(req),command=req.url.slice(4);
    if(command==="kraken/status")return json(res,200,await kraken({command:"status"}),req);
    if(command==="kraken/ticker"){const pair=String(input.pair||"BTCUSD").toUpperCase();return json(res,200,await kraken({command:"ticker "+pair}),req)}
    if(command==="kraken/workspace/create"){const name=String(input.name||"emma-paper").replace(/[^a-zA-Z0-9_-]/g,"");const capital=Number(input.capital||10000);return json(res,200,await kraken({command:"workspace create "+name+" --capital "+capital+" --mode paper"}),req)}
    if(command==="kraken/paper"){const action=String(input.action||"status");const pair=String(input.pair||"BTCUSD").toUpperCase();const volume=String(input.volume||"0.001");if(!["status","balance","orders","history","buy","sell"].includes(action))throw new Error("KRAKEN_PAPER_ACTION_INVALID");const cmd=["buy","sell"].includes(action)?`paper ${action} ${pair} ${volume}`:`paper ${action}`;return json(res,200,await kraken({command:cmd}),req)}
    if(command==="kraken/command")return json(res,200,await kraken(input),req);
    return json(res,404,{ok:false,error:"UNKNOWN_COMMAND"},req);
  }catch(error){return json(res,500,{ok:false,error:String(error?.message||error)},req)}
});
server.listen(PORT,"127.0.0.1",()=>console.log("Emma Android Local Bridge listening on http://127.0.0.1:"+PORT));

if(CLOUD_URL&&CLOUD_TOKEN&&DEVICE_KEY){setInterval(cloudLoop,5000);cloudLoop();console.log("[Emma] Cloud relay enabled");}
