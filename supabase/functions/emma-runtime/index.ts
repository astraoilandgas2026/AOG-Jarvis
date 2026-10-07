import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const VERSION="emma-runtime-1.0.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const serviceKey=()=>Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

function nextStatusForPrompt(prompt:string){
  const p=prompt.toLowerCase();
  if(/astra|proveedor|supplier|procurement|due diligence|\bdd\b/.test(p))return "astra";
  if(/trading|binance|btc|bitcoin|crypto|mercado|market/.test(p))return "trading";
  if(/estado|status|health|salud/.test(p))return "health";
  return "blocked";
}

function ema(values:number[],period:number){
  if(values.length<period)return null;
  const k=2/(period+1);let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<values.length;i++)e=values[i]*k+e*(1-k);
  return e;
}

async function runAstra(db:any){
  const [sup,offers,followups,dd]=await Promise.all([
    db.from("suppliers").select("id",{count:"exact",head:true}),
    db.from("commercial_offers").select("id",{count:"exact",head:true}),
    db.from("follow_ups").select("id",{count:"exact",head:true}).neq("status","done"),
    db.from("due_diligence").select("id",{count:"exact",head:true})
  ]);
  const errors=[sup,offers,followups,dd].filter(x=>x.error).map(x=>x.error.message);
  if(errors.length)throw new Error(errors.join("; "));
  return {workflow:"astra",evidence:[
    {source:"public.suppliers",count:sup.count??0},
    {source:"public.commercial_offers",count:offers.count??0},
    {source:"public.follow_ups",count:followups.count??0,status:"open"},
    {source:"public.due_diligence",count:dd.count??0}
  ]};
}

async function runTrading(){
  const url="https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=80";
  const response=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!response.ok)throw new Error("BINANCE_PUBLIC_MARKET_DATA_HTTP_"+response.status);
  const rows=await response.json();
  const closes=rows.map((r:any)=>Number(r[4])).filter(Number.isFinite);
  const fast=ema(closes,20),slow=ema(closes,50);
  if(fast===null||slow===null)throw new Error("INSUFFICIENT_MARKET_DATA");
  const last=closes.at(-1),prev=closes.at(-2);
  const momentum=(last/prev-1)*100,trend=(fast/slow-1)*100;
  const direction=trend>0&&momentum>0?"LONG":trend<0&&momentum<0?"SHORT":"NEUTRAL";
  const score=Math.max(0,Math.min(100,50+trend*120+momentum*80));
  return {workflow:"trading",mode:"research",execution:"disabled",symbol:"BTCUSDT",interval:"5m",
    evidence:[{source:"Binance public klines",count:closes.length}],
    signal:{direction,score:Number(score.toFixed(2)),last,ema20:fast,ema50:slow,momentum_pct:Number(momentum.toFixed(4)),action:score>=70&&direction!=="NEUTRAL"?"WATCH":score>=55&&direction!=="NEUTRAL"?"PAPER_ONLY":"NO_TRADE"}};
}

async function main(req:Request){
  const internalKey=req.headers.get("x-emma-scheduler-key")||"";
  const key=serviceKey();
  if(!key)return json({ok:false,error:"SERVICE_KEY_NOT_AVAILABLE"},500);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,key);
  const {data:authorized,error:authError}=await admin.rpc("emma_scheduler_authorize",{provided_key:internalKey});
  if(authError||authorized!==true)return json({ok:false,error:"SCHEDULER_UNAUTHORIZED"},401);
  const {data:jobs,error}=await admin.rpc("claim_due_emma_automations",{p_limit:20});
  if(error)return json({ok:false,error:"CLAIM_FAILED",detail:error.message},500);
  const results:any[]=[];
  for(const job of jobs||[]){
    const run={automation_id:job.id,user_id:job.user_id,status:"running",trigger_type:"schedule",prompt:job.prompt,input:{cadence:job.cadence,cron:job.automation_cron},started_at:new Date().toISOString()};
    const inserted=await admin.from("emma_automation_runs").insert(run).select("id").single();
    if(inserted.error){results.push({automation_id:job.id,status:"failed",error:inserted.error.message});continue;}
    const runId=inserted.data.id;
    try{
      const workflow=nextStatusForPrompt(job.prompt);
      let result:any;
      if(workflow==="astra")result=await runAstra(admin);
      else if(workflow==="trading")result=await runTrading();
      else if(workflow==="health")result={workflow:"health",runtime:VERSION,status:"healthy"};
      else result={workflow:"blocked",reason:"PROMPT_REQUIRES_INTERACTIVE_EMMA",execution:false};
      const status=workflow==="blocked"?"blocked":"verified";
      await admin.from("emma_automation_runs").update({status,result,evidence:result.evidence||[],completed_at:new Date().toISOString()}).eq("id",runId);
      results.push({automation_id:job.id,run_id:runId,status,workflow,result});
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      await admin.from("emma_automation_runs").update({status:"failed",error:message,completed_at:new Date().toISOString()}).eq("id",runId);
      results.push({automation_id:job.id,run_id:runId,status:"failed",error:message});
    }
  }
  await admin.from("emma_runtime_heartbeats").upsert({id:true,status:"healthy",version:VERSION,last_run_at:new Date().toISOString(),last_success_at:new Date().toISOString(),last_error:null,metadata:{jobs_claimed:jobs?.length||0,results},updated_at:new Date().toISOString()});
  return json({ok:true,version:VERSION,jobs_claimed:jobs?.length||0,results});
}

Deno.serve(main);
