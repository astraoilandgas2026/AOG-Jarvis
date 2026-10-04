import http from "node:http";
import crypto from "node:crypto";
import { chromium } from "playwright";

const PORT=Number(process.env.EMMA_BRIDGE_PORT||43177);
const TOKEN=process.env.EMMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString("hex");
let browser=null;
let context=null;
let page=null;

function json(res,status,data){
  const body=JSON.stringify(data);
  res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"http://localhost:3000","Access-Control-Allow-Headers":"Content-Type, X-Emma-Token","Access-Control-Allow-Methods":"GET,POST,OPTIONS"});
  res.end(body);
}
function auth(req){return req.headers["x-emma-token"]===TOKEN}
async function body(req){let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}}

async function ensureBrowser(){
  if(!browser) browser=await chromium.launch({headless:false});
  if(!context) context=await browser.newContext({viewport:{width:1440,height:900}});
  if(!page) page=await context.newPage();
  return page;
}

const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{});
  try{
    if(req.url==="/health")return json(res,200,{ok:true,name:"Emma Local Bridge",version:"1.0",capabilities:["browser","web-analysis","screenshot"],token_required:true});
    if(!auth(req))return json(res,401,{ok:false,error:"AUTH_REQUIRED"});
    if(req.method!=="POST"||!req.url.startsWith("/v1/"))return json(res,404,{ok:false,error:"NOT_FOUND"});
    const command=req.url.slice(4), input=await body(req), p=await ensureBrowser();
    if(command==="browser/open"){
      const url=new URL(input.url); if(!/^https?:$/.test(url.protocol))throw new Error("Only HTTP(S) URLs are allowed");
      await p.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:30000});
      return json(res,200,{ok:true,url:p.url(),title:await p.title()});
    }
    if(command==="browser/analyze"){
      const text=await p.locator("body").innerText({timeout:10000});
      return json(res,200,{ok:true,url:p.url(),title:await p.title(),text:text.slice(0,50000)});
    }
    if(command==="browser/screenshot"){
      const data=(await p.screenshot({type:"png",fullPage:false})).toString("base64");
      return json(res,200,{ok:true,mime:"image/png",data});
    }
    if(command==="browser/click"){
      await p.locator(input.selector).first().click({timeout:10000});
      return json(res,200,{ok:true,url:p.url()});
    }
    if(command==="browser/fill"){
      await p.locator(input.selector).first().fill(String(input.value??""),{timeout:10000});
      return json(res,200,{ok:true});
    }
    return json(res,404,{ok:false,error:"UNKNOWN_COMMAND"});
  }catch(error){return json(res,500,{ok:false,error:String(error?.message||error)})}
});
server.listen(PORT,"127.0.0.1",()=>console.log(`Emma Local Bridge listening on http://127.0.0.1:${PORT}`));
