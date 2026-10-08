import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500","http://127.0.0.1:5500"]);
function cors(req:Request){const origin=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}

Deno.serve(async(req:Request)=>{
  const headers=cors(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...headers,"Content-Type":"application/json"}});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer "))return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...headers,"Content-Type":"application/json"}});
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2.95.0");
  const db=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});
  const {data,error}=await db.auth.getUser();
  if(error||!data.user)return new Response(JSON.stringify({error:"Invalid authentication"}),{status:401,headers:{...headers,"Content-Type":"application/json"}});
  const {data:authorized,error:authorizationError}=await db.rpc("emma_is_authorized");
  if(authorizationError||authorized!==true) return new Response(JSON.stringify({error:"Forbidden"}),{status:403,headers:{...headers,"Content-Type":"application/json"}});
  let body:any={}; try{body=await req.json()}catch{}
  const repository=typeof body.repository==="string"?body.repository.trim():"";
  const path=typeof body.path==="string"?body.path.trim():"";
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))return new Response(JSON.stringify({error:"Invalid repository"}),{status:400,headers:{...headers,"Content-Type":"application/json"}});
  if(path.includes(".."))return new Response(JSON.stringify({error:"Invalid path"}),{status:400,headers:{...headers,"Content-Type":"application/json"}});
  const url=`https://api.github.com/repos/${repository}/contents/${path}`;
  const gh=await fetch(url,{headers:{"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"AOG-Jarvis"}});
  const payload=await gh.json().catch(()=>({}));
  if(!gh.ok)return new Response(JSON.stringify({error:"GitHub request failed",status:gh.status,detail:payload?.message??null}),{status:gh.status===404?404:502,headers:{...headers,"Content-Type":"application/json"}});
  if(!Array.isArray(payload) && payload.type==="file"){
    const decoded=payload.encoding==="base64"?atob(String(payload.content??"").replace(/\s/g,"")):String(payload.content??"");
    return new Response(JSON.stringify({ok:true,user_id:data.user.id,repository,path,content:decoded,sha:payload.sha,url:payload.html_url}),{status:200,headers:{...headers,"Content-Type":"application/json"}});
  }
  return new Response(JSON.stringify({ok:true,user_id:data.user.id,repository,path,items:Array.isArray(payload)?payload.map((x:any)=>({name:x.name,path:x.path,type:x.type,sha:x.sha,url:x.html_url})):payload}),{status:200,headers:{...headers,"Content-Type":"application/json"}});
});