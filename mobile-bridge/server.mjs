import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec=promisify(execFile);
const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex");
const ALLOWED_ORIGINS=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://127.0.0.1:3000"]);
const json=(res,status,data,req)=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(req.headers.origin||"")?(req.headers.origin||""):"null","Access-Control-Allow-Headers":"Content-Type, X-Emma-Token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Private-Network":"true","Vary":"Origin"});res.end(JSON.stringify(data))};
const auth=req=>{const x=req.headers["x-emma-token"];if(typeof x!=="string")return false;const a=Buffer.from(x),b=Buffer.from(TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}};
async function kraken(args){
  const cmd=String(args?.command||"status").trim();
  if(!/^[a-z0-9][a-z0-9 _./:-]*$/i.test(cmd))throw new Error("KRAKEN_COMMAND_INVALID");
  const parts=cmd.split(/\s+/).filter(Boolean);
  const allowed=["status","ticker","orderbook","trades","ohlc","workspace","paper","futures"];
  if(!allowed.includes(parts[0]))throw new Error("KRAKEN_COMMAND_NOT_ALLOWED");
  const safeArgs=parts.slice(1);
  if(safeArgs.some(x=>x.startsWith("--allow-dangerous")||x==="trade"||x==="funding"||x==="order"))throw new Error("KRAKEN_LIVE_OR_DANGEROUS_BLOCKED");
  const {stdout,stderr}=await exec("kraken",[...safeArgs.length?parts:parts,"-o","json"],{timeout:20000,maxBuffer:2_000_000});
  let data;try{data=JSON.parse(stdout)}catch{data={raw:stdout.trim()}};return{ok:true,mode:"paper-or-public",data,stderr:stderr?.trim()||null};
}
const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{},req);
  const origin=req.headers.origin||"";
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json(res,403,{ok:false,error:"ORIGIN_NOT_ALLOWED"},req);
  if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Android Local Bridge",version:"1.0-kraken",capabilities:["kraken-market","kraken-paper","notifications","local-execution-bridge"],token_required:true},req);
  if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"},req);
  if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"},req);
  try{
    const input=await body(req),command=req.url.slice(4);
    if(command==="kraken/status")return json(res,200,await kraken({command:"status"}),req);
    if(command==="kraken/ticker"){const pair=String(input.pair||"BTCUSD").toUpperCase();return json(res,200,await kraken({command:"ticker "+pair}),req)}
    if(command==="kraken/workspace/create"){const name=String(input.name||"emma-paper").replace(/[^a-zA-Z0-9_-]/g,"");const capital=Number(input.capital||10000);return json(res,200,await kraken({command:"workspace create "+name+" --capital "+capital+" --mode paper"}),req)}
    if(command==="kraken/paper"){const action=String(input.action||"status");const pair=String(input.pair||"BTCUSD").toUpperCase();const volume=String(input.volume||"0.001");if(!["status","balance","orders","history"].includes(action)&&!["buy","sell"].includes(action))throw new Error("KRAKEN_PAPER_ACTION_INVALID");const cmd=["buy","sell"].includes(action)?`paper ${action} ${pair} ${volume}`:`paper ${action}`;return json(res,200,await kraken({command:cmd}),req)}
    if(command==="kraken/command")return json(res,200,await kraken(input),req);
    return json(res,404,{ok:false,error:"UNKNOWN_COMMAND"},req);
  }catch(error){return json(res,500,{ok:false,error:String(error?.message||error)},req)}
});
server.listen(PORT,"127.0.0.1",()=>console.log("Emma Android Local Bridge listening on http://127.0.0.1:"+PORT));
