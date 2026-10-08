import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
const VERSION="emma-mobile-relay-1.0.0";
const url=Deno.env.get("SUPABASE_URL")!;
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-emma-device-token","Access-Control-Allow-Methods":"POST,OPTIONS"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function deviceFor(req:Request, requireOnline=true){const raw=req.headers.get("x-emma-device-token")||"";if(raw.length<32)return null;const hash=await sha256(raw);let q=db.from("emma_mobile_devices").select("id,user_id,device_key,device_name,platform,app_version,capabilities,status,last_seen_at").eq("device_token_hash",hash);if(requireOnline)q=q.eq("status","online");const {data,error}=await q.maybeSingle();if(error||!data)return null;return {...data,tokenHash:hash}}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{status:204,headers});
 if(req.method!=="POST")return out({error:"METHOD_NOT_ALLOWED"},405);
 let body:any={};try{body=await req.json()}catch{return out({error:"INVALID_JSON"},400)}
 const op=String(body?.op||"");
 if(op==="pair"){
  const code=String(body?.pairing_code||"").trim(),deviceKey=String(body?.device_key||"").trim();
  if(!code||deviceKey.length<16)return out({error:"PAIRING_DATA_REQUIRED"},400);
  const codeHash=await sha256(code);
  const {data:pair,error:pe}=await db.from("emma_mobile_pairings").select("id,user_id,expires_at,consumed_at").eq("code_hash",codeHash).is("consumed_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(pe)return out({error:"PAIRING_LOOKUP_FAILED"},500);
  if(!pair)return out({error:"PAIRING_CODE_INVALID_OR_EXPIRED"},401);
  const deviceToken=token(),tokenHash=await sha256(deviceToken);
  const payload={user_id:pair.user_id,device_key:deviceKey,device_name:String(body.device_name||"Emma Samsung").slice(0,120),platform:String(body.platform||"android-termux").slice(0,40),app_version:String(body.app_version||VERSION).slice(0,80),capabilities:Array.isArray(body.capabilities)?body.capabilities.slice(0,30):[],status:"online",last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString(),device_token_hash:tokenHash};
  const {data:device,error:de}=await db.from("emma_mobile_devices").upsert(payload,{onConflict:"user_id,device_key"}).select("id,device_key,device_name,platform,app_version,capabilities,status,last_seen_at").single();
  if(de)return out({error:"PAIRING_DEVICE_FAILED",detail:de.message},500);
  const {error:ce}=await db.from("emma_mobile_pairings").update({consumed_at:new Date().toISOString()}).eq("id",pair.id).is("consumed_at",null);
  if(ce)return out({error:"PAIRING_CONSUME_FAILED"},500);
  return out({ok:true,version:VERSION,device,device_token:deviceToken});
 }
 const opRequiresOnline=new Set(["poll","complete"]);const device=await deviceFor(req,!["heartbeat","status"].includes(op));if(!device)return out({error:"DEVICE_AUTH_REQUIRED"},401);
 if(op==="heartbeat"){
  const {data,error}=await db.from("emma_mobile_devices").update({status:"online",last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString(),device_name:String(body.device_name||device.device_name).slice(0,120),app_version:String(body.app_version||device.app_version).slice(0,80),capabilities:Array.isArray(body.capabilities)?body.capabilities.slice(0,30):device.capabilities}).eq("id",device.id).select("id,device_key,device_name,platform,app_version,capabilities,status,last_seen_at").single();
  if(error)return out({error:"HEARTBEAT_FAILED",detail:error.message},500);return out({ok:true,version:VERSION,device:data});
 }
 if(op==="poll"){
  const {data,error}=await db.rpc("emma_claim_mobile_tasks_by_token",{p_device_token_hash:device.tokenHash,p_limit:Math.min(Number(body.limit)||5,20)});
  if(error)return out({error:"POLL_FAILED",detail:error.message},500);return out({ok:true,tasks:data||[]});
 }
 if(op==="complete"){
  const taskId=String(body.task_id||""),status=String(body.status||"completed");if(!taskId||!["completed","failed","cancelled"].includes(status))return out({error:"INVALID_COMPLETION"},400);
  const {data,error}=await db.from("emma_mobile_tasks").update({status,result:body.result&&typeof body.result==="object"?body.result:{},error:body.error?String(body.error).slice(0,2000):null,completed_at:new Date().toISOString()}).eq("id",taskId).eq("device_id",device.id).eq("user_id",device.user_id).select("id,status,completed_at").single();
  if(error)return out({error:"COMPLETE_FAILED",detail:error.message},500);return out({ok:true,task:data});
 }
 if(op==="status")return out({ok:true,device});
 return out({error:"UNKNOWN_OPERATION"},400);
});