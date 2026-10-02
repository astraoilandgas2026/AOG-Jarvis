const COST={zero:0,model:1};
export function toolProfile(tool={}){
 const external=["gmail","calendar","github"].includes(tool.module);
 return {
  execution:tool.permission==="write"?"WRITE":"READ",
  cost_tier:tool.module==="ai"?"model":"zero",
  latency_tier:tool.module==="ai"?"model":"fast",
  source:external?"connector":tool.functionName?"supabase":"local",
  deterministic:tool.module!=="ai"&&tool.module!=="conversation",
  fallback:tool.module==="ai"?"deterministic-or-provider-failover":null
 };
}
export function rankTools(tools=[]){
 return [...tools].map(t=>({...t,profile:toolProfile(t)})).sort((a,b)=>{
  const ac=COST[a.profile.cost_tier]??1,bc=COST[b.profile.cost_tier]??1;
  if(ac!==bc)return ac-bc;
  return (a.profile.latency_tier==="fast"?0:1)-(b.profile.latency_tier==="fast"?0:1);
 });
}
export function shouldUseModel({cacheHit=false,deterministicAvailable=false}={}){return !cacheHit&&!deterministicAvailable}
export const PERFORMANCE_RULE="CACHE → DATABASE → DETERMINISTIC TOOL → FREE MODEL → PAID MODEL";
