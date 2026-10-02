import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
const origins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500","http://127.0.0.1:5500"]);
const cors=(req:Request)=>{const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":origins.has(o)?o:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}};
const json=(body:unknown,status:number,h:Record<string,string>)=>new Response(JSON.stringify(body),{status,headers:{...h,"Content-Type":"application/json"}});
const safePath=(p:string)=>typeof p==="string"&&p.length>0&&!p.includes("..")&&!/^(.env|.*\.pem|.*\.key)$/i.test(p);
Deno.serve(async(req:Request)=>{
 const h=cors(req);
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,h);
 const auth=req.headers.get("Authorization");
 if(!auth?.startsWith("Bearer "))return json({error:"Authentication required"},401,h);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data:userData,error:authError}=await db.auth.getUser();
 if(authError||!userData.user)return json({error:"Invalid authentication"},401,h);
 let body:any;try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400,h)}
 const action=String(body.action||"").toLowerCase();
 if(action==="propose"){
   const requestText=String(body.request_text||"").trim();
   const files=Array.isArray(body.requested_files)?body.requested_files.filter(safePath):[];
   const validation=Array.isArray(body.validation_plan)?body.validation_plan.slice(0,20):[];
   if(requestText.length<5)return json({error:"request_text required"},400,h);
   if(files.length>20)return json({error:"Too many requested files"},400,h);
   const row={user_id:userData.user.id,request_text:requestText.slice(0,4000),repository:"astraoilandgas2026/AOG-Jarvis",base_branch:"main",target_branch:null,requested_files:files,validation_plan:validation,status:"proposed",metadata:{safe_mode:true,executor:"external_github_controlled"}};
   const {data,error}=await db.from("emma_code_change_requests").insert(row).select("id,request_text,repository,base_branch,requested_files,validation_plan,status,created_at").single();
   if(error)return json({error:"Change request save failed",detail:error.message},500,h);
   return json({ok:true,action,data,github_write_configured:Boolean(Deno.env.get("GITHUB_TOKEN"))},200,h);
 }
 if(action==="list"){
   const {data,error}=await db.from("emma_code_change_requests").select("id,request_text,repository,base_branch,target_branch,requested_files,validation_plan,status,base_sha,head_sha,rollback_sha,test_result,created_at,updated_at").eq("user_id",userData.user.id).order("created_at",{ascending:false}).limit(Math.min(Math.max(Number(body.limit)||20,1),50));
   if(error)return json({error:"Change request list failed",detail:error.message},500,h);
   return json({ok:true,action,count:data?.length||0,data:data||[]},200,h);
 }
 return json({error:"Unsupported action"},400,h);
});