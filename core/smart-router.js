/**
 * Emma Smart Router
 * Isolated routing layer. No app wiring in milestone 1.
 */
const WORDS = {
  web: /\b(busca|buscar|investiga|investigar|verifica|verificar|fuente|fuentes|internet|web|actual|últim[oa]|latest|research)\b/i,
  evidence: /\b(evidencia|documento|documentos|certificado|certificates?|dd|due diligence|independiente|independently|físic[ao]|physically|verificado)\b/i,
  multiStep: /\b(compara|ranking|rankea|analiza|análisis|cruza|cross[- ]check|encuentra|find|lista|varios|multiple|varias)\b/i,
  execution: /\b(crea|crear|actualiza|actualizar|guarda|guardar|elimina|eliminar|envía|enviar|ejecuta|ejecutar|programa|programar|recordatorio|tarea|task|email|correo)\b/i,
  realtime: /\b(ahora|hoy|actualmente|en este momento|current|today|now)\b/i,
  simpleLookup: /\b(precio|proveedor|proveedores|producto|productos|contacto|email|teléfono|estado|status|cantidad|volumen)\b/i
};
const COST = Object.freeze({ fast: 1, standard: 2, deep: 4 });
const hit = (text, pattern) => pattern.test(text) ? 1 : 0;
const normalizeInput = input => String(input ?? "").trim().replace(/\s+/g, " ");

export function routeTask(input, context = {}) {
  const text = normalizeInput(input);
  if (!text) return { tier:"fast", reason:"empty_input", parallel:false, verification:"none", estimatedCostUnits:1, confidence:1 };

  const hasWeb=hit(text,WORDS.web), hasEvidence=hit(text,WORDS.evidence);
  const hasMultiStep=hit(text,WORDS.multiStep), hasExecution=hit(text,WORDS.execution), hasProcurementDeep=hit(text,WORDS.procurementDeep);
  const hasRealtime=hit(text,WORDS.realtime), hasSimpleLookup=hit(text,WORDS.simpleLookup);
  const needsVerification=context.requiresEvidence===true || context.externalData===true || context.highRisk===true;

  const deep = hasEvidence + hasMultiStep + (needsVerification ? 1 : 0) >= 2 ||
    (hasWeb && hasMultiStep) || (hasExecution && context.highRisk===true);
  const standard = !deep && (hasWeb || hasExecution || hasRealtime || context.toolRequired===true);
  let tier = deep ? "deep" : standard ? "standard" : "fast";

  if (hasEvidence || context.requiresEvidence===true) tier = tier==="fast" ? "standard" : tier;

  const verification = tier==="deep" ? "required" :
    tier==="standard" && (hasWeb || hasEvidence) ? "required" : "none";
  const parallel = tier==="deep" && (hasWeb || hasMultiStep || context.parallelizable===true);
  const reason = deep ? "multi_step_or_evidence" :
    standard ? "tool_or_external_data" : hasSimpleLookup ? "deterministic_lookup" : "simple_request";

  return {
    tier, reason, parallel, verification, estimatedCostUnits:COST[tier], confidence:0.9,
    policy:{
      maxIndependentCalls:tier==="fast" ? 1 : tier==="standard" ? 4 : 12,
      allowProviderFallback:tier!=="fast",
      requireEvidenceBeforeFinal:verification==="required"
    }
  };
}

export function shouldSkipLLM(route, task={}) {
  return route?.tier==="fast" && task.canResolveFromSourceOfTruth===true && task.requiresGeneration!==true;
}

export function buildExecutionBudget(route) {
  const tier=route?.tier ?? "standard";
  return Object.freeze({
    tier,
    maxIndependentCalls:route?.policy?.maxIndependentCalls ?? 4,
    estimatedCostUnits:COST[tier] ?? COST.standard,
    deadlineMs:tier==="fast" ? 2500 : tier==="standard" ? 8000 : 20000
  });
}

export const ROUTER_VERSION="emma-router-1.0.0";
