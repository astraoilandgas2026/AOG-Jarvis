const TERMINAL_STATUSES=new Set(["verified","failed","blocked"]);

export function createAutonomyRun({query="",intent=null,steps=[]}={}){
  return {id:null,query,intent,started_at:new Date().toISOString(),status:"planned",steps:steps.map((s,i)=>({id:s.id||String(i+1),tool:s.tool||s.id||String(i+1),status:"planned",attempts:0,evidence:null,error:null})),evidence:[],memory_events:[],finished_at:null};
}

export function startRun(run){
  if(!run||run.status!=="planned") return {ok:false,error:"RUN_NOT_PLANNED"};
  return {...run,status:"running"};
}

export function recordExecution(run,stepId,result){
  if(!run||run.status!=="running") return {ok:false,error:"RUN_NOT_RUNNING"};
  const steps=run.steps.map(s=>s.id===stepId?{...s,status:result?.ok===false?"failed":"executed",attempts:s.attempts+1,result:result?.data??result,error:result?.error??null}:s);
  return {...run,steps};
}

export function verifyStep(run,stepId,verification={}){
  if(!run||run.status!=="running") return {ok:false,error:"RUN_NOT_RUNNING"};
  const step=run.steps.find(s=>s.id===stepId); if(!step)return {ok:false,error:"STEP_NOT_FOUND"};
  const passed=verification.passed===true;
  const evidence=verification.evidence??null;
  const steps=run.steps.map(s=>s.id===stepId?{...s,status:passed?"verified":"failed",verified_at:new Date().toISOString(),evidence,error:passed?null:(verification.error||"VERIFICATION_FAILED")}:s);
  const allTerminal=steps.every(s=>TERMINAL_STATUSES.has(s.status));
  const anyFailed=steps.some(s=>s.status==="failed");
  return {...run,steps,status:allTerminal?(anyFailed?"failed":"verified"):"running",evidence:evidence?[...run.evidence,{step_id:stepId,...evidence}]:run.evidence,finished_at:allTerminal?new Date().toISOString():null};
}

export function recordMemoryEvent(run,event){
  if(!run)return {ok:false,error:"RUN_REQUIRED"};
  return {...run,memory_events:[...run.memory_events,{...event,recorded_at:new Date().toISOString()}]};
}

export function summarizeRun(run){
  if(!run)return {status:"invalid"};
  return {status:run.status,query:run.query,total_steps:run.steps.length,verified:run.steps.filter(s=>s.status==="verified").length,failed:run.steps.filter(s=>s.status==="failed").length,evidence_count:run.evidence.length,memory_events:run.memory_events.length,finished_at:run.finished_at};
}

export function canContinue(run){return Boolean(run&&run.status==="running"&&run.steps.some(s=>s.status==="planned"||s.status==="executed"));}
