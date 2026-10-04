import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex");
const PROFILE_DIR=process.env.EMMA_BROWSER_PROFILE||path.join(os.homedir(),".emma","browser-profile");
const ALLOWED_ORIGINS=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://127.0.0.1:3000"]);

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

const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{},req);
  try{
    if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Local Bridge",version:"1.1",capabilities:["browser","web-analysis","screenshot","persistent-session"],token_required:true,pairing_token:TOKEN},req);
    if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"},req);
    if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"},req);
    const command=req.url.slice(4),input=await body(req),p=await ensureBrowser();
    if(command==="browser/open"){
      const url=new URL(input.url);if(!/^https?:$/.test(url.protocol))throw new Error("Only HTTP(S) URLs are allowed");
      await p.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:30000});return json(res,200,{ok:true,url:p.url(),title:await p.title()},req);
    }
    if(command==="browser/analyze"){
      const text=await p.locator("body").innerText({timeout:10000});return json(res,200,{ok:true,url:p.url(),title:await p.title(),text:text.slice(0,50000)},req);
    }
    if(command==="browser/screenshot"){
      const data=(await p.screenshot({type:"png",fullPage:false})).toString("base64");return json(res,200,{ok:true,mime:"image/png",data},req);
    }
    if(command==="browser/click"){await p.locator(input.selector).first().click({timeout:10000});return json(res,200,{ok:true,url:p.url()},req)}
    if(command==="browser/fill"){await p.locator(input.selector).first().fill(String(input.value??""),{timeout:10000});return json(res,200,{ok:true},req)}
    if(command==="browser/state"){
      const title=await p.title();const text=(await p.locator("body").innerText({timeout:10000})).slice(0,30000);
      return json(res,200,{ok:true,url:p.url(),title,text},req);
    }
    if(command==="browser/tabs"){
      const tabs=context.pages().map((tab,i)=>({index:i,url:tab.url(),title:""}));
      for(let i=0;i<tabs.length;i++)tabs[i].title=await context.pages()[i].title().catch(()=> "");
      return json(res,200,{ok:true,tabs},req);
    }
    return json(res,404,{ok:false,error:"UNKNOWN_COMMAND"},req);
  }catch(error){return json(res,500,{ok:false,error:String(error?.message||error)},req)}
});
server.listen(PORT,"127.0.0.1",()=>console.log("Emma Local Bridge listening on http://127.0.0.1:"+PORT));
