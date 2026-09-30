import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const allowedOrigins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500"]);
function cors(req:Request){const origin=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}
type Message={role:"user"|"assistant"|"system";content:string};

async function callGroq(apiKey:string,messages:Message[]){
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages,temperature:0.2,max_tokens:500})});
  const data=await response.json();
  if(!response.ok)throw new Error(data?.error?.message??"Groq request failed");
  return data?.choices?.[0]?.message?.content??"";
}

Deno.serve(async(req:Request)=>{
  const headers=cors(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...headers,"Content-Type":"application/json"}});
  const authorization=req.headers.get("Authorization");
  if(!authorization?.startsWith("Bearer "))return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...headers,"Content-Type":"application/json"}});
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}}});
  const {data:userData,error:userError}=await db.auth.getUser();
  if(userError||!userData.user)return new Response(JSON.stringify({error:"Invalid authentication"}),{status:401,headers:{...headers,"Content-Type":"application/json"}});
  let body:{message?:string;history?:Array<{role:"user"|"assistant";content:string}>};
  try{body=await req.json()}catch{return new Response(JSON.stringify({error:"Invalid JSON body"}),{status:400,headers:{...headers,"Content-Type":"application/json"}})}
  const message=typeof body.message==="string"?body.message.trim():"";
  if(!message)return new Response(JSON.stringify({error:"Message required"}),{status:400,headers:{...headers,"Content-Type":"application/json"}});
  const apiKey=Deno.env.get("GROQ_API_KEY");
  if(!apiKey)return new Response(JSON.stringify({error:"AI provider not configured"}),{status:503,headers:{...headers,"Content-Type":"application/json"}});
  const history=(Array.isArray(body.history)?body.history:[]).filter(x=>x&&typeof x.content==="string"&&(x.role==="user"||x.role==="assistant")).slice(-10);
  const messages:Message[]=[{role:"system",content:"Eres Jarvis de Astra Oil & Gas. Responde en español, directo y útil. No inventes datos. Si una pregunta requiere datos del Procurement OS, indica que debe usar una herramienta de Astra en lugar de suponer."},...history,{role:"user",content:message}];
  try{
    const text=await callGroq(apiKey,messages);
    return new Response(JSON.stringify({ok:true,user_id:userData.user.id,provider:"groq",text}),{status:200,headers:{...headers,"Content-Type":"application/json"}});
  }catch(error){
    return new Response(JSON.stringify({error:"AI request failed",detail:error instanceof Error?error.message:"Unknown provider error"}),{status:502,headers:{...headers,"Content-Type":"application/json"}});
  }
});