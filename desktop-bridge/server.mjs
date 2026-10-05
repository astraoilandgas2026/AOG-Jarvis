import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex");
const PROFILE_DIR=process.env.EMMA_BROWSER_PROFILE||path.join(os.homedir(),".emma","browser-profile");
const BACKUP_DIR=path.join(os.homedir(),".emma","backups");
const ALLOWED_ORIGINS=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://127.0.0.1:3000"]);
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
function json(res,status,data,req){
  const body=JSON.stringify(data);
  res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":corsOrigin(req),"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"Content-Type, X-Emma-Token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Private-Network":"true","Vary":"Origin"});
  res.end(body);
}
function auth(req){return req.headers["x-emma-token"]===TOKEN}
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
    if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Local Bridge",version:"1.4",capabilities:["browser","web-analysis","links","screenshot","persistent-session","multi-tab","wait","backup"],token_required:true,pairing_token:TOKEN},req);
    if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"},req);
    if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"},req);
    const command=req.url.slice(4),input=await body(req);
    if(command==="backup/create")return json(res,200,await createBackup(),req);
    if(command==="backup/status")return json(res,200,await backupStatus(),req);

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
