import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const SECRET_HASH="40d1eebd795f54bd931366cbb9f0c3f50b34be66bfc4aa1fc06a3db7627b8ab1";
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
async function h(v:string){const x=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(x)].map(n=>n.toString(16).padStart(2,"0")).join("")}
const pp=(v:string)=>String(v||"BTCUSD").toUpperCase()==="BTCUSD"?"XBTUSD":String(v||"BTCUSD").toUpperCase();
async function k(ep:string,p:Record<string,string>={}){const q=new URLSearchParams(p).toString(),r=await fetch("https://api.kraken.com/0/public/"+ep+(q?"?"+q:"")),d=await r.json();if(!r.ok||d?.error?.length)throw new Error(String(d?.error?.join("; ")||"KRAKEN_ERROR"));return d.result}
async function px(p:string){const pair=pp(p),d=await k("Ticker",{pair}),key=Object.keys(d)[0],price=Number(d[key]?.c?.[0]);if(!Number.isFinite(price))throw new Error("KRAKEN_PRICE_UNAVAILABLE");return{pair,price}}
async function runPaper(userId:string,p:any){
 const {data:a,error}=await db.from("emma_cloud_paper_accounts").select("*").eq("user_id",userId).maybeSingle();if(error)throw error;
 const s=a||{user_id:userId,cash:10000,positions:{},orders:[],history:[]},action=String(p?.action||"status");
 if(["status","balance"].includes(action))return{ok:true,mode:"cloud-paper",cash:Number(s.cash),positions:s.positions||{},orders:action==="status"?s.orders||[]:undefined};
 if(action==="orders")return{ok:true,mode:"cloud-paper",orders:s.orders||[]};
 if(action==="history")return{ok:true,mode:"cloud-paper",history:s.history||[]};
 if(!["buy","sell"].includes(action))throw new Error("PAPER_ACTION_INVALID");
 const vol=Number(p?.volume||"0.001");if(!Number.isFinite(vol)||vol<=0)throw new Error("PAPER_VOLUME_INVALID");
 const q=await px(String(p?.pair||"BTCUSD")),positions={...(s.positions||{})},cur=Number(positions[q.pair]||0),notional=q.price*vol;
 if(action==="buy"){if(Number(s.cash)<notional)throw new Error("PAPER_INSUFFICIENT_CASH");s.cash=Number(s.cash)-notional;positions[q.pair]=cur+vol}
 else{if(cur<vol)throw new Error("PAPER_INSUFFICIENT_POSITION");s.cash=Number(s.cash)+notional;positions[q.pair]=cur-vol;if(Math.abs(positions[q.pair])<1e-12)delete positions[q.pair]}
 const order={id:crypto.randomUUID(),side:action,pair:q.pair,volume:vol,price:q.price,notional,created_at:new Date().toISOString(),status:"filled",mode:"cloud-paper"};
 const ue=await db.from("emma_cloud_paper_accounts").upsert({user_id:userId,cash:s.cash,positions,orders:[order,...(s.orders||[])].slice(0,200),history:[order,...(s.history||[])].slice(0,500),updated_at:new Date().toISOString()},{onConflict:"user_id"});if(ue.error)throw ue.error;
 return{ok:true,mode:"cloud-paper",order,balance:{cash:s.cash,positions}}
}
async function runTask(t:any){const p=t.payload||{};if(t.task_type==="kraken_status")return{ok:true,mode:"cloud",data:await k("SystemStatus")};if(t.task_type==="kraken_ticker")return{ok:true,mode:"cloud",...(await px(String(p.pair||"BTCUSD")))};if(t.task_type==="kraken_workspace_create")return{ok:true,mode:"cloud-paper",workspace:String(p.name||"emma-paper"),capital:Number(p.capital||10000)};if(t.task_type==="kraken_paper")return runPaper(String(t.user_id),p);throw new Error("CLOUD_TASK_TYPE_NOT_ALLOWED")}
Deno.serve(async req=>{
 if(req.method!=="POST"||await h(req.headers.get("x-emma-worker-secret")||"")!==SECRET_HASH)return out({error:"UNAUTHORIZED"},401);
 await db.from("emma_mobile_devices").update({status:"offline",updated_at:new Date().toISOString()}).eq("status","online").lt("last_seen_at",new Date(Date.now()-60000).toISOString());
 const {data:tasks,error}=await db.from("emma_mobile_tasks").select("id,user_id,device_id,task_type,payload,status").eq("status","queued").in("task_type",["kraken_status","kraken_ticker","kraken_workspace_create","kraken_paper"]).order("created_at",{ascending:true}).limit(10);
 if(error)return out({error:"QUEUE_READ_FAILED",detail:error.message},500);
 const results=[];
 for(const task of tasks||[]){
  if(task.device_id){const {data:d}=await db.from("emma_mobile_devices").select("status,last_seen_at").eq("id",task.device_id).maybeSingle();if(d?.status==="online"&&d?.last_seen_at&&new Date(d.last_seen_at).getTime()>Date.now()-60000)continue}
  const claim=await db.from("emma_mobile_tasks").update({status:"running",claimed_at:new Date().toISOString(),device_id:null}).eq("id",task.id).eq("status","queued").select("id").maybeSingle();if(claim.error||!claim.data)continue;
  try{const result=await runTask(task);await db.from("emma_mobile_tasks").update({status:"completed",result,error:null,completed_at:new Date().toISOString()}).eq("id",task.id);results.push({id:task.id,status:"completed"})}
  catch(e){await db.from("emma_mobile_tasks").update({status:"failed",result:{},error:String((e as Error)?.message||e),completed_at:new Date().toISOString()}).eq("id",task.id);results.push({id:task.id,status:"failed"})}
 }
 return out({ok:true,processed:results.length,results})
});