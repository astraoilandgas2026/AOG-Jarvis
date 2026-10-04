import { classifyIntent } from "./intent-router.js";
import { routeTask, buildExecutionBudget, shouldSkipLLM, ROUTER_VERSION } from "../../core/smart-router.js";

export function buildEmmaRuntime(query="",context={}){
  const intent=classifyIntent(query);
  const route=routeTask(query,{
    requiresEvidence:Boolean(context.requiresEvidence||intent.type==="research"||intent.tool==="astra.dd"||intent.tool==="document.intelligence"||intent.tool==="procurement.intelligence"),
    externalData:Boolean(context.externalData||intent.type==="research"),
    highRisk:Boolean(context.highRisk||intent.requiresConfirmation),
    toolRequired:Boolean(intent.tool),\n    deterministicTool:Boolean(intent.tool&&/^astra\\./.test(intent.tool)&&intent.type==="tool"),
    parallelizable:Boolean(context.parallelizable)
  });
  const budget=buildExecutionBudget(route);
  return Object.freeze({
    version:ROUTER_VERSION,
    intent,
    route,
    budget,
    skipLLM:shouldSkipLLM(route,{
      canResolveFromSourceOfTruth:Boolean(context.canResolveFromSourceOfTruth||/^astra\\./.test(intent.tool||"")),
      requiresGeneration:Boolean(context.requiresGeneration||intent.type==="conversation"||intent.type==="action")
    })
  });
}
