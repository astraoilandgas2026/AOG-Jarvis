const WRITE_TOOLS=new Set(["mail.send","gmail.send","calendar.create","memory.update","memory.deactivate","personal.task.create"]);
export function createExecutionContext({query="",intent=null,route=null,budget=null}={}){return{query,intent,route,budget,started_at:new Date().toISOString(),steps:[],status:"planned"}}
export function planExecution({query="",intent=null,tools=[],registry={}}={}){
 const ctx=createExecutionContext({query,intent});
 const ids=tools.length?tools:(intent?.tools||intent?.tool?[...(intent.tools||[intent.tool])]:[]);
 ctx.steps=ids.map(id=>{const t=registry[id];return{id,label:t?.label||id,permission:t?.permission||"read",available:Boolean(t?.functionName)||["gmail.read","gmail.send","calendar.read","calendar.create"].includes(id),requires_confirmation:Boolean(t?.permission==="write"||WRITE_TOOLS.has(id))}});
 ctx.parallel_groups=[ctx.steps.filter(s=>s.permission==="read").map(s=>s.id),ctx.steps.filter(s=>s.permission==="write").map(s=>s.id)].filter(g=>g.length);
 return ctx;
}
export function executionResult(ctx,{id,status="ok",data=null,error=null,source=null}={}){
 const step={id,status,source,at:new Date().toISOString(),data:error?undefined:data,error:error||undefined};
 return{...ctx,steps:[...(ctx.steps||[]).filter(x=>x.id!==id),step],status:error?"partial":"completed",finished_at:new Date().toISOString()};
}
export function canExecute(id,confirmed=false,registry={}){const t=registry?.[id];const write=Boolean(t?.permission==="write"||WRITE_TOOLS.has(id));return !write||confirmed}
export function isWriteTool(id,registry={}){const t=registry?.[id];return Boolean(t?.permission==="write"||WRITE_TOOLS.has(id))}
