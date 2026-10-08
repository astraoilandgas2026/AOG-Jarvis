import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";

const origins = new Set([
  "https://astraoilandgas2026.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
const cors=(req:Request)=>{const origin=req.headers.get("Origin")??"";return {
  "Access-Control-Allow-Origin":origins.has(origin)?origin:"null",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}};
const json=(body:unknown,status:number,h:Record<string,string>)=>new Response(JSON.stringify(body),{status,headers:{...h,"Content-Type":"application/json"}});

const HOSTINGER_API="https://api.hostinger.com/api/v1";
async function hostinger(path:string,init:RequestInit={}) {
  const token=Deno.env.get("HOSTINGER_API_TOKEN"); if(!token) throw new Error("HOSTINGER_API_TOKEN no configurado");
  const r=await fetch(HOSTINGER_API+path,{...init,headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json",...(init.headers??{})}});
  const raw=await r.text(); let body:any=null; try{body=raw?JSON.parse(raw):null}catch{body=raw}
  if(!r.ok) throw new Error(body?.error||body?.message||`Hostinger API ${r.status}`);
  return body;
}
async function authorized(req:Request){
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) throw new Error("Authentication required");
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data,error}=await db.auth.getUser();
  if(error||!data.user) throw new Error("Invalid authentication");
  const {data:ok,error:ae}=await db.rpc("emma_is_authorized");
  if(ae||ok!==true) throw new Error("Forbidden");
  return {user:data.user};
}
async function mailbox(){
  const me=await hostinger("/me");
  const mailboxes=me?.data?.mailboxes??[];
  const wanted=Deno.env.get("HOSTINGER_MAILBOX");
  const box=wanted?mailboxes.find((m:any)=>m.address===wanted||m.resourceId===wanted):mailboxes[0];
  if(!box) throw new Error("No se encontró un buzón Hostinger autorizado");
  return box;
}
Deno.serve(async(req:Request)=>{
  const h=cors(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers:h});
  if(req.method!=="POST")return json({error:"Method not allowed"},405,h);
  try{
    const {user}=await authorized(req);
    const body=await req.json();
    const action=typeof body.action==="string"?body.action:"list";
    const box=await mailbox();
    const id=encodeURIComponent(box.resourceId);
    if(action==="list"||action==="search"){
      const page=Math.min(Math.max(Number(body.page)||1,1),10);
      const data=await hostinger(`/mailboxes/${id}/folders/INBOX/messages?page=${page}&perPage=50&sort=-uid`);
      let messages=data?.data??[];
      if(action==="search"){
        const q=String(body.q??"").trim().toLowerCase();
        if(q) messages=messages.filter((m:any)=>String(m?.subject??"").toLowerCase().includes(q)||String(m?.from?.address??"").toLowerCase().includes(q));
      }
      return json({ok:true,provider:"hostinger",mailbox:box.address,user_id:user.id,count:messages.length,pagination:data?.pagination??null,data:messages},200,h);
    }
    if(action==="read"){
      const uid=Number(body.uid); if(!Number.isInteger(uid)||uid<1)return json({error:"uid requerido"},400,h);
      const data=await hostinger(`/mailboxes/${id}/folders/INBOX/messages/${uid}/text`);
      return json({ok:true,provider:"hostinger",mailbox:box.address,uid,data},200,h);
    }
    if(action==="send"){
      const to=Array.isArray(body.to)?body.to:[body.to].filter(Boolean);
      const subject=String(body.subject??"").trim(),textBody=String(body.text??"");
      if(!to.length||!subject||!textBody)return json({error:"to, subject y text son obligatorios"},400,h);
      if(to.length>50)return json({error:"Máximo 50 destinatarios"},400,h);
      const payload:any={to,subject,text:textBody,displayName:"Astra Oil & Gas"};
      if(body.cc)payload.cc=Array.isArray(body.cc)?body.cc:[body.cc];
      if(body.bcc)payload.bcc=Array.isArray(body.bcc)?body.bcc:[body.bcc];
      if(body.html)payload.html=String(body.html);
      if(body.inReplyTo?.uid)payload.inReplyTo={folder:"INBOX",uid:Number(body.inReplyTo.uid)};
      await hostinger(`/mailboxes/${id}/send`,{method:"POST",body:JSON.stringify(payload)});
      return json({ok:true,provider:"hostinger",mailbox:box.address,sent:true},200,h);
    }
    return json({error:"Acción no disponible"},400,h);
  }catch(error){
    const message=error instanceof Error?error.message:"Unknown error";
    const status=/Authentication|Invalid authentication/.test(message)?401:/Forbidden/.test(message)?403:502;
    return json({ok:false,error:message},status,h);
  }
});