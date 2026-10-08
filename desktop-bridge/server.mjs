import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { scanOpportunity, tradingStatus, riskGate } from "../app/modules/trading-lab.js";
import { adapterHealth, runAdapter } from "../app/modules/trading-adapters.js";
import { binanceStatus, binanceExchangeInfo, binanceBalance, binancePaperOrder, binanceOrder } from "../app/modules/binance-adapter.js";
import { freqtradeStatus, freqtradeRequest } from "../app/modules/freqtrade-adapter.js";

const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex");
const PROFILE_DIR=process.env.EMMA_BROWSER_PROFILE||path.join(os.homedir(),".emma","browser-profile");
const BACKUP_DIR=path.join(os.homedir(),".emma","backups");
const ALLOWED_ORIGINS=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://127.0.0.1:3000","http://localhost:5500","http://127.0.0.1:5500"]);
const BACKUP_FILES=[
  "app/app.js","app/config.js","app/index.html","app/styles.css",
  "app/modules/orb.js","app/modules/orb-personality.js","app/modules/emma-personality.js",
  "app/modules/local-bridge.js","app/modules/adapter-registry.js","app/modules/evidence-policy.js",
  "app/core/tool-registry.js","app/core/intent-router.js","app/core/emma-runtime.js",
  "app/core/automation-engine.js","app/core/execution-plan.js","app/core/execution-orchestrator.js",
  "app/core/performance-engine.js","app/core/offline-core.js","README.md"
];
const GITHUB_RAW_BASE="https://raw.githubusercontent.com/astraoilandgas2026/AOG-Jarvis/main/";

let context=null;
let page=null;

function corsOrigin(req){const origin=req.headers.origin||"";return ALLOWED_ORIGINS.has(origin)?origin:"null"}
function originAllowed(req){const origin=req.headers.origin||"";return !origin||ALLOWED_ORIGINS.has(origin)}
function json(res,status,data,req){
  const body=JSON.stringify(data);
  res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":corsOrigin(req),"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"Content-Type, X-Emma-Token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Private-Network":"true","Vary":"Origin"});
  res.end(body);
}
function auth(req){const supplied=req.headers["x-emma-token"];if(typeof supplied!=="string")return false;const a=Buffer.from(supplied),b=Buffer.from(TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
async function tradingKillSwitch(){const killFile=path.join(os.homedir(),".emma","trading-kill-switch.json");try{const state=JSON.parse(await fs.readFile(killFile,"utf8"));return state.active!==false}catch{return true}}
async function body(req){let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}}

async function ensureBrowser(){
  if(!context)context=await chromium.launchPersistentContext(PROFILE_DIR,{headless:false,viewport:{width:1440,height:900},acceptDownloads:true});
  if(!page||page.isClosed())page=context.pages()[0]||await context.newPage();
  return page;
}
function requireIndex(input){
  const index=Number(input?.index);
  if(!Number.isInteger(index)||index<0||index>=context.pages().length)throw new Error("BROWSER_TAB_INVALID");
  return context.pages()[index];
}

async function createBackup(){
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const target=path.join(BACKUP_DIR,stamp);
  await fs.mkdir(target,{recursive:true});
  const files=[];
  const errors=[];
  for(const relative of BACKUP_FILES){
    try{
      const response=await fetch(GITHUB_RAW_BASE+relative,{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const text=await response.text();
      const destination=path.join(target,relative);
      await fs.mkdir(path.dirname(destination),{recursive:true});
      await fs.writeFile(destination,text,"utf8");
      files.push(relative);
    }catch(error){errors.push({file:relative,error:String(error?.message||error)})}
  }
  const manifest={
    version:1,created_at:new Date().toISOString(),source:"github-main",
    backup_dir:target,files,errors,
    excluded:["browser-profile","environment secrets","service-role keys","session tokens"],
    retention:7
  };
  await fs.writeFile(path.join(target,"manifest.json"),JSON.stringify(manifest,null,2),"utf8");
  const entries=(await fs.readdir(BACKUP_DIR,{withFileTypes:true}).catch(()=>[]))
    .filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse();
  for(const old of entries.slice(7))await fs.rm(path.join(BACKUP_DIR,old),{recursive:true,force:true});
  return {ok:errors.length===0,status:errors.length===0?"current":"partial",created_at:manifest.created_at,path:target,files:files.length,errors:errors.length,retained:Math.min(7,entries.length)};
}

async function backupStatus(){
  const entries=(await fs.readdir(BACKUP_DIR,{withFileTypes:true}).catch(()=>[]))
    .filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse();
  if(!entries.length)return {ok:true,status:"missing",backups:[],latest:null};
  const latest=entries[0];
  const manifest=JSON.parse(await fs.readFile(path.join(BACKUP_DIR,latest,"manifest.json"),"utf8").catch(()=> "{}"));
  const age_ms=manifest.created_at?Math.max(0,Date.now()-new Date(manifest.created_at).getTime()):null;
  const stale=age_ms===null||age_ms>36*60*60*1000;
  return {ok:true,status:stale?"stale":"current",latest,latest_path:path.join(BACKUP_DIR,latest),created_at:manifest.created_at||null,age_ms,files:manifest.files?.length||0,errors:manifest.errors?.length||0,backups:entries.slice(0,7)};
}

const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{},req);
  try{
    if(!originAllowed(req))return json(res,403,{ok:false,error:"ORIGIN_NOT_ALLOWED"},req);
    if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Local Bridge",version:"1.5",capabilities:["browser","web-analysis","links","screenshot","persistent-session","multi-tab","wait","backup","binance-testnet","freqtrade","trading-lab"],token_required:true,pairing_token:TOKEN},req);
    if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"},req);
    if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"},req);
    const command=req.url.slice(4),input=await body(req);
    if(command==="backup/create")return json(res,200,await createBackup(),req);
    if(command==="backup/status")return json(res,200,await backupStatus(),req);
    if(command==="trading/status"){
      const killSwitch=await tradingKillSwitch();
      return json(res,200,{ok:true,kill_switch:killSwitch,status:tradingStatus(process.env),adapters:await adapterHealth(process.env)},req);
    }
    if(command==="trading/kill"){
      const killFile=path.join(os.homedir(),".emma","trading-kill-switch.json");
      await fs.mkdir(path.dirname(killFile),{recursive:true});
      const active=input?.active!==false;
      await fs.writeFile(killFile,JSON.stringify({active,updated_at:new Date().toISOString(),reason:String(input?.reason||"manual")},null,2),"utf8");
      return json(res,200,{ok:true,active},req);
    }
    if(command==="trading/market"){
      const symbol=String(input?.symbol||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
      const interval=String(input?.interval||"1m");
      const limit=Math.min(Math.max(Number(input?.limit)||120,60),500);
      const url="https://data-api.binance.vision/api/v3/klines?symbol="+encodeURIComponent(symbol)+"&interval="+encodeURIComponent(interval)+"&limit="+limit;
      const response=await fetch(url,{headers:{"Accept":"application/json"}});
      if(!response.ok)throw new Error("MARKET_DATA_HTTP_"+response.status);
      const raw=await response.json();
      const candles=raw.map(x=>({openTime:x[0],open:Number(x[1]),high:Number(x[2]),low:Number(x[3]),close:Number(x[4]),volume:Number(x[5]),closeTime:x[6]}));
      return json(res,200,{ok:true,source:"binance_public_market_data",symbol,interval,candles},req);
    }
    if(command==="trading/scan"){
      const symbol=String(input?.symbol||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
      const interval=String(input?.interval||"1m");
      const limit=Math.min(Math.max(Number(input?.limit)||120,60),500);
      const url="https://data-api.binance.vision/api/v3/klines?symbol="+encodeURIComponent(symbol)+"&interval="+encodeURIComponent(interval)+"&limit="+limit;
      const response=await fetch(url,{headers:{"Accept":"application/json"}});
      if(!response.ok)throw new Error("MARKET_DATA_HTTP_"+response.status);
      const raw=await response.json();
      const candles=raw.map(x=>({openTime:x[0],open:Number(x[1]),high:Number(x[2]),low:Number(x[3]),close:Number(x[4]),volume:Number(x[5]),closeTime:x[6]}));
      return json(res,200,{ok:true,source:"binance_public_market_data",data:scanOpportunity(candles,{symbol,interval})},req);
    }
    if(command==="binance/status")return json(res,200,{ok:true,data:await binanceStatus(process.env)},req);
    if(command==="freqtrade/status")return json(res,200,{ok:true,data:await freqtradeStatus(process.env)},req);
    if(command==="freqtrade/request"){
      const action=String(input?.action||"status");
      if(action==="start"&&await tradingKillSwitch())return json(res,403,{ok:false,error:"KILL_SWITCH_ACTIVE"},req);
      const data=await freqtradeRequest(action,input,process.env);
      return json(res,data?.ok?200:502,{ok:Boolean(data?.ok),data},req);
    }
    if(command==="binance/exchange-info")return json(res,200,{ok:true,data:await binanceExchangeInfo(input?.symbol,process.env)},req);
    if(command==="binance/balance")return json(res,200,{ok:true,data:await binanceBalance(process.env)},req);
    if(command==="binance/paper-order")return json(res,200,{ok:true,data:await binancePaperOrder(input,process.env)},req);
    if(command==="binance/order"){
      const killSwitch=await tradingKillSwitch()
      const gate=riskGate(input,{mode:"live",killSwitch},{equity:Number(input?.equity||20),open_positions:Number(input?.open_positions||0),daily_loss_pct:Number(input?.daily_loss_pct||0),duplicateOrder:Boolean(input?.duplicateOrder),dataStale:Boolean(input?.dataStale)});
      if(!gate.allowed)return json(res,403,{ok:false,error:"RISK_GATE_BLOCKED",gate},req);
      return json(res,200,{ok:true,data:await binanceOrder(input,process.env)},req);
    }
    if(command==="trading/adapter"){
      const action=String(input?.action||"");
      const data=await runAdapter(action,input,process.env);
      return json(res,200,data,req);
    }

    const p=await ensureBrowser();

    if(command==="browser/open"){
      const url=new URL(input.url);
      if(!/^https?:$/.test(url.protocol))throw new Error("Only HTTP(S) URLs are allowed");
      await p.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:30000});
      return json(res,200,{ok:true,url:p.url(),title:await p.title()},req);
    }
    if(command==="browser/new-tab"){
      page=await context.newPage();
      if(input.url){
        const url=new URL(input.url);
        if(!/^https?:$/.test(url.protocol))throw new Error("Only HTTP(S) URLs are allowed");
        await page.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:30000});
      }
      return json(res,200,{ok:true,index:context.pages().indexOf(page),url:page.url(),title:await page.title()},req);
    }
    if(command==="browser/select-tab"){
      page=requireIndex(input);
      return json(res,200,{ok:true,index:Number(input.index),url:page.url(),title:await page.title()},req);
    }
    if(command==="browser/wait"){
      const timeout=Math.min(Math.max(Number(input.timeout)||10000,250),30000);
      if(input.selector){
        await p.locator(String(input.selector)).first().waitFor({state:input.state==="hidden"?"hidden":"visible",timeout});
      }else if(input.text){
        await p.getByText(String(input.text),{exact:false}).first().waitFor({state:"visible",timeout});
      }else{
        await p.waitForTimeout(Math.min(timeout,5000));
      }
      return json(res,200,{ok:true,url:p.url()},req);
    }
    if(command==="browser/scroll"){
      const amount=Number(input.amount)||600;
      await p.mouse.wheel(0,amount);
      return json(res,200,{ok:true,url:p.url()},req);
    }
    if(command==="browser/analyze"){
      const text=await p.locator("body").innerText({timeout:10000});
      return json(res,200,{ok:true,url:p.url(),title:await p.title(),text:text.slice(0,50000)},req);
    }
    if(command==="browser/screenshot"){
      const data=(await p.screenshot({type:"png",fullPage:false})).toString("base64");
      return json(res,200,{ok:true,mime:"image/png",data},req);
    }
    if(command==="browser/click"){
      await p.locator(input.selector).first().click({timeout:10000});
      return json(res,200,{ok:true,url:p.url()},req);
    }
    if(command==="browser/fill"){
      await p.locator(input.selector).first().fill(String(input.value??""),{timeout:10000});
      return json(res,200,{ok:true},req);
    }
    if(command==="browser/state"){
      const title=await p.title();
      const text=(await p.locator("body").innerText({timeout:10000})).slice(0,30000);
      return json(res,200,{ok:true,url:p.url(),title,text},req);
    }
    if(command==="browser/links"){
      const links=await p.locator("a").evaluateAll(nodes=>nodes.slice(0,200).map(a=>({text:(a.innerText||a.textContent||"").trim().slice(0,240),url:a.href||"",title:a.getAttribute("title")||"",aria:a.getAttribute("aria-label")||""})).filter(x=>x.url));
      return json(res,200,{ok:true,url:p.url(),links},req);
    }
    if(command==="browser/tabs"){
      const tabs=context.pages().map((tab,i)=>({index:i,url:tab.url(),title:""}));
      for(let i=0;i<tabs.length;i++)tabs[i].title=await context.pages()[i].title().catch(()=> "");
      return json(res,200,{ok:true,tabs},req);
    }
    return json(res,404,{ok:false,error:"UNKNOWN_COMMAND"},req);
  }catch(error){return json(res,500,{ok:false,error:String(error?.message||error)},req)}
});
server.listen(PORT,"127.0.0.1",()=>{console.log("Emma Local Bridge listening on http://127.0.0.1:"+PORT);createBackup().catch(error=>console.error("Initial backup:",error));setInterval(()=>createBackup().catch(error=>console.error("Scheduled backup:",error)),24*60*60*1000)});
