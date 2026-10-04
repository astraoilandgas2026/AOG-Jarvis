import { buildExecutionBudget, routeTask, shouldSkipLLM } from "./smart-router.js";

const cases=[
  ["simple supplier lookup",routeTask("¿Cuál es el precio de Renovar?").tier,"fast"],
  ["web research",routeTask("Investiga Renovar y verifica fuentes").tier,"standard"],
  ["DD",routeTask("Busca y verifica capacidad, producto, exportación y compliance").tier,"deep"],
  ["high risk",routeTask("Confirma una oferta antes de pagar",{highRisk:true}).tier,"standard"],
  ["parallel research",routeTask("Encuentra y compara 5 proveedores",{parallelizable:true}).parallel,true]
];
for(const [name,actual,expected] of cases){
  if(actual!==expected) throw new Error(name+": expected "+expected+", got "+actual);
}
if(!shouldSkipLLM(routeTask("precio"),{canResolveFromSourceOfTruth:true})) throw new Error("fast lookup should skip LLM");
const budget=buildExecutionBudget(routeTask("Investiga y compara proveedores"));
if(budget.maxIndependentCalls<4) throw new Error("standard budget too small");
console.log("Emma Smart Router tests: PASS");
