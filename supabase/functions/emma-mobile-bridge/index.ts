import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
const VERSION="emma-mobile-bridge-1.0.0";
const allowedOrigins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500"]);
function hdr(req){const o=req.headers.get("Origin")||"";return {"Access-Control-Allow-Origin":allowedOrigins.has(o)?o:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"}}
function out(req,b,s=200){return new Response(JSON.stringify(b),{status:s,headers:hdr(req)})}
function uid(req){const a=req.headers.get("Authorization")||"";if(!a.startsWith("Bearer "))return "";try{const p=JSON.parse(atob(a.slice(7).split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));return typeof p.sub==="string"?p.sub:""}catch{return ""}}
Deno.serve(async req=>{
if(req.method==="OPTIONS")return new Response("ok",{headers:hdr(req)});
if(req.method!=="POST")return out(req,{error:"METHOD_NOT_ALLOWED"},405);
const userId=uid(req);if(!userId)return out(req,{error:"AUTH_REQUIRED"},401);
const auth=req.headers.get("Authorization")!;
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
let body:any;try{body=await req.json()}catch{return out(req,{error:"INVALID_JSON"},400)}
const op=String(body?.op||"");
if(op==="heartbeat"){
const deviceKey=String(body.device_key||"").slice(0,160);if(!deviceKey)return out(req,{error:"DEVICE_KEY_REQUIRED"},400);
const payload={user_id:userId,device_key:deviceKey,device_name:String(body.device_name||"Emma Mobile").slice(0,120),platform:String(body.platform||"android").slice(0,40),app_version:String(body.app_version||VERSION).slice(0,80),capabilities:Array.isArray(body.capabilities)?body.capabilities.slice(0,30):[],status:"online",last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()};
const {data,error}=await db.from("emma_mobile_devices").upsert(payload,{onConflict:"user_id,device_key"}).select("id,device_key,device_name,platform,app_version,capabilities,status,last_seen_at").single();
if(error)return out(req,{error:"HEARTBEAT_FAILED",detail:error.message},500);return out(req,{ok:true,version:VERSION,device:data});
}
if(op==="poll"){
const deviceKey=String(body.device_key||"").slice(0,160);if(!deviceKey)return out(req,{error:"DEVICE_KEY_REQUIRED"},400);
const {data,error}=await db.rpc("emma_claim_mobile_tasks",{p_device_key:deviceKey,p_limit:Math.min(Number(body.limit)||5,20)});
if(error)return out(req,{error:"POLL_FAILED",detail:error.message},500);return out(req,{ok:true,tasks:data||[]});
}
if(op==="complete"){
const taskId=String(body.task_id||""),status=String(body.status||"completed");
if(!taskId||!["completed","failed","cancelled"].includes(status))return out(req,{error:"INVALID_COMPLETION"},400);
const {data,error}=await db.from("emma_mobile_tasks").update({status,result:body.result&&typeof body.result==="object"?body.result:{},error:body.error?String(body.error).slice(0,2000):null,completed_at:new Date().toISOString()}).eq("id",taskId).eq("user_id",userId).select("id,status,completed_at").single();
if(error)return out(req,{error:"COMPLETE_FAILED",detail:error.message},500);return out(req,{ok:true,task:data});
}
if(op==="status"){
const {data,error}=await db.from("emma_mobile_devices").select("id,device_key,device_name,platform,app_version,capabilities,status,last_seen_at,updated_at").eq("user_id",userId).order("last_seen_at",{ascending:false}).limit(10);
if(error)return out(req,{error:"STATUS_FAILED",detail:error.message},500);return out(req,{ok:true,devices:data||[]});
}
return out(req,{error:"UNKNOWN_OPERATION"},400);
});
