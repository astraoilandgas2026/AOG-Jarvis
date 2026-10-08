import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const origins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500","http://127.0.0.1:5500"]);
function cors(req:Request){const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":origins.has(o)?o:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}

Deno.serve(async(req)=>{
 const h=cors(req);
 if(req.method==="OPTIONS") return new Response("ok",{headers:h});
 const auth=req.headers.get("Authorization");
 if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...h,"Content-Type":"application/json"}});
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data,error}=await db.auth.getUser();
 if(error||!data.user) return new Response(JSON.stringify({error:"Invalid authentication"}),{status:401,headers:{...h,"Content-Type":"application/json"}});
  const {data:authorized,error:authorizationError}=await db.rpc("emma_is_authorized");
  if(authorizationError||authorized!==true) return new Response(JSON.stringify({error:"Forbidden"}),{status:403,headers:{...h,"Content-Type":"application/json"}});
 const groq=!!Deno.env.get("GROQ_API_KEY");
 const gemini=!!Deno.env.get("GEMINI_API_KEY");
 return new Response(JSON.stringify({ok:true,user_id:data.user.id,is_anonymous:data.user.is_anonymous,providers:{groq_configured:groq,gemini_configured:gemini},message:groq||gemini?"AI provider credentials detected":"No AI provider credentials configured"}),{status:200,headers:{...h,"Content-Type":"application/json"}});
});